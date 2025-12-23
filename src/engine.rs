use crate::{GridMesh, PatternIO, formats::PatternConfig};
use crate::automata::{ConwayLife};
// use std::env;
use std::{fs, path::{Path}};

pub struct Engine {
    pub storage: PatternConfig,
    pub mesh: GridMesh,
}

impl Engine {
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>,) -> Self {
        Self {
            storage: PatternConfig::default(),
            mesh: GridMesh::new(width, height, depth, chunk_size),
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

        let print_cfg =  serde_json::to_string(&cfg).unwrap();
        println!("config: {}", print_cfg);

        let [w, h, d] = cfg.grid_size;
        let mut grid = Self {
            storage: cfg.clone(),
            mesh: GridMesh::new(w as usize, h as usize, d as usize, None),
        };

        grid.mesh.change_grid_properties(
            cfg.shape.clone(), cfg.neighbor_type.clone(), cfg.range, cfg.topology_type.clone()
        );

        let [shift_q, shift_r, shift_s, ] = cfg.top_left;

        for (x, y, z, state) in &cfg.alive {
            if *state != 0 {
                grid.mesh.set_cell(*x + shift_q, *y - shift_r, *z + shift_s, *state);
            }
        }
        grid

    }

    // CONWAY GAME OF LIFE UPDATE
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
    }

    pub fn update_stroage(&mut self) {
        let [shift_q, shift_r, shift_s, ] = self.storage.top_left;
        let mut new_alive: Vec<(i32, i32, i32, u32)> = Vec::new();
        for [q, r, s, state] in self.mesh.inner.iter_cell() {
            if state != 0 {
                new_alive.push((q - shift_q, r + shift_r, s + shift_s, state as u32));
            }
        }
        // for (*q, *r, *s, *state) in self.mesh.each_live_cell().chunks(4) {
        //     new_alive.push((q, r, s, state as u32));
        // }
        self.storage.alive = new_alive;
    }

    pub fn snap_pattern(&mut self) {
        let _reader = PatternIO::save_file(self.storage.clone());
    }

}
