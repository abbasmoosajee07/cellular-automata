// src/lib.rs

pub mod core;

// Include wasm interface only when compiling for wasm32
#[cfg(target_arch = "wasm32")]
pub mod wasm_interface;

// Include native interface for normal Rust builds
#[cfg(not(target_arch = "wasm32"))]
pub mod native_interface;

// Always re-export core
pub use core::*;

// Re-export wasm interface (so wasm-bindgen can see it)
#[cfg(target_arch = "wasm32")]
pub use wasm_interface::*;
