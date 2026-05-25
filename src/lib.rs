
// =========================
// Cell System
// =========================
pub mod tiles {
    pub mod tile_manager;
    pub mod square;
    pub mod hexagon;
    pub mod triangle;
    pub mod rhomboid;

    pub use tile_manager::TileManager;
    pub use square::Square;
    pub use hexagon::Hexagon;
    pub use triangle::Triangle;
    pub use rhomboid::Rhomboidal;
}
pub mod cell_manager {
    pub mod flat_cells;
    pub mod chunk_cells;
    pub mod cell_backend;
    pub mod topology;
    pub mod gridmesh;

    pub use cell_backend::CellBackend;
    pub use chunk_cells::ChunkedCellManager;
    pub use flat_cells::FlatCellManager;
    pub use topology::Topology;
    pub use gridmesh::GridMesh;
}
pub use cell_manager::gridmesh::GridMesh;
// Automata
pub mod automata {
    mod automata;
    mod conway_life;
    mod floodfill;

    pub use automata::Automata;
    pub use conway_life::ConwayLife;
    pub use floodfill::FloodFill;
}

// Core Engine
pub mod engine;
pub use engine::Engine;

// File Manager
pub mod formats {
    pub mod pattern_io;
    pub mod formats;
    pub mod plaintext;
    pub mod run_length_encode;

    pub use formats::PatternConfig;
    pub use plaintext::Plaintext;
    pub use run_length_encode::RunLengthEncoder;
    pub use pattern_io::PatternIO;
}

pub use formats::pattern_io::PatternIO;

pub mod stopwatch;
pub use stopwatch::Stopwatch;

// Include native interface for normal Rust builds
#[cfg(not(target_arch = "wasm32"))]
pub mod native_interface;

// Include wasm interface only when compiling for wasm32
#[cfg(target_arch = "wasm32")]
pub mod wasm_interface;

// Re-export wasm interface (so wasm-bindgen can see it)
#[cfg(target_arch = "wasm32")]
pub use wasm_interface::*;
