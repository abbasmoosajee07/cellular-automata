use std::collections::HashMap;

pub fn get_shape_neighborhoods() -> HashMap<&'static str, Vec<&'static str>> {
    let mut map = HashMap::new();
    map.insert("hex", vec!["hexagonal", "tripod", "asterix"]);
    map.insert("square", vec!["vonNeumann", "cross", "checkerboard", "moore", "star"]);
    map.insert("rhombus", vec!["Qbert"]);
    map.insert("triangle", vec!["vonNeumann", "biohazard", "inner", "vertices", "moore"]);
    map
}


pub struct Neighborhood {
    pub shape: String,
    pub chosen_type: String,
    pub range: i32,
    pub adj_neighbors: Vec<Vec<(i32,i32,i32)>>,
}

impl Neighborhood {
    pub fn new(shape: &str, chosen_type: &str, range: i32) -> Self {
        let adj_neighbors = Self::get_neighbors_for_shape(shape, chosen_type, range);
        Self {
            shape: shape.to_string(),
            chosen_type: chosen_type.to_string(),
            range,
            adj_neighbors,
        }
    }

    pub fn get_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<i32> {
        let mut out = Vec::new();
        let use_neighbors = self.get_neighbor_offsets(s);
        for &(dq, dr, ds) in use_neighbors {
            out.push(q + dq);
            out.push(r + dr);
            out.push(s + ds);
        }
        out
    }

    pub fn get_neighbor_offsets(&self, state: i32) -> &[(i32, i32, i32)] {
        let use_state: i32 = if self.adj_neighbors.len() == 1 {
            0
        } else {
            state
        };

        &self.adj_neighbors[use_state as usize]
    }

    pub fn switch_neighbors(&mut self, shape: &str, chosen_type: &str, range: i32) {
        self.adj_neighbors = Self::get_neighbors_for_shape(shape, chosen_type, range);
        self.shape = shape.to_string();
        self.chosen_type = chosen_type.to_string();
        self.range = range;
    }

    fn get_neighbors_for_shape(shape: &str, chosen_type: &str, _range: i32) -> Vec<Vec<(i32,i32,i32)>> {
        match shape {
            "square" => vec![Self::get_square_neighborhood(chosen_type)],
            "hexagon" => vec![Self::get_hexagon_neighborhood(chosen_type)],
            "rhombus" => Self::get_rhombus_neighborhood(chosen_type),
            "triangle" => Self::get_triangle_neighborhood(chosen_type),
            _ => vec![vec![(0, 0, 0)]],
        }
    }

