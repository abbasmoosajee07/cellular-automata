use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PatternConfig {
    pub name: String,
    pub format: String,

    pub comments: Vec<String>,

    // source representation (optional, but useful)
    pub cells: Vec<String>,

    // canonical sparse representation
    pub alive: Vec<(i32, i32, i32, u32)>,

    // intrinsic
    pub grid_size: [i32; 3],
    pub top_left: [i32; 3],

    // behavioral intent
    pub shape: String,
    pub neighbor_type: String,
    pub range: i32,
    pub topology_type: String,
    pub rule: String,
}

impl Default for PatternConfig {
    fn default() -> Self {
        Self {
            name: "test".to_string(),
            format: "cells".to_string(),

            comments: Vec::new(),
            cells: Vec::new(),
            alive: Vec::new(),

            grid_size: [0, 0, 1],
            top_left: [0, 0, 0],

            shape: "square".to_string(),
            neighbor_type: "moore".to_string(),
            range: 1,
            topology_type: "finite".to_string(),
            rule: "B3/S23".to_string(),
        }
    }
}
