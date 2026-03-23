use wasm_bindgen::prelude::*;
use crate::Engine;

#[wasm_bindgen]
pub struct WasmInterface {
    engine: Engine,
}

#[wasm_bindgen]
impl WasmInterface {
    #[wasm_bindgen(constructor)]
    pub fn new(shape: String, width: usize, height: usize) -> WasmInterface {
        WasmInterface {
            engine: Engine::new(shape, width, height),
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
        self.engine.set_cell(q, r, s, value);
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.engine.mesh.inner.get_cell(q, r, s)
    }

    pub fn clear(&mut self) {
        self.engine.clear();
    }

    pub fn count_live_cells(&self) -> i32 {
        self.engine.count_live_cells()
    }

    pub fn each_live_cell(&self) -> Vec<i32> {
        self.engine.mesh.inner.each_live_cell()
    }

    pub fn resize(&mut self, w: usize, h: usize) {
        self.engine.mesh.resize(w, h);
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

    pub fn random_cells(&mut self) -> String {
        self.engine.random_cells();
        self.automata_string()
    }

    pub fn step_game_of_life(&mut self) -> String {
        self.engine.step_game_of_life();
        self.automata_string()
    }

    pub fn floodfill(&mut self) -> String {
        self.engine.floodfill();
        self.automata_string()
    }

    pub fn change_format(&mut self, new_format: &str) {
        self.engine.storage.format = new_format.to_string();
    }

    #[wasm_bindgen]
    pub fn config_string(&self) -> String {
        serde_json::to_string(&self.engine.mesh.config).unwrap()
    }

    pub fn storage_string(&self) -> String {
        serde_json::to_string(&self.engine.storage).unwrap()
    }

    pub fn automata_string(&self) -> String {
        serde_json::to_string(&self.engine.automata).unwrap()
    }

    pub fn get_depth(&self) -> usize {
        self.engine.mesh.inner.get_depth()
    }

    pub fn get_chunk_size(&self) -> usize {
        self.engine.mesh.inner.get_chunk_size()
    }

    pub fn get_chunk_keys(&self) -> Result<Vec<i32>, JsValue> {
        self.engine.mesh.inner.get_chunk_keys()
            .map_err(|e| JsValue::from_str(&e))
    }

    pub fn get_chunk_cells(&self, cx: i32, cy: i32, cz: i32) -> Result<Vec<u32>, JsValue> {
        self.engine.mesh.inner.get_chunk_cells(cx, cy, cz)
            .map_err(|e| JsValue::from_str(&e))
    }
}
