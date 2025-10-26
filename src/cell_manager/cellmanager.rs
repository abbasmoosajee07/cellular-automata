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

    /// Dynamically switches implementation based on size thresholds
    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let use_chunked = new_width > self.threshold || new_height > self.threshold;

        // Extract all current cells
        let old_cells = self.inner.for_each_cell();

        // Rebuild correct backend
        self.inner = if use_chunked {
            let mut cm = ChunkedCellManager::new(256, new_depth);
            for chunk in old_cells.chunks(4) {
                cm.set_cell(chunk[0], chunk[1], chunk[2], chunk[3] as u32);
            }
            Box::new(cm)
        } else {
            let mut fm = FlatCellManager::new(new_width + 2, new_height + 2, new_depth);
            for chunk in old_cells.chunks(4) {
                fm.set_cell(chunk[0], chunk[1], chunk[2], chunk[3] as u32);
            }
            Box::new(fm)
        };

        self.width = new_width;
        self.height = new_height;
        self.depth = new_depth;
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
        for s in min_s..max_s {
            for q in min_q-1..=(max_q +1) {
                self.set_cell(q, min_r - 1, s, BOUNDARY);
                self.set_cell(q, max_r + 1, s, BOUNDARY);
            }
            for r in min_r-1..=(max_r+1) {
                self.set_cell(min_q - 1, r, s, BOUNDARY);
                self.set_cell(max_q + 1, r, s, BOUNDARY);
            }
        }
    }

    pub fn random_cells(&mut self) {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.get_bounds();

        for s in min_s..max_s {
        for q in min_q..=max_q {
        for r in min_r..=max_r {
            let density: f32 = 0.42; // 42% alive
            let status: u32 = if fastrand::f32() < density { 1 } else { 0 };
            self.set_cell(q, r, s, status);
        }}};
    }

    pub fn floodfill(&mut self) {
        let arr = self.for_each_cell();
        let mut neighbors_to_activate = Vec::new();

        // Step 1: Collect neighbors of all alive cells
        let mut i = 0;
        while i + 3 < arr.len() {
            let q = arr[i];
            let r = arr[i + 1];
            let s = arr[i + 2];
            let state = arr[i + 3];

            if state == 1 {
                let nb_cells = self.get_neighbors(q, r, s);
                let mut j = 0;
                while j + 2 < nb_cells.len() {
                    neighbors_to_activate.push((nb_cells[j], nb_cells[j + 1], nb_cells[j + 2]));
                    j += 3;
                }
            }

            i += 4;
        }

        // Step 2: Activate all neighbor cells
        for (nq, nr, ns) in neighbors_to_activate {
            self.set_cell(nq, nr, ns, 1);
        }

    }

}
