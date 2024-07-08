#![allow(non_snake_case, unused_imports)]
use super::*;
use serde::{Serialize, Deserialize};
use crate::entities::entity_facade::Errors;

#[derive(uniffi::Record, Clone, Serialize, Deserialize, Debug)]
pub struct PersistenceResourcePostReturn {
	pub _format: i64,
	pub generatedId: Option<GeneratedId>,
	pub permissionListId: GeneratedId,
}

impl Entity for PersistenceResourcePostReturn {
	fn type_ref() -> TypeRef {
		TypeRef { app: "base", type_: "PersistenceResourcePostReturn" }
	}
}
