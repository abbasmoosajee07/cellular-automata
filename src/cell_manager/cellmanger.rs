// use std::collections::HashMap;
use crate::cell_manager::{
    flat_cells::FlatCellManager, chunk_cells::ChunkedCellManager
};

use fastrand;

/// Enum wrapper used by CellManager to switch between implementations
enum Impl {
    Flat(FlatCellManager),
    Chunked(ChunkedCellManager),
}


pub struct CellManager {
    inner: Impl,
    threshold: usize,
}


impl CellManager {
    /// width/height/depth: cells; chunk_size only used if chunked path used

    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> CellManager {
        let threshold = 2500usize;
        let use_chunked = width > threshold || height > threshold;
        let inner = if use_chunked {
            let cs = chunk_size.unwrap_or(256);
            Impl::Chunked(ChunkedCellManager::new(cs, depth))
        } else {
            Impl::Flat(FlatCellManager::new(width + 2, height + 2, depth))
        };
        CellManager {
            inner,
            threshold,
        }
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        match &mut self.inner {
            Impl::Flat(f) => f.set_cell(q, r, s, value),
            Impl::Chunked(c) => c.set_cell(q, r, s, value),
        }
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        match &self.inner {
            Impl::Flat(f) => f.get_cell(q, r, s),
            Impl::Chunked(c) => c.get_cell(q, r, s),
        }
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        match &self.inner {
            Impl::Flat(f) => f.count_live_neighbors(q, r, s),
            Impl::Chunked(c) => c.count_live_neighbors(q, r, s),
        }
    }

    pub fn clear(&mut self) {
        match &mut self.inner {
            Impl::Flat(f) => f.clear(),
            Impl::Chunked(c) => c.clear(),
        }
    }

    /// returns Int32Array: [q,r,s,value, ...]
    pub fn for_each_cell(&self) -> Vec<i32> {
        match &self.inner {
            Impl::Flat(f) => f.for_each_cell(),
            Impl::Chunked(c) => c.for_each_cell(),
        }
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        match &self.inner {
            Impl::Flat(f) => f.get_neighbors(q, r, s),
            Impl::Chunked(c) => c.get_neighbors(q, r, s),
        }
    }

    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let use_chunked = new_width > self.threshold || new_height > self.threshold;
        match (&mut self.inner, use_chunked) {
            (Impl::Flat(_), true) => {
                // convert to chunked
                let new_impl = ChunkedCellManager::new(256, new_depth);
                // copy existing data (from flat)
                if let Impl::Flat(f) = std::mem::replace(&mut self.inner, Impl::Chunked(new_impl)) {
                    // temporary rebind: f contains old data; we need to copy into new chunked manager
                    if let Impl::Chunked(ref mut cm) = self.inner {
                        let cells = f.for_each_cell();
                        // cells is [q,r,s,val,...]
                        let mut i = 0;
                        while i + 3 < cells.len() {
                            let q = cells[i];
                            let r = cells[i + 1];
                            let s = cells[i + 2];
                            let val = cells[i + 3] as u32;
                            cm.set_cell(q, r, s, val);
                            i += 4;
                        }
                    }
                }
            }
            (Impl::Chunked(_), false) => {
                // convert to flat
                let new_width = new_width + 2;
                let new_height = new_height + 2;
                let new_flat = FlatCellManager::new(new_width, new_height, new_depth);
                if let Impl::Chunked(c) = std::mem::replace(&mut self.inner, Impl::Flat(new_flat)) {
                    if let Impl::Flat(ref mut f) = self.inner {
                        let cells = c.for_each_cell();
                        let mut i = 0;
                        while i + 3 < cells.len() {
                            let q = cells[i];
                            let r = cells[i + 1];
                            let s = cells[i + 2];
                            let val = cells[i + 3] as u32;
                            f.set_cell(q, r, s, val);
                            i += 4;
                        }
                    }
                }
            }
            (Impl::Flat(f), false) => {
                f.resize(new_width + 2, new_height + 2, new_depth);
            }
            (Impl::Chunked(c), true) => {
                c.resize(new_width + 2, new_height + 2, new_depth);
            }
        }
    }

    pub fn get_bounds(&self) -> (i32, i32, i32, i32, i32, i32) {
        let cols = 100;
        let rows = 100;

        let min_q = -(cols / 2);
        let max_q = (cols - 1) / 2;
        let min_r = -(rows / 2);
        let max_r = (rows - 1) / 2;
        let min_s = 0;
        let max_s = 1;

        (min_q, max_q, min_r, max_r, min_s, max_s)
    }

    pub fn random_cells(&mut self) {
        let (min_q, max_q, min_r, max_r) = (-10, 9, -10, 9);

        for q in min_q..=max_q {
            for r in min_r..=max_r {
                let status: u32 = if fastrand::bool() { 1 } else { 0 };
                let s: i32 = 0;
                if status == 1 {
                    self.set_cell(q, r, s, status);
                }
            }
        }
    }

}
