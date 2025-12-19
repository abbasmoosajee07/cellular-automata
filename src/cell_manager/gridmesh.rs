use crate::cell_manager::{
    CellBackend, FlatCellManager, ChunkedCellManager,
    Neighborhood, Topology,
};
use serde::{Serialize, Deserialize};

use fastrand;

// CONFIG STRUCT
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GridConfig {
    pub width: usize,
    pub height: usize,
    pub depth: usize,

    pub threshold: usize,
    pub cell_struct: String,
    pub chunk_size: usize,

    pub shape: String,
    pub neighbor_type: String,
    pub range: i32,

    pub topology_type: String,
    pub bounds: [i32; 6],
}

// Grid Mesh
pub struct GridMesh {
    pub config: GridConfig,
    pub inner: CellBackend,
    pub neighbor_manager: Neighborhood,
    pub topology_manager: Topology,
}

impl GridMesh {

    // CONSTRUCTOR
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> Self {
        let threshold = 10_000;
        let use_chunked = width > threshold || height > threshold;

        let cs = chunk_size.unwrap_or(256);

        let inner = if use_chunked {
            CellBackend::Chunked(ChunkedCellManager::new(cs, depth))
        } else {
            CellBackend::Flat(FlatCellManager::new(width , height, depth))
        };

        let config = GridConfig {
            width,
            height,
            depth,
            threshold,
            cell_struct: "flat_cells".to_string(),
            chunk_size: cs,

            shape: "square".to_string(),
            neighbor_type: "moore".to_string(),
            range: 1,

            topology_type: "finite".to_string(),
            bounds: [-10, 9, -10, 9, 0, 1]
        };

        let neighbor_manager = Neighborhood::new(
            &config.shape,
            &config.neighbor_type,
            config.range,
        );

        let topology_manager = Topology::new(
            &config.topology_type,
            config.bounds,
        );

        Self {
            config,
            inner,
            neighbor_manager,
            topology_manager,
        }
    }

    // BASIC OPERATIONS
    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        self.inner.set_cell(q, r, s, value);
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.inner.get_cell(q, r, s)
    }

    pub fn clear(&mut self) {
        self.inner.clear();
    }

    pub fn batch_update(
        &mut self,
        cell_data: Vec<(i32, i32, i32, u32)>,
        overwrite: Option<u32>,
    ) {
        for (q, r, s, val) in cell_data {
            let write_val = overwrite.unwrap_or(val);
            self.set_cell(q, r, s, write_val);
        }
    }

    pub fn each_live_cell(&self) -> Vec<i32> {
        self.inner.each_live_cell()
    }

    // NEIGHBORHOOD
    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<(i32, i32, i32)> {
        let mut all_neighbors = Vec::new();
        let use_neighbors = self.neighbor_manager.get_neighbor_offsets(s);

        for &(dq, dr, ds) in use_neighbors {
            if let Some([nq, nr, ns]) =
                self.topology_manager.check_bounds(q + dq, r + dr, s + ds)
            {
                all_neighbors.push((nq, nr, ns));
            }
        }

        all_neighbors
    }

    // FLOOD FILL
    pub fn floodfill(&mut self) {
        let arr = self.each_live_cell();
        let mut neighbors_to_activate = Vec::new();

        let mut i = 0;
        while i + 3 < arr.len() {
            let q = arr[i];
            let r = arr[i + 1];
            let s = arr[i + 2];
            let state = arr[i + 3];

            if state == 1 {
                neighbors_to_activate.extend(
                    self.get_neighbors(q, r, s)
                );
            }

            i += 4;
        }

        // Activate neighbors
        for (nq, nr, ns) in neighbors_to_activate {
            self.set_cell(nq, nr, ns, 1);
        }
    }

    pub fn count_live_cells(&self) -> i32 {
        let mut count = 0;
        let arr = self.each_live_cell();

        let mut i = 0;
        while i + 3 < arr.len() {
            let state = arr[i + 3] as i32;
            count += state;
            i += 4;
        }
        count
    }

    // RESIZING
    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let use_chunked = new_width > self.config.threshold || new_height > self.config.threshold;

        let old_cells = self.inner.each_live_cell();

        self.inner = if use_chunked {
            let mut cm = ChunkedCellManager::new(self.config.chunk_size, new_depth);
            for chunk in old_cells.chunks(4) {
                if let &[q, r, s, v] = chunk {
                    cm.set_cell(q, r, s, v as u32);
                }
            }
            CellBackend::Chunked(cm)
        } else {
            let mut fm = FlatCellManager::new(new_width , new_height , new_depth);
            for chunk in old_cells.chunks(4) {
                if let &[q, r, s, v] = chunk {
                    fm.set_cell(q, r, s, v as u32);
                }
            }
            CellBackend::Flat(fm)
        };

        self.config.width = new_width;
        self.config.height = new_height;
        self.config.depth = new_depth;
        self.config.cell_struct = self.inner.get_cell_struct();
        let new_bounds: [i32; 6] = self.get_bounds();
        self.config.bounds = new_bounds.clone();
        self.topology_manager.change_bounds(new_bounds.clone());
    }

    // BOUNDS
    pub fn get_bounds(&self) -> [i32; 6] {
        let cols = self.config.width as i32;
        let rows = self.config.height as i32;
        let states = self.config.depth as i32;

        let min_q = -(cols / 2);
        let max_q = (cols - 1) / 2;
        let min_r = -(rows / 2);
        let max_r = (rows - 1) / 2;

        let min_s = 0;
        let max_s = states - 1;

        [min_q, max_q, min_r, max_r, min_s, max_s]
    }

    pub fn get_cell_extremes(&self) -> [i32; 6] {
        let arr = self.each_live_cell();

        // Initialize with opposite extremes
        let mut min_q = i32::MAX;
        let mut max_q = i32::MIN;
        let mut min_r = i32::MAX;
        let mut max_r = i32::MIN;
        let mut min_s = i32::MAX;
        let mut max_s = i32::MIN;

        let mut i = 0;
        while i + 3 < arr.len() {
            let q = arr[i];
            let r = arr[i + 1];
            let s = arr[i + 2];
            let _state = arr[i + 3];

            min_q = min_q.min(q);
            max_q = max_q.max(q);

            min_r = min_r.min(r);
            max_r = max_r.max(r);

            min_s = min_s.min(s);
            max_s = max_s.max(s);

            i += 4;
        }

        [min_q, max_q, min_r, max_r, min_s, max_s]
    }

    // RANDOM FILL
    pub fn random_cells(&mut self) {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.config.bounds;
        let rand_limit: i32 = 1000;
        let density: f32 = 0.42;
        for s in min_s..=max_s {
            for q in min_q.max(-rand_limit)..=max_q.min(rand_limit) {
                for r in min_r.max(-rand_limit)..=max_r.min(rand_limit) {
                    let status = if fastrand::f32() < density { 1 } else { 0 };
                    self.set_cell(q, r, s, status);
                }
            }
        }
    }

    // CHANGE GRID PROPERTIES
    pub fn change_grid_properties(
        &mut self,
        shape: String,
        neighbor_type: String,
        range: i32,
        topology_type: String
    ) {
        self.config.shape = shape.clone();
        self.config.range = range;
        self.config.neighbor_type = neighbor_type.clone();
        self.config.topology_type = topology_type.clone();

        self.neighbor_manager.change_cell_properties(&shape, &neighbor_type, range);
        self.topology_manager.change_topology(&topology_type);
    }
}
