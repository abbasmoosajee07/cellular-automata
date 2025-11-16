
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

    pub fn change_cell_properties(&mut self, shape: &str, chosen_type: &str, range: i32) {
        self.shape = shape.to_string();
        self.chosen_type = chosen_type.to_string();
        self.range = range;
        self.adj_neighbors = Self::get_neighbors_for_shape(shape, chosen_type, range);
    }

    fn get_neighbors_for_shape(shape: &str, chosen_type: &str, range: i32) -> Vec<Vec<(i32,i32,i32)>> {
        match shape {
            "hexagon" => vec![Self::get_hexagon_neighborhood(chosen_type, range)],
            "square" => vec![Self::get_square_neighborhood(chosen_type, range)],
            "rhombus" => Self::get_rhombus_neighborhood(chosen_type),
            "triangle" => Self::get_triangle_neighborhood(chosen_type, range),
            _ => vec![vec![(0, 0, 0)]],
        }
    }

    fn get_square_neighborhood(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        let mut neigh = Vec::new();

        match chosen_type {
            "vonNeumann" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        // L1 distance check
                        if (dx.abs() + dy.abs()) <= range {
                            // optionally exclude the center if you want
                            if dx != 0 || dy != 0 {
                                neigh.push((dx, dy, 0));
                            }
                        }
                    }
                }
            }

            "checkerboard" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        // Check parity to alternate like a chessboard
                        if (dx + dy) % 2 != 0 {  // only even-sum cells
                            if dx != 0 || dy != 0 {
                                neigh.push((dx, dy, 0));
                            }
                        }
                    }
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
                for d in -range..=range {
                    neigh.push((0,  d, 0)); neigh.push((d, 0, 0));
                }
            }
        }

        neigh
    }

    fn get_hexagon_neighborhood(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        let mut neigh: Vec<(i32, i32, i32)> = Vec::new();
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

    fn get_triangle_neighborhood(chosen_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
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

            // NEED TO FIX MOORE NEIGHBORHOOD FOR TRIANGULAR CELLS
            "moore0" => vec![
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

            "moore" => {
                let mut layers: Vec<Vec<(i32,i32,i32)>> = Vec::new();


                let mut upper = Vec::new();
                for dq in -range..=range {
                    for dr in -range..=range {
                        upper.push((dq, dr,  0)); // upwards triangle
                        upper.push((dq, dr,  1)); // downwards triangle

                    }
                }
                layers.push(upper);

                let mut lower = Vec::new();
                for dq in -range..=range {
                    for dr in -range..=range {
                        lower.push((dq, dr, -1)); // upwards triangle
                        lower.push((dq, dr, 0)); // downwards triangle
                    }
                }
                layers.push(lower);

                layers
            }

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

