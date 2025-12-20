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
    // CONWAY GAME OF LIFE UPDATE
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
    }

    pub fn test_pattern(&self) -> Result<(), Box<dyn std::error::Error>> {
        // let path = env::args()
        //     .nth(1)
        //     .expect("Usage: program <pattern-file>");
        let mut read_pattern = PatternIO::new();
        read_pattern.read_from_path("patterns/glider.cells")?;
        let _test = read_pattern.save_to_file();
        println!("{}", read_pattern.file_text);
        Ok(())
    }
}
