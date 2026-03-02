// Shape properties reference:
//   square:   splits=1, neighborhoods=["moore", "vonNeumann", "cross", "checkerboard", "star"]
//   hexagon:  splits=1, neighborhoods=["hexagonal", "tripod", "asterix"]
//   rhombus:  splits=3, neighborhoods=["Qbert"]
//   triangle: splits=2, neighborhoods=["vonNeumann", "biohazard", "inner", "vertices", "moore"]

use crate::tiles::{Hexagon, Rhomboidal, Square, Triangle};

#[derive(Clone, Debug)]
enum Shape {
    Square,
    Hexagon,
    Rhombus,
    Triangle,
}

impl Shape {
    fn from_str(s: &str) -> Option<Self> {
        match s {
            "square"   => Some(Self::Square),
            "hexagon"  => Some(Self::Hexagon),
            "rhombus"  => Some(Self::Rhombus),
            "triangle" => Some(Self::Triangle),
            _          => None,
        }
    }

    fn splits(&self) -> usize {
        match self {
            Self::Square   => Square::get_splits(),
            Self::Hexagon  => Hexagon::get_splits(),
            Self::Rhombus  => Rhomboidal::get_splits(),
            Self::Triangle => Triangle::get_splits(),
        }
    }

    fn build_offsets(&self, neighbor_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        match self {
            Self::Square   => Square::build_offsets(neighbor_type, range),
            Self::Hexagon  => Hexagon::build_offsets(neighbor_type, range),
            Self::Rhombus  => Rhomboidal::build_offsets(neighbor_type, range),
            Self::Triangle => Triangle::build_offsets(neighbor_type, range),
        }
    }
}

/// Owns all per-shape knowledge: tile splits, neighborhood type, and the
/// precomputed per-sublayer offset tables used by the simulation loop.
#[derive(Clone, Debug)]
pub struct TileManager {
    pub shape: String,
    pub splits: usize,
    pub neighbor_type: String,
    pub range: i32,
    /// One entry per sublayer (length == `splits`).
    /// Single-sublayer shapes always have length 1.
    pub offsets: Vec<Vec<(i32, i32, i32)>>,
}

impl TileManager {
    /// Bare constructor — call `set_neighborhood` before using offsets.
    pub fn new(shape: String) -> Self {
        let tile = Shape::from_str(&shape);
        let splits = tile.as_ref().map_or(0, Shape::splits);
        Self {
            shape,
            splits,
            neighbor_type: String::new(),
            range: 1,
            offsets: vec![vec![]; splits],
        }
    }

    /// Build a fully configured `TileManager` in one call.
    pub fn configure(shape: String, neighbor_type: String, range: i32) -> Self {
        let tile = Shape::from_str(&shape);
        let splits = tile.as_ref().map_or(0, Shape::splits);
        let offsets = tile.map_or_else(
            || vec![vec![(0, 0, 0)]],
            |t| t.build_offsets(&neighbor_type, range),
        );
        Self { shape, splits, neighbor_type, range, offsets }
    }

    /// Update neighborhood settings in place and recompute offsets.
    pub fn set_neighborhood(&mut self, neighbor_type: &str, range: i32) {
        self.neighbor_type = neighbor_type.to_string();
        self.range = range;
        self.offsets = Shape::from_str(&self.shape)
            .map_or_else(|| vec![vec![(0, 0, 0)]], |t| t.build_offsets(neighbor_type, range));
    }

    /// Return the offset slice for a given sublayer index (`s` coordinate).
    pub fn neighbor_offsets(&self, s: i32) -> &[(i32, i32, i32)] {
        let idx = if self.offsets.len() == 1 { 0 } else { s as usize };
        &self.offsets[idx]
    }

    /// Resolve absolute neighbors of `(q, r, s)` without topology clamping.
    pub fn raw_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<(i32, i32, i32)> {
        self.neighbor_offsets(s)
            .iter()
            .map(|&(dq, dr, ds)| (q + dq, r + dr, s + ds))
            .collect()
    }
}