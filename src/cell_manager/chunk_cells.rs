use std::collections::HashMap;

pub struct ChunkedCellManager {
    chunk_size: usize,
    depth: usize,
    chunks: HashMap<(i32, i32, i32), Vec<u32>>,
}

fn local_index(chunk_size: usize, lx: usize, ly: usize, lz: usize) -> usize {
    lx + ly * chunk_size + lz * chunk_size * chunk_size
}

fn prev_power_of_two(n: usize) -> usize {
    if n == 0 { return 1; }
    1 << (usize::BITS - n.leading_zeros() - 1) as usize
}

impl ChunkedCellManager {
    pub fn new(chunk_size: usize, depth: usize) -> ChunkedCellManager {
        ChunkedCellManager {
            chunk_size,
            depth,
            chunks: HashMap::new(),
        }
    }

    pub fn optimal_chunk_size(
        width: usize,
        height: usize,
        depth: usize,
        topology: &str,
        density_hint: Option<f32>,
    ) -> usize {
        // Target: chunk data fits in L2 cache (~256KB)
        const TARGET_BYTES: usize = 256 * 1024; // 256 KB

        let depth_clamped = depth.max(1);
        let bytes_per_layer = 4usize; // size_of::<u32>()
        let max_cells_per_chunk = TARGET_BYTES / (depth_clamped * bytes_per_layer);

        // cs² ≤ max_cells_per_chunk  =>  cs ≤ sqrt(max_cells_per_chunk)
        let cs_from_cache = (max_cells_per_chunk as f64).sqrt() as usize;

        let density = density_hint.unwrap_or(0.5).clamp(0.0, 1.0);

        let cs = if topology == "infinite" {
            let sparsity_scale = 1.0 - density * 0.75; // 0.25..1.0
            ((cs_from_cache as f64) * sparsity_scale as f64) as usize
        } else {
            let max_from_grid = (width.min(height) / 2).max(1);
            cs_from_cache.min(max_from_grid)
        };

        let cs_clamped = cs.clamp(4, 256);
        prev_power_of_two(cs_clamped)
    }

    /// Convert a world coordinate to (chunk, local) pair — handles negatives safely
    fn world_to_chunk_local(&self, q: i32, r: i32, s: i32) -> ((i32, i32, i32), (usize, usize, usize)) {
        let cs = self.chunk_size as i32;
        let depth = self.depth as i32;

        let cx = if q >= 0 { q / cs } else { (q + 1 - cs) / cs };
        let cy = if r >= 0 { r / cs } else { (r + 1 - cs) / cs };
        let cz = if s >= 0 { s / depth } else { (s + 1 - depth) / depth };

        let lx = ((q % cs + cs) % cs) as usize;
        let ly = ((r % cs + cs) % cs) as usize;
        let lz = ((s % depth + depth) % depth) as usize;

        ((cx, cy, cz), (lx, ly, lz))
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
        let ((cx, cy, cz), (lx, ly, lz)) = self.world_to_chunk_local(q, r, s);
        let idx = local_index(self.chunk_size, lx, ly, lz);
        self.get_chunk_mut(cx, cy, cz)[idx] = value;
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        let ((cx, cy, cz), (lx, ly, lz)) = self.world_to_chunk_local(q, r, s);
        if let Some(chunk) = self.get_chunk(cx, cy, cz) {
            chunk[local_index(self.chunk_size, lx, ly, lz)]
        } else {
            0
        }
    }

    pub fn clear(&mut self) {
        self.chunks.clear();
    }

    pub fn each_live_cell(&self) -> Vec<i32> {
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

    pub fn for_each_cell(&self) -> Vec<i32> {
        let mut out = Vec::new();
        for (&(cx, cy, cz), chunk) in &self.chunks {
            for lz in 0..self.depth {
                for ly in 0..self.chunk_size {
                    for lx in 0..self.chunk_size {
                        let idx = local_index(self.chunk_size, lx, ly, lz);
                        let val = chunk[idx];
                        // if val != 0 {
                            out.push(cx * self.chunk_size as i32 + lx as i32);
                            out.push(cy * self.chunk_size as i32 + ly as i32);
                            out.push(cz * self.depth as i32 + lz as i32);
                            out.push(val as i32);
                        // }
                    }
                }
            }
        }
        out
    }

    pub fn iter_cell(&self) -> impl Iterator<Item = [i32; 4]> + '_ {
        self.chunks.iter().flat_map(|(&(cx, cy, cz), chunk)| {
            let cs = self.chunk_size;
            let depth = self.depth;

            (0..depth).flat_map(move |lz| {
                (0..cs).flat_map(move |ly| {
                    (0..cs).filter_map(move |lx| {
                        let idx = local_index(cs, lx, ly, lz);
                        let val = chunk[idx];

                        // Each yield is one [q, r, s, val]
                        Some([
                            cx * cs as i32 + lx as i32,
                            cy * cs as i32 + ly as i32,
                            cz * depth as i32 + lz as i32,
                            val as i32,
                        ])
                    })
                })
            })
        })
    }

    pub fn resize(&mut self, _new_width: usize, _new_height: usize, new_depth: usize) {
        self.depth = new_depth;
    }

    pub fn get_chunk_size(&self) -> usize {
        self.chunk_size
    }

    pub fn get_depth(&self) -> usize {
        self.depth
    }

    pub fn get_chunk_keys(&self) -> Vec<i32> {
        let mut out = Vec::with_capacity(self.chunks.len() * 3);
        for &(cx, cy, cz) in self.chunks.keys() {
            out.push(cx);
            out.push(cy);
            out.push(cz);
        }
        out
    }

    pub fn get_chunk_cells(&self, cx: i32, cy: i32, cz: i32) -> Vec<u32> {
        if let Some(chunk) = self.get_chunk(cx, cy, cz) {
            chunk.clone()
        } else {
            vec![0; self.chunk_size * self.chunk_size * self.depth]
        }
    }

}
