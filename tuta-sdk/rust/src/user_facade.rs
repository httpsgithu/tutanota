use std::borrow::ToOwned;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use crate::ApiCallError;
use crate::crypto::{Aes256Key, AES_256_KEY_SIZE};
use crate::crypto::hkdf;
use crate::crypto::sha256;
use crate::entities::sys::{GroupMembership, User};
use crate::key_cache::KeyCache;
use crate::crypto::key::GenericAesKey;
use crate::generated_id::GeneratedId;
use crate::key_loader_facade::VersionedAesKey;
use crate::util::Versioned;

pub trait AuthHeadersProvider {
    /// Gets the HTTP request headers used for authorizing REST requests
    fn create_auth_headers(&self, model_version: u32) -> HashMap<String, String>;
    fn is_fully_logged_in(&self) -> bool;
}

const USER_GROUP_KEY_DISTRIBUTION_KEY_INFO: &str = "userGroupKeyDistributionKey";

/// FIXME: for testing unencrypted entity downloading. Remove after everything works together.
#[derive(uniffi::Object)]
pub struct UserFacade {
    user: RwLock<Arc<User>>,
    key_cache: Arc<KeyCache>,
}

impl UserFacade {
    // FIXME: Do we pass in user or not
    pub fn new(key_cache: Arc<KeyCache>, user: User) -> Self {
        UserFacade {
            user: RwLock::new(Arc::new(user)),
            key_cache,
        }
    }

    pub fn set_user(&mut self, user: User) {
        *self.user.write().unwrap() = Arc::new(user);
    }

    pub fn unlock_user_group_key(&mut self, user_passphrase_key: GenericAesKey) -> Result<(), ApiCallError> {
        let user = self.get_user();
        let user_group_membership = &user.userGroup;
        let current_user_group_key = Versioned::new(
            user_passphrase_key.decrypt_aes_key(&user_group_membership.symEncGKey).map_err(|e| {
                ApiCallError::InternalSdkError { error_message: e.to_string() }
            })?,
            user_group_membership.groupKeyVersion,
        );
        self.key_cache.set_current_user_group_key(current_user_group_key);
        self.set_user_group_key_distribution_key(user_passphrase_key)
    }

    fn set_user_group_key_distribution_key(&mut self, user_passphrase_key: GenericAesKey) -> Result<(), ApiCallError> {
        let user = self.get_user();
        let user_group_membership = &user.userGroup;
        let user_group_key_distribution_key = self.derive_user_group_key_distribution_key(&user_group_membership.group, user_passphrase_key)?;
        match user_group_key_distribution_key {
            GenericAesKey::Aes128(_) => {
                Err(ApiCallError::InternalSdkError { error_message: "invalid derived key size".to_owned() })
            }
            GenericAesKey::Aes256(key) => {
                Ok(self.key_cache.set_user_group_key_distribution_key(key))
            }
        }
    }

    // FIXME: Check uint8ArrayToBase64 is correct;
    // there is a max length in the ts version, it seems to be a js thing, can we forego it here?
    fn derive_user_group_key_distribution_key(&self, user_group_id: &GeneratedId, user_passphrase_key: GenericAesKey) -> Result<GenericAesKey, ApiCallError> {
        // we prepare a key to encrypt potential user group key rotations with
        // when passwords are changed clients are logged-out of other sessions
        // this key is only needed by the logged-in clients, so it should be reliable enough to assume that userPassphraseKey is in sync
        let user_group_id_hash = sha256(user_group_id.as_str().as_bytes());
        // we bind this to userGroupId and the domain separator USER_GROUP_KEY_DISTRIBUTION_KEY_INFO
        // the hkdf salt does not have to be secret but should be unique per user and carry some additional entropy which sha256 ensures
        let aes_key =
            hkdf(user_group_id_hash.as_slice(),
                 BASE64_STANDARD.encode(user_passphrase_key.as_bytes()).as_bytes(),
                 USER_GROUP_KEY_DISTRIBUTION_KEY_INFO.as_bytes(), AES_256_KEY_SIZE);
        return match aes_key.len() {
            AES_256_KEY_SIZE => {
                Ok(GenericAesKey::Aes256(Aes256Key::from_bytes(aes_key.as_slice()).expect("invalid derived key size")))
            }
            _ => {
                Err(ApiCallError::InternalSdkError { error_message: "invalid derived key size".to_owned() })
            }
        };
    }


    pub async fn update_user(&self, user: User) {
        let user = Arc::new(user);
        *self.user.write().unwrap() = user.clone();
        self.key_cache.remove_outdated_group_keys(user.as_ref()).await;
    }

    pub fn get_user(&self) -> Arc<User> {
        self.user.read().unwrap().clone()
    }

    pub fn get_user_group_id(&self) -> GeneratedId {
        self.get_user().userGroup.group.clone()
    }

    #[allow(dead_code)] // Remove when implementing `generateUserAreaGroupData()`
    fn get_all_group_ids(&self) -> Vec<GeneratedId> {
        let mut groups: Vec<GeneratedId> = self.get_user().memberships.iter().map(|membership| membership.group.clone()).collect();
        groups.push(self.get_user().userGroup.group.clone());
        groups
    }

    pub fn get_current_user_group_key(&self) -> Option<VersionedAesKey> {
        self.key_cache.get_current_user_group_key()
    }

    pub(crate) fn get_membership(&self, group_id: &GeneratedId) -> Result<GroupMembership, ApiCallError> {
        let memberships = &self.get_user().memberships;
        memberships.iter().find(|g| g.group == *group_id)
            .map(|m| m.to_owned())
            .ok_or_else(|| ApiCallError::InternalSdkError { error_message: format!("No group with groupId {} found!", group_id) })
    }
}

// TODO: Remove allowance after implementing
#[allow(unused_variables)]
impl AuthHeadersProvider for UserFacade {
    fn create_auth_headers(&self, model_version: u32) -> HashMap<String, String> {
        todo!()
    }

    fn is_fully_logged_in(&self) -> bool {
        todo!()
    }
}

#[cfg(test)]
mockall::mock!(
    pub UserFacade {
        pub fn set_user(&mut self, user: User);
        pub fn unlock_user_group_key(&mut self, user_passphrase_key: GenericAesKey)
            -> Result<(), ApiCallError>;
        pub async fn update_user(&self, user: User);
        pub fn get_user(&self) -> Arc<User>;
        pub fn get_user_group_id(&self) -> GeneratedId;
        pub fn get_current_user_group_key(&self) -> Option<VersionedAesKey>;
        pub(crate) fn get_membership(&self, group_id: &GeneratedId)
        -> Result<GroupMembership, ApiCallError>;
    }
    impl AuthHeadersProvider for UserFacade {
        fn create_auth_headers(&self, model_version: u32) -> HashMap<String, String>;
        fn is_fully_logged_in(&self) -> bool;
    }
);