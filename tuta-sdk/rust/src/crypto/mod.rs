#! [allow(dead_code)]
//! Contains implementations of cryptographic algorithms and their primitives
// TODO: Remove the above allowance when starting to implement higher level functions


mod aes;

#[cfg(test)]
pub use aes::Iv;
pub use aes::{Aes256Key, Aes128Key, AES_256_KEY_SIZE, AES_128_KEY_SIZE, IV_BYTE_SIZE};

mod sha;

pub use sha::{sha256, sha512};

mod hkdf;

pub use hkdf::hkdf;

mod argon2_id;
mod ecc;
mod kyber;
mod rsa;
mod tuta_crypt;

pub use tuta_crypt::PQKeyPairs;

pub mod key_encryption;
pub mod crypto_facade;
pub mod key;
pub mod randomizer_facade;
#[cfg(test)]
mod compatibility_test_utils;
