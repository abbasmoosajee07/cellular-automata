use crate::{GridMesh, PatternIO, formats::PatternConfig};
use crate::automata::{ConwayLife};
// use std::env;
use std::{fs, path::{Path}};

pub struct Engine {
    pub storage: PatternConfig,
    pub mesh: GridMesh,
}

impl Engine {
    pub fn new(width: usize, height: usize, depth: usize) -> Self {
        Self {
            storage: PatternConfig::default(),
            mesh: GridMesh::new(width, height, depth),
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

        let [w, h, d] = cfg.grid_size;
        let mut grid = Self {
            storage: cfg.clone(),
            mesh: GridMesh::new(w as usize, h as usize, d as usize),
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
        grid

    }

    // CONWAY GAME OF LIFE UPDATE
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
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
