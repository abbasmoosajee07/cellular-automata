pub struct Hexagon {
    
}
impl Hexagon {
    pub fn get_splits() -> usize {
        1
    }

    pub fn valid_neighborhoods() -> Vec<&'static str> {
        vec!["hexagonal", "tripod", "asterix"]
    }

    pub fn build_offsets(neighbor_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        vec![Self::get_offsets(neighbor_type, range)]
    }

    fn get_offsets(chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
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

}