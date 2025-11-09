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
        self.shape = shape.to_string();
        self.chosen_type = chosen_type.to_string();
        self.range = range;
        self.adj_neighbors = Self::get_neighbors_for_shape(shape, chosen_type, range);
    }

    fn get_neighbors_for_shape(shape: &str, chosen_type: &str, range: i32) -> Vec<Vec<(i32,i32,i32)>> {
        match shape {
            "hexagon" => vec![Self::get_hexagon_neighborhood(chosen_type, range)],
            "rhombus" => Self::get_rhombus_neighborhood(chosen_type),

            "square" => vec![Self::get_square_neighborhood(chosen_type, range)],
            "triangle" => Self::expand_range(Self::get_triangle_neighborhood(chosen_type), range),
            _ => vec![vec![(0, 0, 0)]],
        }
    }

    fn expand_range(all_neighborhoods: Vec<Vec<(i32, i32, i32)>>, range: i32
    ) -> Vec<Vec<(i32, i32, i32)>> {
        let mut expanded_sets = Vec::new();

        for base_set in all_neighborhoods.into_iter() {
            let mut expanded = Vec::new();

            // include base neighbors scaled by 1..range
            for n1 in 1..=range {
                for n in 1..=range {
                    for &(dq, dr, ds) in &base_set {
                        expanded.push((dq * n1, dr * n, ds));
                    }
                }
            }
            expanded_sets.push(expanded);
        }
        return expanded_sets;
    }

    fn _get_square_neighborhood(chosen_type: &str, _range: i32) -> Vec<(i32, i32, i32)> {
        let base_neighborhood = match chosen_type {
            "vonNeumann" => vec![
                (0, -1, 0), (0, 1, 0), (1, 0, 0), (-1, 0, 0),
            ],
            "cross" => vec![
                (0, -1, 0), (0, 1, 0), (1, 0, 0), (-1, 0, 0),
            ],
            "moore" => vec![
                (0, -1, 0), (0, 1, 0), (1, 0, 0), (-1, 0, 0),
                (1, -1, 0), (-1, 1, 0), (1, 1, 0), (-1, -1, 0),
            ],
            "star" => vec![
                (0, -1, 0), (0, 1, 0), (1, 0, 0), (-1, 0, 0),
                (1, -1, 0), (-1, 1, 0), (1, 1, 0), (-1, -1, 0),
            ],
            _ => vec![
                (0, -1, 0), (0, 1, 0),
            ],
        };
        base_neighborhood
    }

    fn get_square_neighborhood(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        let mut neigh = Vec::new();

        match chosen_type {
            // Manhattan radius — orthogonal only
            "vonNeumann" => {
                for d in 1..=range {
                    neigh.push(( d, 0, 0)); neigh.push((-d, 0, 0));
                    neigh.push((0,  d, 0)); neigh.push((0, -d, 0));
                    neigh.push((1, d-1, 0)); neigh.push((d - 1, 1, 0));
                    // neigh.push((-d, d, 0));
                    // neigh.push((d-1,  -d-1, 0)); neigh.push((-d-1, -d-1, 0));
                }
            }
            "cross" => {
                for d in 1..=range {
                    neigh.push(( d, 0, 0)); neigh.push((-d, 0, 0));
                    neigh.push((0,  d, 0)); neigh.push((0, -d, 0));
                }
            }
            // Full Chebyshev neighborhood: all cells within a square of radius "range"
            "moore" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        if dx != 0 || dy != 0 {
                            neigh.push((dx, dy, 0));
                        }
                    }
                }
            }

            // Orthogonal + diagonal rays extending outward
            "star" => {
                for d in 1..=range {
                    // orthogonal
                    neigh.push(( d, 0, 0)); neigh.push((-d, 0, 0));
                    neigh.push((0,  d, 0)); neigh.push((0, -d, 0));

                    // diagonals
                    neigh.push(( d,  d, 0)); neigh.push(( d, -d, 0));
                    neigh.push((-d,  d, 0)); neigh.push((-d, -d, 0));
                }
            }

            // Fallback — minimal neighborhood
            _ => {
                for d in 1..=range {
                    neigh.push((0,  d, 0)); neigh.push((0, -d, 0));
                }
            }
        }

        neigh
    }

    fn get_hexagon_neighborhood(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        let mut neigh = Vec::new();
        match chosen_type {
            "tripod" => {
                for d in 1..=range {
                    neigh.push((d, 0, 0)); neigh.push((0, -d, 0));neigh.push((-d,  d, 0));
                }
            }
            "asterix" => {
                for d in 1..=range {
                    neigh.push((-d,  d, 0)); neigh.push(( d, -d, 0));
                    neigh.push(( d, 0, 0)); neigh.push((-d, 0, 0));
                    neigh.push((0,  d, 0)); neigh.push((0, -d, 0));
                }
            }
            "hexagonal" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        if dx != 0 || dy != 0 {
                            neigh.push((-dx,  dy, 0)); neigh.push(( dx, -dy, 0));
                            neigh.push(( dx, 0, 0)); neigh.push((-dx, 0, 0));
                            neigh.push((0,  dy, 0)); neigh.push((0, -dy, 0));                        }
                    }
                }
            }
            // Fallback — minimal neighborhood
            _ => {neigh.push((0, 1, 0))}
        }

        neigh
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

