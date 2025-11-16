use wasm_bindgen::prelude::*;
use crate::CellManager;

#[wasm_bindgen]
pub struct WasmCellManager {
    inner: CellManager,
}

#[wasm_bindgen]
impl WasmCellManager {
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> WasmCellManager {
        WasmCellManager {
            inner: CellManager::new(width, height, depth, chunk_size),
        }
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        self.inner.set_cell(q, r, s, value);
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.inner.get_cell(q, r, s)
    }

    pub fn clear(&mut self) {
        self.inner.clear();
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        self.inner.count_live_neighbors(q, r, s)
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        self.inner.get_neighbors(q, r, s)
    }

    pub fn for_each_cell(&self) -> Vec<i32> {
        self.inner.for_each_cell()
    }

    pub fn random_cells(&mut self) {
        self.inner.random_cells();
    }

    pub fn resize(&mut self, w: usize, h: usize, d: usize) {
        self.inner.resize(w, h, d);
    }

    #[wasm_bindgen]
    pub fn change_grid_properties(&mut self, shape: String, neighbor_type: String, range: i32, topology_type: String) {
        self.inner.change_grid_properties(shape, neighbor_type, range, topology_type);
    }

    pub fn get_bounds(&self) -> Vec<i32> {
        self.inner.get_bounds().to_vec()
    }

    pub fn floodfill(&mut self) {
        self.inner.floodfill();
    }

}