    fn get_square_neighborhood(chosen_type: &str) -> Vec<(i32, i32, i32)> {
        match chosen_type {
            "vonNeumann" => vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
            ],
            "moore" => vec![
                (0, -1, 0), (0, 1, 0),
                (1, 0, 0), (-1, 0, 0),
                (1, -1, 0), (-1, 1, 0),
                (1, 1, 0), (-1, -1, 0),
            ],
            _ => vec![
                (0, -1, 0), (0, 1, 0),
            ],
        }
    }

    fn get_hexagon_neighborhood(chosen_type: &str) -> Vec<(i32, i32, i32)> {
        match chosen_type {
            "hexagonal" => vec![
                (-1, 1, 0), (1, 0, 0), (0, -1, 0),
                (0, 1, 0), (1, -1, 0), (-1, 0, 0),
            ],
            "tripod" => vec![
                // (-1, 1, 0), (1, 0, 0), (0, -1, 0),
                (0, 1, 0), (1, -1, 0), (-1, 0, 0),
            ],
            "asterix" => vec![
                (-1, 1, 0), (1, 0, 0), (0, -1, 0),
                (0, 1, 0), (1, -1, 0), (-1, 0, 0),
                (0, 2, 0), (2, -2, 0), (-2, 0, 0),
            ],
            _ => vec![
                (0, 0, 0),
            ],
        }
    }

    fn get_triangle_neighborhood(chosen_type: &str) -> Vec<Vec<(i32, i32, i32)>> {
        match chosen_type {
            "vonNeumann" => vec![
                vec![   // Left/Upper triangle
                    (0, 0, 1), (0, 1, 1), (-1, 0, 1),
                ],
                vec![   // Right/Lower triangle
                    (0, 0, -1), (0, -1, -1), (1, 0, -1),
                ],
            ],

            "biohazard" => vec![
                vec![
                    (0, -1, 0), (1, 0, 0), (1, 1, 0),
                    (0, 0, 1),  (0, 1, 1), (-1, 0, 1),
                    (0, 1, 0),  (-1, 0, 0), (-1, -1, 0),
                ],
                vec![
                    (0, -1, 0), (1, 0, 0), (1, 1, 0),
                    (0, 1, 0),  (-1, 0, 0), (-1, -1, 0),
                    (0, 0, -1), (0, -1, -1), (1, 0, -1),
                ],
            ],

            "inner" => vec![
                vec![
                    (-1, 1, 1), (1, 1, 1), (-1, -1, 1),
                    (0, 0, 1),  (0, 1, 1),  (-1, 0, 1),
                ],
                vec![
                    (0, 0, -1), (0, -1, -1), (1, 0, -1),
                    (1, 1, -1), (-1, -1, -1), (1, -1, -1),
                ],
            ],

            "vertices" => vec![
                vec![
                    (-1, 1, 1),  (0, -1, 0),  (1, 0, 0),
                    (1, 1, 0),   (1, 1, 1),   (0, 1, 0),
                    (-1, 0, 0),  (-1, -1, 0), (-1, -1, 1),
                ],
                vec![
                    (0, -1, 0),  (1, 0, 0),   (1, 1, 0),
                    (0, 1, 0),   (-1, 0, 0),  (-1, -1, 0),
                    (1, 1, -1),  (-1, -1, -1), (1, -1, -1),
                ],
            ],

            "moore" => vec![
                vec![
                    (-1, 1, 1),  (0, -1, 0),  (1, 0, 0),
                    (0, 0, 1),   (0, 1, 1),   (-1, 0, 1),
                    (1, 1, 0),   (1, 1, 1),   (0, 1, 0),
                    (-1, 0, 0),  (-1, -1, 0), (-1, -1, 1),
                ],
                vec![
                    (0, -1, 0),  (1, 0, 0),   (1, 1, 0),
                    (0, 1, 0),   (-1, 0, 0),  (-1, -1, 0),
                    (0, 0, -1),  (0, -1, -1), (1, 0, -1),
                    (1, 1, -1),  (-1, -1, -1), (1, -1, -1),
                ],
            ],

            _ => vec![vec![(0, 0, 0)]],
        }
    }

    fn get_rhombus_neighborhood(chosen_type: &str) -> Vec<Vec<(i32, i32, i32)>> {
        match chosen_type {
            "Qbert" => vec![
                vec![ // (0, 0, 0)
                    (0, 0, 2), (1, 0, 2), (-1, 1, 2), (0, 1, 2),
                    (1, 0, 1), (0, 0, 1), (1, -1, 1), (0, 1, 1),
                    (1, -1, 0), (-1, 1, 0)
                    ],
                vec![ // (0, 0, 1)
                    (0, 0, -1), (0, 0, 1), (-1, 1, 1), (-1, 0, -1),
                    (0, -1, -1), (0, -1, 0), (-1, 0, 1), (0, 1, 0),
                    (-1, 1, -1), (0, 1, 1)
                ],
                vec![ // (0, 0, 2)
                    (0, 0, -1), (0, 0, -2), (0, -1, -2), (1, -1, -1),
                    (0, -1, -1), (-1, 0, 0), (-1, 0, -2),
                    (1, -1, -2), (1, 0, 0), (1, 0, -1)
                ]
            ],
            _ => vec![vec![(0, 0, 0)]],
        }
    }
}

