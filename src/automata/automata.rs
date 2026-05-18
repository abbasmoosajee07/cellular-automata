use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Automata {
    pub ticks: i32,
    pub live: i32,
    pub total: i32,
    pub births: i32,
    pub deaths: i32,
    pub density: f32,
    pub tick_time_ms: f64,
    pub mutation_rate: f32,
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
            tick_time_ms: 0.0,
            mutation_rate: 0.0,
        }
    }
}