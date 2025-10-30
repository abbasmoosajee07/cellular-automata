
pub struct Neighborhood {
    adj_neighbors: Vec<(i32, i32, i32)>,
}

impl Neighborhood {
    pub fn new(shape: &str) -> Self {
        let adj_neighbors = Self::get_neighbors_for_shape(shape);

        Self {
            adj_neighbors,
        }
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        let mut out = Vec::new();
        for &(dq, dr, ds) in &self.adj_neighbors {
            out.push(q + dq);
            out.push(r + dr);
            out.push(s + ds);
        }
        out
    }

    pub fn get_neighbor_offsets(&self) -> &[(i32, i32, i32)] {
        &self.adj_neighbors
    }

    pub fn switch_neighbors(&mut self, shape: &str) {
        self.adj_neighbors = Self::get_neighbors_for_shape(shape);
    }

    fn get_neighbors_for_shape(shape: &str) -> Vec<(i32, i32, i32)> {
        match shape {
            "square" => vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
            ],
            "hexagon" => vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
                (1, -1, 0), (-1, 1, 0),
            ],
            "triangle" => vec![
                (-1, 1, 1), (0, -1, 0),
                (1, 0, 0),
            ],
            _ => vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
                (1, -1, 0), (-1, 1, 0),
            ],
        }
    }
}

