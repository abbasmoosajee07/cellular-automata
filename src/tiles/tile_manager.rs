// Shape properties reference:
//   square:   splits=1, neighborhoods=["moore", "vonNeumann", "cross", "checkerboard", "star"]
//   hexagon:  splits=1, neighborhoods=["hexagonal", "tripod", "asterix"]
//   rhombus:  splits=3, neighborhoods=["Qbert"]
//   triangle: splits=2, neighborhoods=["vonNeumann", "biohazard", "inner", "vertices", "moore"]

use crate::tiles::{Square, Hexagon, Triangle, Rhomboidal};

fn shape_splits(shape: &str) -> usize {
    match shape {
        "rhombus"  => Rhomboidal::get_splits(),
        "triangle" => Triangle::get_splits(),
        "hexagon"  => Hexagon::get_splits(),
        "square"   => Square::get_splits(),
        _          => 0,
    }
}

/// Owns all per-shape knowledge: tile splits, neighborhood type, and the
/// precomputed per-sublayer offset tables used by the simulation loop.
#[derive(Clone, Debug)]
pub struct TileManager {
    pub shape:         String,
    pub splits:        usize,
    pub neighbor_type: String,
    pub range:         i32,
    /// One entry per sublayer (length == `splits`).
    /// Single-sublayer shapes always have length 1.
    pub offsets:       Vec<Vec<(i32, i32, i32)>>,
}

impl TileManager {
    /// Bare constructor — call `set_neighborhood` before using offsets.
    pub fn new(shape: String) -> Self {
        let splits = shape_splits(&shape);
        Self {
            splits,
            offsets: vec![vec![]; splits],
            shape,
            neighbor_type: String::new(),
            range: 1,
        }
    }

    /// Build a fully configured TileManager in one call.
    pub fn configure(shape: String, neighbor_type: String, range: i32) -> Self {
        let splits  = shape_splits(&shape);
        let offsets = Self::build_offsets(&shape, &neighbor_type, range);
        Self { shape, splits, neighbor_type, range, offsets }
    }

    /// Update neighborhood settings in place and recompute offsets.
    pub fn set_neighborhood(&mut self, neighbor_type: &str, range: i32) {
        self.neighbor_type = neighbor_type.to_string();
        self.range         = range;
        self.offsets       = Self::build_offsets(&self.shape, neighbor_type, range);
    }

    /// Return the offset slice for a given sublayer index (`s` coordinate).
    pub fn neighbor_offsets(&self, s: i32) -> &[(i32, i32, i32)] {
        let idx = if self.offsets.len() == 1 { 0 } else { s as usize };
        &self.offsets[idx]
    }

    /// Resolve absolute neighbors of (q, r, s) without topology clamping.
    pub fn raw_neighbors(&self, q: i32, r: i32, s: i32) -> Vec<(i32, i32, i32)> {
        self.neighbor_offsets(s)
            .iter()
            .map(|&(dq, dr, ds)| (q + dq, r + dr, s + ds))
            .collect()
    }

    fn build_offsets(shape: &str, neighbor_type: &str, range: i32) -> Vec<Vec<(i32, i32, i32)>> {
        match shape {
            "square"   => Square::build_offsets(neighbor_type, range),
            "hexagon"  => Hexagon::build_offsets(neighbor_type, range),
            "triangle" => Triangle::build_offsets(neighbor_type, range),
            "rhombus"  => Rhomboidal::build_offsets(neighbor_type, range),
            _          => vec![vec![(0, 0, 0)]],
        }
    }
}