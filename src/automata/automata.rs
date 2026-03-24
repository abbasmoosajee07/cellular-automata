use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Automata {
    pub live: i32,
    pub gen_no: i32,
    pub total: i32,
}