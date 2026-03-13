// use std::default;

use crate::{
    cell_manager::{
        CellBackend, ChunkedCellManager, FlatCellManager, Topology
    },
    formats::PatternConfig,
    tiles::TileManager,
};

use serde::{Serialize, Deserialize};

use fastrand;

// CONFIG STRUCT
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GridConfig {
    pub width: usize,
    pub height: usize,
    pub depth: usize,

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
    pub topology_manager: Topology,
    pub tile_manager: TileManager,
}

impl GridMesh {

    fn build_backend(
        width: usize,
        height: usize,
        depth: usize,
        topology: String,
        old_cells: Option<Vec<i32>>,
    ) -> CellBackend {
        let threshold = 5000;
        let use_chunked = topology == "infinite"
            || width >= threshold
            || height >= threshold;

        if use_chunked {
            let chunk_size = ChunkedCellManager::optimal_chunk_size(width, height, depth, &topology, None);
            let mut cm = ChunkedCellManager::new(chunk_size, depth);

            if let Some(cells) = old_cells {
                for chunk in cells.chunks(4) {
                    if let &[q, r, s, v] = chunk {
                        cm.set_cell(q, r, s, v as u32);
                    }
                }
            }

            CellBackend::Chunked(cm)
        } else {
            let mut fm = FlatCellManager::new(width, height, depth);

            if let Some(cells) = old_cells {
                for chunk in cells.chunks(4) {
                    if let &[q, r, s, v] = chunk {
                        fm.set_cell(q, r, s, v as u32);
                    }
                }
            }

            CellBackend::Flat(fm)
        }
    }

    // CONSTRUCTOR
    pub fn new(shape: String, width: usize, height: usize) -> Self {
        let defaultconfig = PatternConfig::default();
        let tile_manager = TileManager::configure(
            shape.to_string(),
            defaultconfig.neighbor_type.clone(),
            defaultconfig.range,
        );
        let depth = tile_manager.splits;
        let mut inner = Self::build_backend(
            width, height, depth,
            defaultconfig.topology_type.clone(),
            None,
        );

        let config = GridConfig {
            width, height, depth,
            cell_struct: inner.get_cell_struct(),
            chunk_size: inner.get_chunk_size(),

            shape: shape.to_string(),
            neighbor_type: defaultconfig.neighbor_type,
            range: defaultconfig.range,

            topology_type: defaultconfig.topology_type,
            bounds: [
                -(width as i32 / 2), (width as i32 - 1) / 2,
                -(height as i32 / 2), (height as i32 - 1) / 2,
                0, depth as i32 - 1
            ],
        };

        let topology_manager = Topology::new(
            &config.topology_type,
            config.bounds,
        );

        Self {
            config,
            inner,
            topology_manager,
            tile_manager,
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

        for &(dq, dr, ds) in self.tile_manager.neighbor_offsets(s) {
            if let Some([nq, nr, ns]) =
                self.topology_manager.check_bounds(q + dq, r + dr, s + ds)
            {
                all_neighbors.push((nq, nr, ns));
            }
        }

        all_neighbors
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
    pub fn resize(&mut self, new_width: usize, new_height: usize) {
        let old_cells = self.inner.each_live_cell();

        self.inner = Self::build_backend(
            new_width,
            new_height,
            self.config.depth,
            self.config.topology_type.to_string(),
            Some(old_cells),
        );

        self.config.width = new_width;
        self.config.height = new_height;
        self.config.cell_struct = self.inner.get_cell_struct();

        let new_bounds = self.get_bounds();
        self.config.bounds = new_bounds;
        self.topology_manager.change_bounds(new_bounds);
    }

    // BOUNDS
    pub fn get_bounds(&self) -> [i32; 6] {
        if self.config.topology_type == "infinite" {
            return [
                i32::MIN, i32::MAX,
                i32::MIN, i32::MAX,
                0, (self.config.depth as i32) - 1,
            ];
        }

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
    pub fn random_cells(&mut self) -> i32 {
        let [min_q, max_q, min_r, max_r, min_s, max_s] = self.config.bounds;
        let rand_limit: i32 = 1000;
        let density: f32 = 0.42;
        let mut cells_filled = 0;

        for s in min_s..=max_s {
            for q in min_q.max(-rand_limit)..=max_q.min(rand_limit) {
                for r in min_r.max(-rand_limit)..=max_r.min(rand_limit) {
                    let status = if fastrand::f32() < density { 1 } else { 0 };
                    if status == 1 { cells_filled += 1; }
                    self.set_cell(q, r, s, status);
                }
            }
        }

        cells_filled
    }

    // CHANGE GRID PROPERTIES
    pub fn change_grid_properties(
        &mut self,
        shape: String,
        neighbor_type: String,
        range: i32,
        topology_type: String,
    ) {
        // Rebuild or update tile_manager depending on whether shape changed
        if self.tile_manager.shape != shape {
            self.tile_manager = TileManager::configure(shape.clone(), neighbor_type.clone(), range);
        } else {
            self.tile_manager.set_neighborhood(&neighbor_type, range);
        }

        // Update config
        self.config.shape = shape.clone();
        self.config.range = range;
        self.config.neighbor_type = neighbor_type.clone();
        self.config.topology_type = topology_type.clone();
        self.config.depth = self.tile_manager.splits;

        self.topology_manager.change_topology(&topology_type);

        // Re-evaluate backend (topology may force chunked)
        let old_cells = self.inner.each_live_cell();

        self.inner = Self::build_backend(
            self.config.width,
            self.config.height,
            self.config.depth,
            topology_type.to_string(),
            Some(old_cells),
        );

        self.config.cell_struct = self.inner.get_cell_struct();
        self.config.bounds = self.get_bounds();
    }

}