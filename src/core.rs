use std::collections::HashMap;


pub struct FlatCellManager {
    width: usize,
    height: usize,
    depth: usize,
    origin: (i32, i32, i32),
    cells: Vec<u32>,
    adj_neighbors: Vec<(i32, i32, i32)>,
}

impl FlatCellManager {
    fn index_internal(&self, q: i32, r: i32, s: i32) -> Option<usize> {
        let q = q + self.origin.0;
        let r = r + self.origin.1;
        let s = s + self.origin.2;

        if q < 0 || r < 0 || s < 0 {
            return None;
        }

        let q = q as usize;
        let r = r as usize;
        let s = s as usize;

        if q >= self.width || r >= self.height || s >= self.depth {
            return None;
        }

        Some(q + r * self.width + s * self.width * self.height)
    }
}


impl FlatCellManager {
    
    pub fn new(width: usize, height: usize, depth: usize) -> FlatCellManager {
        let origin = (
            (width as i32) / 2,
            (height as i32) / 2,
            (depth as i32) / 2,
        );
        FlatCellManager {
            width,
            height,
            depth,
            origin,
            cells: vec![0u32; width * height * depth],
            adj_neighbors: vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
                (0, 0, -1), (0, 0, 1),
            ],
        }
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        if let Some(idx) = self.index_internal(q, r, s) {
            self.cells[idx] = value;
        }
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.index_internal(q, r, s).map(|i| self.cells[i]).unwrap_or(0)
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        let mut count = 0;
        for &(dq, dr, ds) in &self.adj_neighbors {
            count += self.get_cell(q + dq, r + dr, s + ds);
        }
        count
    }

    pub fn clear(&mut self) {
        self.cells.fill(0);
    }

    pub fn for_each_cell(&self) -> Vec<i32> {
        let mut out = Vec::new();
        for s in 0..self.depth {
            for r in 0..self.height {
                for q in 0..self.width {
                    let idx = q + r * self.width + s * self.width * self.height;
                    let val = self.cells[idx];
                    if val != 0 {
                        out.push(q as i32 - self.origin.0);
                        out.push(r as i32 - self.origin.1);
                        out.push(s as i32 - self.origin.2);
                        out.push(val as i32);
                    }
                }
            }
        }
        out
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        let mut out = Vec::new();
        for &(dq, dr, ds) in &self.adj_neighbors {
            out.push(q + dq);
            out.push(r + dr);
            out.push(s + ds);
        }
        out
    }

    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let new_origin = (
            (new_width as i32) / 2,
            (new_height as i32) / 2,
            (new_depth as i32) / 2,
        );

        let mut new_cells = vec![0u32; new_width * new_height * new_depth];
        for s in 0..self.depth.min(new_depth) {
            for r in 0..self.height.min(new_height) {
                for q in 0..self.width.min(new_width) {
                    let old_idx = q + r * self.width + s * self.width * self.height;
                    let new_idx = q + r * new_width + s * new_width * new_height;
                    new_cells[new_idx] = self.cells[old_idx];
                }
            }
        }

        self.width = new_width;
        self.height = new_height;
        self.depth = new_depth;
        self.origin = new_origin;
        self.cells = new_cells;
    }
}

// =========================================================
// CHUNKED MANAGER (no wrapping, no modulo math)
// =========================================================


pub struct ChunkedCellManager {
    chunk_size: usize,
    depth: usize,
    chunks: HashMap<(i32, i32, i32), Vec<u32>>,
    adj_neighbors: Vec<(i32, i32, i32)>,
}

fn local_index(chunk_size: usize, lx: usize, ly: usize, lz: usize) -> usize {
    lx + ly * chunk_size + lz * chunk_size * chunk_size
}


impl ChunkedCellManager {
    
    pub fn new(chunk_size: usize, depth: usize) -> ChunkedCellManager {
        ChunkedCellManager {
            chunk_size,
            depth,
            chunks: HashMap::new(),
            adj_neighbors: vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
                (0, 0, -1), (0, 0, 1),
            ],
        }
    }

    fn get_chunk_mut(&mut self, cx: i32, cy: i32, cz: i32) -> &mut Vec<u32> {
        self.chunks
            .entry((cx, cy, cz))
            .or_insert_with(|| vec![0; self.chunk_size * self.chunk_size * self.depth])
    }

    fn get_chunk(&self, cx: i32, cy: i32, cz: i32) -> Option<&Vec<u32>> {
        self.chunks.get(&(cx, cy, cz))
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        if q < 0 || r < 0 || s < 0 {
            return;
        }
        let cx = q / self.chunk_size as i32;
        let cy = r / self.chunk_size as i32;
        let cz = s / self.depth as i32;
        let lx = (q % self.chunk_size as i32) as usize;
        let ly = (r % self.chunk_size as i32) as usize;
        let lz = (s % self.depth as i32) as usize;
        let idx = local_index(self.chunk_size, lx, ly, lz);
        self.get_chunk_mut(cx, cy, cz)[idx] = value;
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        if q < 0 || r < 0 || s < 0 {
            return 0;
        }
        let cx = q / self.chunk_size as i32;
        let cy = r / self.chunk_size as i32;
        let cz = s / self.depth as i32;
        if let Some(chunk) = self.get_chunk(cx, cy, cz) {
            let lx = (q % self.chunk_size as i32) as usize;
            let ly = (r % self.chunk_size as i32) as usize;
            let lz = (s % self.depth as i32) as usize;
            chunk[local_index(self.chunk_size, lx, ly, lz)]
        } else {
            0
        }
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        let mut count = 0;
        for &(dq, dr, ds) in &self.adj_neighbors {
            count += self.get_cell(q + dq, r + dr, s + ds);
        }
        count
    }

    pub fn clear(&mut self) {
        self.chunks.clear();
    }

    pub fn for_each_cell(&self) -> Vec<i32> {
        let mut out = Vec::new();
        for (&(cx, cy, cz), chunk) in &self.chunks {
            for lz in 0..self.depth {
                for ly in 0..self.chunk_size {
                    for lx in 0..self.chunk_size {
                        let idx = local_index(self.chunk_size, lx, ly, lz);
                        let val = chunk[idx];
                        if val != 0 {
                            out.push(cx * self.chunk_size as i32 + lx as i32);
                            out.push(cy * self.chunk_size as i32 + ly as i32);
                            out.push(cz * self.depth as i32 + lz as i32);
                            out.push(val as i32);
                        }
                    }
                }
            }
        }
        out
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        let mut out = Vec::new();
        for &(dq, dr, ds) in &self.adj_neighbors {
            out.push(q + dq);
            out.push(r + dr);
            out.push(s + ds);
        }
        out
    }

    pub fn resize(&mut self, _new_width: usize, _new_height: usize, new_depth: usize) {
        self.depth = new_depth;
    }
}

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
}
