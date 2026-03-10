use crate::{GridMesh, PatternIO, formats::PatternConfig};
use crate::automata::{ConwayLife};
use std::{fs, path::{Path}};

#[derive(Clone, Debug, Default)]
pub struct Automata {
    pub live: i32,
    pub gen_no: i32,
}

pub struct Engine {
    pub storage: PatternConfig,
    pub mesh: GridMesh,
    pub automata: Automata,
}

impl Engine {
    pub fn new(shape: String, width: usize, height: usize) -> Self {

        Self {
            storage: PatternConfig::default(),
            mesh: GridMesh::new(shape, width, height),
            automata: Automata { live: 0, gen_no: 0 },
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
        let mut grid = Self {
            storage: cfg.clone(),
            mesh: GridMesh::new(cfg.shape.clone(), w as usize, h as usize),
            automata: Automata { live: 0, gen_no: 0 },
        };

        grid.mesh.change_grid_properties(
            cfg.shape.clone(), cfg.neighbor_type.clone(), cfg.range, cfg.topology_type.clone()
        );

        let [shift_q, shift_r, shift_s, ] = cfg.top_left;

        for (y, x, z, state) in &cfg.alive {
            if *state != 0 {
                grid.mesh.set_cell(*y + shift_q, *x + shift_r, *z + shift_s, *state);
            }
        }
        grid.automata.live = grid.mesh.count_live_cells();
        grid

    }

    // CONWAY GAME OF LIFE UPDATE
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
        self.automata.live = self.mesh.count_live_cells();
        self.automata.gen_no += 1;
    }

    pub fn random_cells(&mut self) {
        let active_cells = self.mesh.random_cells();
        self.automata.live = active_cells;
        self.automata.gen_no += 1;
    }

    pub fn floodfill(&mut self) {
        let active_cells = self.mesh.floodfill();
        self.automata.live = active_cells;
        self.automata.gen_no += 1;
    }

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
