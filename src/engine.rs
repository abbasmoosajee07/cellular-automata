use crate::{GridMesh, PatternIO};
use crate::automata::{ConwayLife};
// use std::env;

pub struct Engine {
    pub mesh: GridMesh,
}

impl Engine {
    pub fn new(width: usize, height: usize, depth: usize, chunk_size: Option<usize>,) -> Self {
        Self {
            mesh: GridMesh::new(width, height, depth, chunk_size),
        }
    }

    pub fn new_with_pattern(pattern_data: &str) -> Self {
        let mut reader = PatternIO::new();
        reader.read_pattern(pattern_data.to_string());

        let cfg = &reader.parsed;
        let [w, h, d] = cfg.grid_size;
        let print_cfg =  serde_json::to_string(cfg).unwrap();

        println!("{}", print_cfg);
        let mut grid = Self {
            mesh: GridMesh::new(1*w as usize, 1*h as usize, d as usize, None),
        };
        grid.mesh.change_grid_properties(cfg.shape.clone(), cfg.neighbor_type.clone(), cfg.range, cfg.topology_type.clone());
        let [shift_q, shift_r, _, ] = cfg.top_left;

        // IMPORTANT: actually apply the pattern
        for (x, y, z, state) in &cfg.alive {
            if *state != 0 {
                grid.mesh.set_cell(*x + shift_q, *y - shift_r, *z, *state);
            }
        }
        grid
    }

    // CONWAY GAME OF LIFE UPDATE
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
    }
    pub fn test_pattern(&self) -> Result<(), Box<dyn std::error::Error>> {
        // let path = env::args()
        //     .nth(1)
        //     .expect("Usage: program <pattern-file>");
        let mut read_pattern = PatternIO::new();
        read_pattern.read_file("patterns/glider.cells")?;

        let _test = read_pattern.save_file();
        Ok(())
    }
}
