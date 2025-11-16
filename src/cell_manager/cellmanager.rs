use crate::cell_manager::{
    CellBackend, FlatCellManager, ChunkedCellManager, Neighborhood
};
use fastrand;
// CONFIG STRUCT
#[derive(Clone)]
pub struct CellConfig {
    pub width: usize,
    pub height: usize,
    pub depth: usize,

    pub threshold: usize,
    pub chunk_size: usize,

    pub shape: String,
    pub neighbor_type: String,
    pub range: i32,

    pub topology_type: String,
}

// CELL MANAGER
pub struct CellManager {
    pub config: CellConfig,
    inner: CellBackend,
    neighbor_manager: Neighborhood,
}

impl CellManager {

    // CONSTRUCTOR
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>) -> Self {
        let threshold = 2500;
        let use_chunked = width > threshold || height > threshold;

        let cs = chunk_size.unwrap_or(256);

        let inner = if use_chunked {
            CellBackend::Chunked(ChunkedCellManager::new(cs, depth))
        } else {
            CellBackend::Flat(FlatCellManager::new(width , height, depth))
        };

        let config = CellConfig {
            width,
            height,
            depth,
            threshold,
            chunk_size: cs,

            shape: "square".to_string(),
            neighbor_type: "vonNeumann".to_string(),
            range: 1,

            topology_type: "none".to_string(),
        };

        let neighbor_manager = Neighborhood::new(
            &config.shape,
            &config.neighbor_type,
            config.range,
        );

        Self {
            config,
            inner,
            neighbor_manager,
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

    pub fn for_each_cell(&self) -> Vec<i32> {
        self.inner.for_each_cell()
    }

    // NEIGHBORHOOD
    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        self.neighbor_manager.get_neighbors(q, r, s)
    }

    pub fn count_live_neighbors(&self, q: i32, r: i32, s: i32) -> u32 {
        let mut count = 0;
        for &(dq, dr, ds) in self.neighbor_manager.get_neighbor_offsets(s) {
            count += self.get_cell(q + dq, r + dr, s + ds);
        }
        count
    }

    // RESIZING
    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let use_chunked = new_width > self.config.threshold || new_height > self.config.threshold;

        let old_cells = self.inner.for_each_cell();

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

    // RANDOM FILL
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

    // FLOOD FILL
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
    }
}
