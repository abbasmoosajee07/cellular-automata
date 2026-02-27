pub struct Triangle {
    
}
impl Triangle {
    pub fn get_splits() -> usize {
        2
    }

    pub fn build_offsets(neighbor_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        Self::get_offsets(neighbor_type, range)
    }

    fn get_offsets(chosen_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
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

}