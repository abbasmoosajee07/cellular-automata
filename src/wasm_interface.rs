use wasm_bindgen::prelude::*;
use crate::Engine;

#[wasm_bindgen]
pub struct WasmInterface {
    // inner: GridMesh,
    engine: Engine,
}

#[wasm_bindgen]
impl WasmInterface {
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> WasmInterface {
        WasmInterface {
            engine: Engine::new(width, height, depth, chunk_size),
        }
    }

    #[wasm_bindgen]
    pub fn from_pattern(pattern_props: &str, pattern_data: &str) -> WasmInterface {
        WasmInterface {
            engine: Engine::new_with_pattern(pattern_props, pattern_data),
        }
    }

    pub fn update_preview(&mut self) -> String {
        self.engine.update_storage();
        self.engine.pattern_text()
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        self.engine.mesh.set_cell(q, r, s, value);
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.engine.mesh.get_cell(q, r, s)
    }

    pub fn clear(&mut self) {
        self.engine.mesh.clear();
    }

    pub fn count_live_cells(&self) -> i32 {
        self.engine.mesh.count_live_cells()
    }

    pub fn each_live_cell(&self) -> Vec<i32> {
        self.engine.mesh.each_live_cell()
    }

    pub fn random_cells(&mut self) {
        self.engine.mesh.random_cells();
    }

    pub fn resize(&mut self, w: usize, h: usize, d: usize) {
        self.engine.mesh.resize(w, h, d);
    }

    #[wasm_bindgen]
    pub fn change_grid_properties(&mut self, shape: String, neighbor_type: String, range: i32, topology_type: String) {
        self.engine.mesh.change_grid_properties(shape, neighbor_type, range, topology_type);
    }

    pub fn get_bounds(&self) -> Vec<i32> {
        self.engine.mesh.config.bounds.to_vec()
    }

    pub fn get_cell_extremes(&self) -> Vec<i32> {
        self.engine.mesh.get_cell_extremes().to_vec()
    }

    pub fn floodfill(&mut self) {
        self.engine.mesh.floodfill();
    }

    pub fn step_game_of_life(&mut self) {
        self.engine.step_game_of_life();
    }

    #[wasm_bindgen]
    pub fn config_string(&self) -> String {
        serde_json::to_string(&self.engine.mesh.config).unwrap()
    }
}
