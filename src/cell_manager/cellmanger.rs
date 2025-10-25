use crate::cell_manager::{flat_cells::FlatCellManager, chunk_cells::ChunkedCellManager};
use fastrand;

/// Common interface for any cell manager implementation
pub trait CellOps {
    fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32);
    fn get_cell(&self, q: i32, r: i32, s: i32) -> u32;
    fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32;
    fn clear(&mut self);
    fn for_each_cell(&self) -> Vec<i32>;
    fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32>;
    fn resize(&mut self, width: usize, height: usize, depth: usize);
}

/// Implement the shared trait for both manager types
impl CellOps for FlatCellManager {
    fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) { self.set_cell(q, r, s, value); }
    fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 { self.get_cell(q, r, s) }
    fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 { self.count_live_neighbors(q, r, s) }
    fn clear(&mut self) { self.clear(); }
    fn for_each_cell(&self) -> Vec<i32> { self.for_each_cell() }
    fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> { self.get_neighbors(q, r, s) }
    fn resize(&mut self, width: usize, height: usize, depth: usize) {
        self.resize(width, height, depth);
    }
}

impl CellOps for ChunkedCellManager {
    fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) { self.set_cell(q, r, s, value); }
    fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 { self.get_cell(q, r, s) }
    fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 { self.count_live_neighbors(q, r, s) }
    fn clear(&mut self) { self.clear(); }
    fn for_each_cell(&self) -> Vec<i32> { self.for_each_cell() }
    fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> { self.get_neighbors(q, r, s) }
    fn resize(&mut self, width: usize, height: usize, depth: usize) {
        self.resize(width, height, depth);
    }
}

pub struct CellManager {
    width: usize,
    height: usize,
    depth: usize,
    inner: Box<dyn CellOps>,  // dynamic backend
    threshold: usize,
}

impl CellManager {
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> Self {
        let threshold: usize = 2500usize;
        let use_chunked: bool = width > threshold || height > threshold;

        let inner: Box<dyn CellOps> = if use_chunked {
            let cs = chunk_size.unwrap_or(256);
            Box::new(ChunkedCellManager::new(cs, depth))
        } else {
            Box::new(FlatCellManager::new(width + 2, height + 2, depth))
        };

        Self { width, height, depth, inner, threshold }
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        self.inner.set_cell(q, r, s, value);
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.inner.get_cell(q, r, s)
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        self.inner.count_live_neighbors(q, r, s)
    }

    pub fn clear(&mut self) {
        self.inner.clear();
    }

    pub fn for_each_cell(&self) -> Vec<i32> {
        self.inner.for_each_cell()
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        self.inner.get_neighbors(q, r, s)
    }

    pub fn resize(&mut self, width: usize, height: usize, depth: usize) {
        self.inner.resize(width, height, depth);
        self.threshold = 2000;
        self.width = width;
        self.height = height;
        self.depth = depth;
    }

    pub fn get_bounds(&self) -> [i32; 6] {
        let cols = self.width as i32;
        let rows = self.height as i32;
        let states = self.depth as i32;

        let min_q = -(cols / 2);
        let max_q = (cols - 1) / 2;
        let min_r = -(rows / 2);
        let max_r = (rows - 1) / 2;
        let min_s = 0;
        let max_s = states;

        [min_q, max_q, min_r, max_r, min_s, max_s]
    }

    pub fn create_boundary(&mut self) {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.get_bounds();

        static BOUNDARY: u32 = 255 as u32;
        static L: i32 = 1;
        for s in min_s..max_s {
            for q in min_q-1..=(max_q +1) {
                self.set_cell(q, min_r - L, s, BOUNDARY);
                self.set_cell(q, max_r + L, s, BOUNDARY);
            }
            for r in min_r-1..=(max_r+1) {
                self.set_cell(min_q - L, r, s, BOUNDARY);
                self.set_cell(max_q + L, r, s, BOUNDARY);
            }
        }
    }


    pub fn random_cells(&mut self) {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.get_bounds();

        for s in min_s..=max_s {
            for q in min_q..=max_q {
                for r in min_r..=max_r {
                    let density: f32 = 0.35; // 20% alive
                    let status: u32 = if fastrand::f32() < density { 1 } else { 0 };
                    if status == 1 {
                        self.set_cell(q, r, s, status);
                    }
                }
            }
        }
    }
}
