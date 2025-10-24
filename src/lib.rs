// src/lib.rs

pub mod cell_manager{
    pub mod cellmanger;
    pub mod flat_cells;
    pub mod chunk_cells;
}

// Include wasm interface only when compiling for wasm32
#[cfg(target_arch = "wasm32")]
pub mod wasm_interface;

// Include native interface for normal Rust builds
#[cfg(not(target_arch = "wasm32"))]
pub mod native_interface;



// Re-export wasm interface (so wasm-bindgen can see it)
#[cfg(target_arch = "wasm32")]
pub use wasm_interface::*;
