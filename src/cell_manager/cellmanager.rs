use crate::cell_manager::{
    CellBackend, FlatCellManager, ChunkedCellManager, Neighborhood
};
use fastrand;

pub struct CellManager {
    width: usize,
    height: usize,
    depth: usize,
    threshold: usize,
    inner: CellBackend,
    neighbor_manager: Neighborhood,
}

impl CellManager {
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> Self {
        let threshold = 2500;
        let use_chunked = width > threshold || height > threshold;

        let inner = if use_chunked {
            let cs = chunk_size.unwrap_or(256);
            CellBackend::Chunked(ChunkedCellManager::new(cs, depth))
        } else {
            CellBackend::Flat(FlatCellManager::new(width + 2, height + 2, depth))
        };

        // Default neighbors
        let neighbor_manager = Neighborhood::new("hexagon");

        Self {
            width,
            height,
            depth,
            threshold,
            inner,
            neighbor_manager,
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

    pub fn for_each_cell(&self) -> Vec<i32> {
        self.inner.for_each_cell()
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        self.neighbor_manager.get_neighbors(q, r, s)
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        let mut count = 0;
        for &(dq, dr, ds) in self.neighbor_manager.get_neighbor_offsets() {
            count += self.get_cell(q + dq, r + dr, s + ds);
        }
        count
    }

    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let use_chunked = new_width > self.threshold || new_height > self.threshold;

        let old_cells = self.inner.for_each_cell();

        self.inner = if use_chunked {
            let mut cm = ChunkedCellManager::new(256, new_depth);
            for chunk in old_cells.chunks(4) {
                if chunk.len() == 4 {
                    cm.set_cell(chunk[0], chunk[1], chunk[2], chunk[3] as u32);
                }
            }
            CellBackend::Chunked(cm)
        } else {
            let mut fm = FlatCellManager::new(new_width + 2, new_height + 2, new_depth);
            for chunk in old_cells.chunks(4) {
                if chunk.len() == 4 {
                    fm.set_cell(chunk[0], chunk[1], chunk[2], chunk[3] as u32);
                }
            }
            CellBackend::Flat(fm)
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
        let max_s = states - 1; // Fixed: should be states - 1 for inclusive range

        [min_q, max_q, min_r, max_r, min_s, max_s]
    }

    pub fn create_boundary(&mut self) {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.get_bounds();

        const BOUNDARY: u32 = 255;
        for s in min_s..=max_s {
            for q in min_q - 1..=(max_q + 1) {
                self.set_cell(q, min_r - 1, s, BOUNDARY);
                self.set_cell(q, max_r + 1, s, BOUNDARY);
            }
            for r in min_r - 1..=(max_r + 1) {
                self.set_cell(min_q - 1, r, s, BOUNDARY);
                self.set_cell(max_q + 1, r, s, BOUNDARY);
            }
        }
    }

    pub fn random_cells(&mut self) {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.get_bounds();
        let density: f32 = 0.42;

        for s in min_s..=max_s {
            for q in min_q..=max_q {
                for r in min_r..=max_r {
                    let status = if fastrand::f32() < density { 1 } else { 0 };
                    self.set_cell(q, r, s, status);
                }
            }
        }
    }

    pub fn floodfill(&mut self) {
        let arr = self.for_each_cell();
        let mut neighbors_to_activate = Vec::new();

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

        for (nq, nr, ns) in neighbors_to_activate {
            self.set_cell(nq, nr, ns, 1);
        }
    }

    pub fn switch_neighbors(&mut self, shape: String) {
        self.neighbor_manager.switch_neighbors(&shape);
    }

}