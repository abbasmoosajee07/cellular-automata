// simulation.rs
use crate::GridMesh;
use std::collections::HashSet;

pub struct ConwayLife;

impl ConwayLife {

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

    pub fn step_game_of_life(mesh: &mut GridMesh) -> (i32, i32) {
        let mut total = 0usize;
        let mut live = 0usize;
        for [_q, _r, _s, state] in mesh.inner.iter_cell() {
            total += 1;
            if state != 0 { live += 1; }
        }

        let is_dense = live * 6 > total;

        let next_states = if is_dense {
            Self::dense_step(mesh)
        } else {
            Self::sparse_step(mesh)
        };

        let mut births = 0i32;
        let mut deaths = 0i32;

        for chunk in next_states.chunks_exact(4) {
            let next_state = chunk[3];
            // next_state != prev_state is guaranteed by both step fns
            if next_state == 1 {
                births += 1;
            } else {
                deaths += 1;
            }
            mesh.inner.set_cell(chunk[0], chunk[1], chunk[2], next_state as u32);
        }

        (births, deaths)
    }
}