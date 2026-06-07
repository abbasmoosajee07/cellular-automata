use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Automata {
    pub ticks: i32,
    pub live: i32,
    pub total: i32,
    pub births: i32,
    pub deaths: i32,
    pub density: f32,
    pub dt_rs: f64,
    pub mutation: f32,
    pub activity: f32,
}

impl Default for Automata {
    fn default() -> Self {
        Self {
            ticks: 0,
            live:0,
            total: 0,
            births: 0,
            deaths: 0,
            density: 0.0,
            dt_rs: 0.0,
            mutation: 0.0,
            activity: 0.0,
        }
    }
}