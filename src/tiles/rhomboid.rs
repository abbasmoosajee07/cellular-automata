pub struct Rhomboidal {
    
}
impl Rhomboidal {
    pub fn get_splits() -> usize {
        3
    }

    pub fn build_offsets(neighbor_type: &str, _range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        Self::get_offsets(neighbor_type)
    }

    fn get_offsets(chosen_type: &str) -> Vec<Vec<(i32, i32, i32)>> {
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