// Shape properties reference:
//   square:   splits=1, neighborhoods=["moore", "vonNeumann", "cross", "checkerboard", "star"]
//   hexagon:  splits=1, neighborhoods=["hexagonal", "tripod", "asterix"]
//   rhombus:  splits=3, neighborhoods=["Qbert"]
//   triangle: splits=2, neighborhoods=["vonNeumann", "biohazard", "inner", "vertices", "moore"]

fn shape_splits(shape: &str) -> usize {
    match shape {
        "rhombus"  => 3,
        "triangle" => 2,
        "hexagon"  => 1,
        "square"   => 1,
        _          => 1,
    }
}

/// Owns all per-shape knowledge: tile splits, neighborhood type, and the
/// precomputed per-sublayer offset tables used by the simulation loop.
#[derive(Clone, Debug)]
pub struct TileManager {
    pub shape:         String,
    pub splits:        usize,
    pub neighbor_type: String,
    pub range:         i32,
    /// One entry per sublayer (length == `splits`).
    /// Single-sublayer shapes always have length 1.
    pub offsets:       Vec<Vec<(i32, i32, i32)>>,
}

impl TileManager {
    /// Bare constructor — call `set_neighborhood` before using offsets.
    pub fn new(shape: String) -> Self {
        let splits = shape_splits(&shape);
        Self {
            splits,
            offsets: vec![vec![]; splits],
            shape,
            neighbor_type: String::new(),
            range: 1,
        }
    }

    /// Build a fully configured TileManager in one call.
    pub fn configure(shape: String, neighbor_type: String, range: i32) -> Self {
        let splits  = shape_splits(&shape);
        let offsets = Self::build_offsets(&shape, &neighbor_type, range);
        Self { shape, splits, neighbor_type, range, offsets }
    }

    /// Update neighborhood settings in place and recompute offsets.
    pub fn set_neighborhood(&mut self, neighbor_type: &str, range: i32) {
        self.neighbor_type = neighbor_type.to_string();
        self.range         = range;
        self.offsets       = Self::build_offsets(&self.shape, neighbor_type, range);
    }

    /// Return the offset slice for a given sublayer index (`s` coordinate).
    pub fn neighbor_offsets(&self, s: i32) -> &[(i32, i32, i32)] {
        let idx = if self.offsets.len() == 1 { 0 } else { s as usize };
        &self.offsets[idx]
    }

    /// Resolve absolute neighbors of (q, r, s) without topology clamping.
    pub fn raw_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<(i32, i32, i32)> {
        self.neighbor_offsets(s)
            .iter()
            .map(|&(dq, dr, ds)| (q + dq, r + dr, s + ds))
            .collect()
    }

    // -----------------------------------------------------------------------
    // Private offset builders
    // -----------------------------------------------------------------------

    fn build_offsets(shape: &str, neighbor_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        match shape {
            "square"   => vec![Self::square_offsets(neighbor_type, range)],
            "hexagon"  => vec![Self::hexagon_offsets(neighbor_type, range)],
            "triangle" => Self::triangle_offsets(neighbor_type, range),
            "rhombus"  => Self::rhombus_offsets(neighbor_type),
            _          => vec![vec![(0, 0, 0)]],
        }
    }

