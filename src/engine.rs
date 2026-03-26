use crate::{GridMesh, PatternIO, formats::PatternConfig};
use crate::automata::{Automata, FloodFill, ConwayLife};
use std::{fs, path::{Path}};

pub struct Engine {
    pub storage: PatternConfig,
    pub mesh: GridMesh,
    pub automata: Automata,
}

impl Engine {

    // New AUtomata Engine
    pub fn new(shape: String, width: usize, height: usize) -> Self {
        let grid_mesh = GridMesh::new(shape, width, height);
        let total = grid_mesh.calculate_total_cells(); // compute before move
        Self {
            storage: PatternConfig::default(),
            mesh: grid_mesh,
            automata: Automata { live: 0, gen_no: 0, total },
        }
    }

    pub fn read_file<P: AsRef<Path>>(
        path: P,
    ) -> Result<Self, std::io::Error> {
        let path_str = path.as_ref().to_string_lossy().to_string();
        let path = path.as_ref();

        let file_text = fs::read_to_string(path)?;
        let grid = Self::new_with_pattern(&path_str, &file_text);
        Ok(grid)
    }

    pub fn new_with_pattern(pattern_props: &str, pattern_data: &str) -> Self {

        let cfg = PatternIO::read_pattern(pattern_props, pattern_data);

        let [w, h, _d] = cfg.grid_size;
        let grid_mesh = GridMesh::new(cfg.shape.clone(), w as usize, h as usize);
        let total = grid_mesh.calculate_total_cells(); // compute before move
        let mut grid = Self {
            storage: cfg.clone(),
            mesh: grid_mesh,
            automata: Automata { live: 0, gen_no: 0, total},
        };

        grid.mesh.change_grid_properties(
            cfg.shape.clone(), cfg.neighbor_type.clone(), cfg.range, cfg.topology_type.clone()
        );

        let [shift_q, shift_r, shift_s, ] = cfg.top_left;

        for (y, x, z, state) in &cfg.alive {
            if *state != 0 {
                grid.set_cell(*y + shift_q, *x + shift_r, *z + shift_s, *state);
            }
        }
        grid.automata.live = grid.count_live_cells();
        grid

    }

    // BASIC OPERATIONS
    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        self.mesh.inner.set_cell(q, r, s, value);
        self.automata.live = self.count_live_cells();

    }

    pub fn clear(&mut self) {
        self.mesh.inner.clear();
        self.automata.live = self.count_live_cells();
        self.automata.gen_no = 0;
    }

    pub fn count_live_cells(&self) -> i32 {
        self.mesh.inner.count_live_cells()
    }

    pub fn resize(&mut self, w: usize, h: usize) {
        self.mesh.resize(w, h);
        self.automata.total = self.mesh.calculate_total_cells();
    }

    pub fn change_grid_properties(&mut self, shape: String, neighbor_type: String, range: i32, topology_type: String) {
        self.mesh.change_grid_properties(shape, neighbor_type, range, topology_type);
        self.automata.total = self.mesh.calculate_total_cells();
    }

    // Automata Operations
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
        self.automata.live = self.count_live_cells();
        self.automata.gen_no += 1;
    }

    pub fn random_cells(&mut self) {
        let active_cells = self.mesh.random_cells();
        self.automata.live = active_cells;
        self.automata.gen_no += 1;
    }

    pub fn floodfill(&mut self) {
        let active_cells = FloodFill::floodfill(&mut self.mesh);
        self.automata.live = active_cells;
        self.automata.gen_no += 1;
    }

    // Storage Operations
    pub fn update_storage(&mut self) {
        let mut new_storage = self.storage.clone();
        let config = self.mesh.config.clone();
        let use_bounds: [i32; 6] = if config.topology_type == "infinite" {
            self.mesh.get_cell_extremes()
        } else {
            config.bounds
        };
        let [min_q, max_q, min_r, max_r, min_s, max_s]= use_bounds;

        let mut new_alive: Vec<(i32, i32, i32, u32)> = Vec::new();
        for [q, r, s, state] in self.mesh.inner.iter_cell() {
            if state != 0 {
                new_alive.push((q - min_q, r - min_r, s + min_s, state as u32));
            }
        };
        new_storage.grid_size = [
            (max_q - min_q + 1) as usize,
            (max_r - min_r + 1) as usize,
            (max_s - min_s + 1) as usize,
        ];
        new_storage.top_left  = [min_q, min_r, min_s];
        new_storage.neighbor_type = config.neighbor_type.clone();
        new_storage.topology_type = config.topology_type.clone();
        new_storage.shape = config.shape.clone();
        new_storage.range = config.range;
        new_storage.alive = new_alive;
        self.storage = new_storage.clone();
    }

    pub fn snap_pattern(&mut self) {
        let _reader = PatternIO::save_file(self.storage.clone());
    }

    pub fn pattern_text(&mut self) -> String {
        PatternIO::write_text(self.storage.clone())
    }

}
