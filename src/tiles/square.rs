pub struct Square {

}
impl Square {
    pub fn get_splits() -> usize {
        1
    }

    pub fn valid_neighborhoods() -> Vec<&'static str> {
        vec!["moore", "vonNeumann", "cross", "checkerboard", "star"]
    }

    pub fn build_offsets(neighbor_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        vec![Self::get_offsets(neighbor_type, range)]
    }

    fn get_offsets(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
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

}