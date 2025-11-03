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
    pub adj_neighbors: Vec<(i32, i32, i32)>,
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

    pub fn switch_neighbors(&mut self, shape: &str, chosen_type: &str, range: i32) {
        self.adj_neighbors = Self::get_neighbors_for_shape(shape, chosen_type, range);
        self.shape = shape.to_string();
        self.chosen_type = chosen_type.to_string();
        self.range = range;
    }

    fn get_neighbors_for_shape(shape: &str, chosen_type: &str, range: i32) -> Vec<(i32, i32, i32)> {
        match shape {
            "square" => Self::get_square_neighborhood(chosen_type, range),
            "hexagon" => Self::get_hexagon_neighborhood(chosen_type, range),
            "rhombus" => Self::get_rhombus_neighborhood(chosen_type, range),
            "triangle" => Self::get_triangle_neighborhood(chosen_type, range),
            _ => vec![
                (0, -1, 0), (0, 1, 0), (1, 0, 0), (-1, 0, 0),
            ],
        }
    }

    pub fn get_square_neighborhood(chosen_type: &str, _range: i32) -> Vec<(i32, i32, i32)> {
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

    pub fn get_hexagon_neighborhood(chosen_type: &str, _range: i32) -> Vec<(i32, i32, i32)> {
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

    pub fn get_triangle_neighborhood(chosen_type: &str, _range: i32) -> Vec<(i32, i32, i32)> {
        match chosen_type {
            "vonNeumann" => vec![
                // (-1, 1, 1), (0, -1, 0), (1, 0, 0),
                (0, 0, 1), (0, 1, 1), (-1, 0, 1)
            ],
            "biohazard" => vec![
                (0, -1, 0), (1, 0, 0), (1, 1, 0),
                (0, 0, 1), (0, 1, 1), (-1, 0, 1),
                (0, 1, 0), (-1, 0, 0), (-1, -1, 0),
            ],
            "inner" => vec![
                (-1, 1, 1), (1, 1, 1), (-1, -1, 1),
                (0, 0, 1), (0, 1, 1), (-1, 0, 1),
            ],
            "vertices" => vec![
                (-1, 1, 1), (0, -1, 0), (1, 0, 0),
                (1, 1, 0),  (1, 1, 1),  (0, 1, 0),
                (-1, 0, 0), (-1, -1, 0), (-1, -1, 1)
            ],
            "moore" => vec![
                (-1, 1, 1), (0, -1, 0), (1, 0, 0),
                (0, 0, 1), (0, 1, 1), (-1, 0, 1),
                (1, 1, 0), (1, 1, 1), (0, 1, 0),
                (-1, 0, 0), (-1, -1, 0), (-1, -1, 1)
            ],
            _ => vec![
                (0, 0, 0),
            ],
        }
    }

    pub fn get_rhombus_neighborhood(chosen_type: &str, _range: i32) -> Vec<(i32, i32, i32)> {
        match chosen_type {
            "Qbert" => vec![
                (0, 0, 2), (1, 0, 2), (1, 0, 1), (0, 0, 1),
                (1, -1, 0), (1, -1, 1), (-1, 1, 2), (0, 1, 2),
                (-1, 1, 0), (0, 1, 1),
            ],
            _ => vec![
                (0, 0, 0),
            ],
        }
    }
}

