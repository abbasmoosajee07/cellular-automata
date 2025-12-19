use crate::GridMesh;
use crate::automata::{ConwayLife};

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
}
