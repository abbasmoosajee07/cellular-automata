// simulation.rs
use crate::GridMesh;
use std::collections::HashSet;

pub struct ConwayLife;

impl ConwayLife {
    /// Dense mode – used when grid is highly populated
    fn dense_step(mesh: &mut GridMesh) -> Vec<i32> {
        let mut next_states = Vec::new();

        for [q, r, s, state] in mesh.inner.iter_cell() {
            let state = state as i32;

            let mut alive_neighbors = 0;
            for (nq, nr, ns) in mesh.get_neighbors(q, r, s) {
                if mesh.inner.get_cell(nq, nr, ns) == 1 {
                    alive_neighbors += 1;
                }
            }

            let next_state = match (state, alive_neighbors) {
                (1, 2) | (1, 3) => 1,
                (0, 3) => 1,
                _ => 0,
            };

            if next_state != state {
                next_states.extend_from_slice(&[q, r, s, next_state]);
            }
        }

        next_states
    }

    /// Sparse mode – only evaluate live cells + dead neighbors
    fn sparse_step(mesh: &mut GridMesh) -> Vec<i32> {
        let mut next_states = Vec::new();
        let mut potential_cells = Vec::new();
        let mut seen = HashSet::new();

        for [q, r, s, state] in mesh.inner.iter_cell() {
            if state != 0 {
                let cell = (q, r, s);
                if seen.insert(cell) {
                    potential_cells.push(cell);
                }

                for neigh in mesh.get_neighbors(q, r, s) {
                    if mesh.inner.get_cell(neigh.0, neigh.1, neigh.2) == 0 {
                        if seen.insert(neigh) {
                            potential_cells.push(neigh);
                        }
                    }
                }
            }
        }

        for (q, r, s) in potential_cells {
            let state = mesh.inner.get_cell(q, r, s) as i32;

            let mut alive_neighbors = 0;
            for (nq, nr, ns) in mesh.get_neighbors(q, r, s) {
                if mesh.inner.get_cell(nq, nr, ns) == 1 {
                    alive_neighbors += 1;
                }
            }

            let next_state = match (state, alive_neighbors) {
                (1, 2) | (1, 3) => 1,
                (0, 3) => 1,
                _ => 0,
            };

            if next_state != state {
                next_states.extend_from_slice(&[q, r, s, next_state]);
            }
        }

        next_states
    }

    /// Unified automatic-mode step
    pub fn step_game_of_life(mesh: &mut GridMesh) {
        // First pass for density
        let mut total = 0usize;
        let mut live = 0usize;
        for [_q, _r, _s, state] in mesh.inner.iter_cell() {
            total += 1;
            if state != 0 { live += 1; }
        }

        let is_dense = live * 6 > total; // ~16%

        let next_states = if is_dense {
            Self::dense_step(mesh)
        } else {
            Self::sparse_step(mesh)
        };

        // Apply updates
        for chunk in next_states.chunks_exact(4) {
            mesh.inner.set_cell(chunk[0], chunk[1], chunk[2], chunk[3] as u32);
        }
    }
}
