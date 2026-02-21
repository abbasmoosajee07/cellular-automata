// shapeProps = {
//     square: [1, ["moore", "vonNeumann", "cross", "checkerboard", "star"]],
//     hexagon: [1, ["hexagonal", "tripod", "asterix"]],
//     rhombus: [3, ["Qbert"]],
//     triangle: [2, ["vonNeumann", "biohazard", "inner", "vertices", "moore"]],
// };

fn shape_splits(shape: &str) -> usize {
    match shape {
        "square" => 1,
        "hexagon" => 1,
        "rhombus" => 3,
        "triangle" => 2,
        _ => 1, // default
    }
}

#[derive(Clone, Debug)]
pub struct TileManager {
    pub shape: String,
    pub splits: usize,
}

impl TileManager {
    pub fn new(shape: String) -> Self {
        let splits = shape_splits(&shape);

        Self { shape, splits}
    }
}