    fn square_offsets(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        let mut n = Vec::new();
        match chosen_type {
            "vonNeumann" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        if (dx.abs() + dy.abs()) <= range && (dx != 0 || dy != 0) {
                            n.push((dx, dy, 0));
                        }
                    }
                }
            }
            "checkerboard" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        if (dx + dy) % 2 != 0 && (dx != 0 || dy != 0) {
                            n.push((dx, dy, 0));
                        }
                    }
                }
            }
            "cross" => {
                for d in 1..=range {
                    n.push(( d, 0, 0)); n.push((-d, 0, 0));
                    n.push(( 0, d, 0)); n.push(( 0,-d, 0));
                }
            }
            "moore" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        if dx != 0 || dy != 0 { n.push((dx, dy, 0)); }
                    }
                }
            }
            "star" => {
                for d in 1..=range {
                    n.push(( d,  0, 0)); n.push((-d,  0, 0));
                    n.push(( 0,  d, 0)); n.push(( 0, -d, 0));
                    n.push(( d,  d, 0)); n.push(( d, -d, 0));
                    n.push((-d,  d, 0)); n.push((-d, -d, 0));
                }
            }
            _ => {
                for d in -range..=range {
                    n.push((0, d, 0));
                    n.push((d, 0, 0));
                }
            }
        }
        n
    }

    fn hexagon_offsets(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        let mut n: Vec<(i32, i32, i32)> = Vec::new();
        match chosen_type {
            "tripod" => {
                for d in 1..=range {
                    n.push(( d,  0, 0));
                    n.push(( 0, -d, 0));
                    n.push((-d,  d, 0));
                }
            }
            "asterix" => {
                for d in 1..=range {
                    n.push((-d,  d, 0)); n.push(( d, -d, 0));
                    n.push(( d,  0, 0)); n.push((-d,  0, 0));
                    n.push(( 0,  d, 0)); n.push(( 0, -d, 0));
                }
            }
            "hexagonal0" => {
                for d in -range..=range {
                    n.push((-d,  d, 0));
                    n.push(( d,  0, 0));
                    n.push(( 0,  d, 0));
                }
            }
            "hexagonal" => {
                for dx in -range..=range {
                    for dy in -range..=range {
                        if dx != 0 || dy != 0 || dx.abs() != dy.abs() {
                            n.push((dx, dy, 0));
                        }
                    }
                }
            }
            _ => { n.push((0, 1, 0)); }
        }
        n
    }

    fn triangle_offsets(chosen_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        match chosen_type {
            "vonNeumann" => vec![
                vec![(0, 0, 1), (0, 1, 1), (-1, 0, 1)],
                vec![(0, 0, -1), (0, -1, -1), (1, 0, -1)],
            ],
            "biohazard" => vec![
                vec![
                    (0, -1, 0), (1, 0, 0),  (1, 1, 0),
                    (0, 0, 1),  (0, 1, 1),  (-1, 0, 1),
                    (0, 1, 0),  (-1, 0, 0), (-1, -1, 0),
                ],
                vec![
                    (0, -1, 0), (1, 0, 0),  (1, 1, 0),
                    (0, 1, 0),  (-1, 0, 0), (-1, -1, 0),
                    (0, 0, -1), (0, -1, -1), (1, 0, -1),
                ],
            ],
            "inner" => vec![
                vec![
                    (-1, 1, 1), (1, 1, 1),  (-1, -1, 1),
                    (0, 0, 1),  (0, 1, 1),  (-1, 0, 1),
                ],
                vec![
                    (0, 0, -1),  (0, -1, -1),  (1, 0, -1),
                    (1, 1, -1),  (-1, -1, -1), (1, -1, -1),
                ],
            ],
            "vertices" => vec![
                vec![
                    (-1, 1, 1),  (0, -1, 0),  (1, 0, 0),
                    (1, 1, 0),   (1, 1, 1),   (0, 1, 0),
                    (-1, 0, 0),  (-1, -1, 0), (-1, -1, 1),
                ],
                vec![
                    (0, -1, 0),  (1, 0, 0),    (1, 1, 0),
                    (0, 1, 0),   (-1, 0, 0),   (-1, -1, 0),
                    (1, 1, -1),  (-1, -1, -1), (1, -1, -1),
                ],
            ],
            // fix Moore neighborhood for triangular cells
            "moore" => vec![
                vec![
                    (-1, 1, 1),  (0, -1, 0),  (1, 0, 0),
                    (0, 0, 1),   (0, 1, 1),   (-1, 0, 1),
                    (1, 1, 0),   (1, 1, 1),   (0, 1, 0),
                    (-1, 0, 0),  (-1, -1, 0), (-1, -1, 1),
                ],
                vec![
                    (0, -1, 0),  (1, 0, 0),    (1, 1, 0),
                    (0, 1, 0),   (-1, 0, 0),   (-1, -1, 0),
                    (0, 0, -1),  (0, -1, -1),  (1, 0, -1),
                    (1, 1, -1),  (-1, -1, -1), (1, -1, -1),
                ],
            ],
            "moore1" => {
                let upper = (-range..=range)
                    .flat_map(|dq| (-range..=range).flat_map(move |dr| {
                        [(dq, dr, 0), (dq, dr, 1)]
                    }))
                    .collect();
                let lower = (-range..=range)
                    .flat_map(|dq| (-range..=range).flat_map(move |dr| {
                        [(dq, dr, -1), (dq, dr, 0)]
                    }))
                    .collect();
                vec![upper, lower]
            }
            _ => vec![vec![(0, 0, 0)]],
        }
    }

    fn rhombus_offsets(chosen_type: &str) -> Vec<Vec<(i32, i32, i32)>> {
        match chosen_type {
            "Qbert" => vec![
                vec![
                    (0, 0, 2),  (1, 0, 2),  (-1, 1, 2), (0, 1, 2),
                    (1, 0, 1),  (0, 0, 1),  (1, -1, 1), (0, 1, 1),
                    (1, -1, 0), (-1, 1, 0),
                ],
                vec![
                    (0, 0, -1),  (0, 0, 1),  (-1, 1, 1),  (-1, 0, -1),
                    (0, -1, -1), (0, -1, 0), (-1, 0, 1),  (0, 1, 0),
                    (-1, 1, -1), (0, 1, 1),
                ],
                vec![
                    (0, 0, -1),  (0, 0, -2),  (0, -1, -2), (1, -1, -1),
                    (0, -1, -1), (-1, 0, 0),  (-1, 0, -2),
                    (1, -1, -2), (1, 0, 0),   (1, 0, -1),
                ],
            ],
            _ => vec![vec![(0, 0, 0)]],
        }
    }
}