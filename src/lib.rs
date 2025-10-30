// src/lib.rs

pub mod cell_manager {
    pub mod flat_cells;
    pub mod chunk_cells;
    pub mod cell_backend;
    pub mod neighbourhood;
    pub mod cellmanager;
    
    // Re-export the main types at the module level
    pub use cell_backend::CellBackend;
    pub use chunk_cells::ChunkedCellManager;
    pub use flat_cells::FlatCellManager;
    pub use neighbourhood::Neighborhood;
    
    // Main cell manager is the primary export
}

pub use cell_manager::cellmanager::CellManager;
// Main CellManager stays at crate root for easy access
// Include wasm interface only when compiling for wasm32
#[cfg(target_arch = "wasm32")]
pub mod wasm_interface;

// Include native interface for normal Rust builds
#[cfg(not(target_arch = "wasm32"))]
pub mod native_interface;



// Re-export wasm interface (so wasm-bindgen can see it)
#[cfg(target_arch = "wasm32")]
pub use wasm_interface::*;
