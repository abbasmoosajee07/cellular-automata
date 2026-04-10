use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Automata {
    pub live: i32,
    pub gen_no: i32,
    pub total: i32,
    pub density: f32,
}

impl Default for Automata {
    fn default() -> Self {
        Self {
            live:0,
            gen_no: 0,
            total: 0,
            density: 0.0,
        }
    }
}