use crate::CellMesh;

/// Runs a native test of a single Game of Life step
pub fn run_native_tests() {
    println!("=== Running Naive Game of Life Test ===\n");

    // 1️⃣ Create a test mesh
    let mut cm = CellMesh::new(20, 20, 1, None);
    println!("Initial bounds: {:?}", cm.get_bounds());
    println!("{:?}", cm.config);

    // 2️⃣ Randomize cells so we have something to evolve
    cm.random_cells();
    let cells = cm.each_live_cell();
    println!("Initial active cell count: {}", cells.len() / 4);

    // print!("Initial live cells: ");
    // for chunk in cells.chunks(4) {
    //     print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    // }
    // println!("\n");

    // 3️⃣ Run one step of Game of Life
    println!("--- Running one GoL step ---");
    cm.step_game_of_life();

    // 4️⃣ Show the new set of live cells
    let cells_after = cm.each_live_cell();
    println!("Cells after GoL step: {}", cells_after.len() / 4);

    // print!("Updated live cells: ");
    // for chunk in cells_after.chunks(4) {
    //     print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    // }
    // println!("\n");

    println!("=== GoL Test Completed ===");
}
