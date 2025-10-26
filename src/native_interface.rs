use crate::cell_manager::cellmanager::CellManager;


/// Runs a sequence of native tests for CellManager implementations
/// (both Flat and Chunked if the threshold is crossed)
pub fn run_native_tests() {
    println!("=== Running Native CellManager Tests ===\n");

    // 1️⃣ Create initial small manager (Flat backend)
    let mut cm = CellManager::new(20, 20, 1, None);
    println!("Initial bounds: {:?}", cm.get_bounds());

    // 2️⃣ Create boundary walls
    // cm.create_boundary();
    // println!("Boundary created (small grid):");
    // for chunk in cm.for_each_cell().chunks(4) {
    //     print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    // }
    println!("\nTotal active cells: {}", cm.for_each_cell().len() / 4);

    // 3️⃣ Randomize some cells
    cm.random_cells();
    println!("Added random cells (density 0.42):");
    println!("\nTotal active cells: {}", cm.for_each_cell().len() / 4);
    // for chunk in cm.for_each_cell().chunks(4) {
    //     print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    // }
    // println!("\n");

    // 4️⃣ Resize to larger dimensions → should switch backend if above threshold
    println!("--- Resizing to larger grid ---");
    cm.resize(30, 30, 1);
    println!("New bounds after resize: {:?}", cm.get_bounds());

    // 5️⃣ Recreate boundary
    // cm.create_boundary();
    // println!("Boundary recreated after resize:");
    // for chunk in cm.for_each_cell().chunks(4) {
    //     print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    // }
    // println!("\n");

    // 6️⃣ Verify live neighbor count for a random cell
    let test_q = 0;
    let test_r = 0;
    let test_s = 0;
    let live_neighbors = cm.count_live_neighbors(test_q, test_r, test_s);
    println!(
        "Live neighbors around ({},{},{}) = {}\n",
        test_q, test_r, test_s, live_neighbors
    );

    // 7️⃣ Clear everything
    cm.clear();
    println!("Cleared all cells. Active cell count: {}", cm.for_each_cell().len() / 4);

    println!("\n=== Native Tests Completed ===");
}
