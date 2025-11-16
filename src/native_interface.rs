use crate::CellManager;

/// Runs a naive/native test sequence for the current CellManager
pub fn run_native_tests() {
    println!("=== Running Naive CellManager Tests ===\n");

    // 1️⃣ Create a small manager
    let mut cm = CellManager::new(10, 10, 1, None);
    println!("Initial bounds: {:?}", cm.get_bounds());

    // 2️⃣ Print all active cells (none initially)
    let cells = cm.for_each_cell();
    println!("Active cells initially: {}", cells.len() / 4);
    for chunk in cells.chunks(4) {
        print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    }
    println!("\n");

    // 3️⃣ Randomize some cells
    cm.random_cells();
    let cells = cm.for_each_cell();
    println!("After random fill:");
    println!("Active cells: {}", cells.len() / 4);
    for chunk in cells.chunks(4) {
        print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    }
    println!("\n");

    // 4️⃣ Resize to a larger grid
    println!("--- Resizing grid to 20x20 ---");
    cm.resize(20, 20, 1);
    println!("New bounds: {:?}", cm.get_bounds());

    // 5️⃣ Show all cells after resize
    let cells = cm.for_each_cell();
    println!("Cells after resize: {}", cells.len() / 4);
    for chunk in cells.chunks(4) {
        print!("({},{},{},{}) ", chunk[0], chunk[1], chunk[2], chunk[3]);
    }
    println!("\n");

    // 6️⃣ Count live neighbors of a random cell
    let q = 0;
    let r = 0;
    let s = 0;
    let neighbors = cm.count_live_neighbors(q, r, s);
    println!("Live neighbors of ({},{},{}) = {}", q, r, s, neighbors);

    // 7️⃣ Flood fill from live cells
    cm.floodfill();
    let cells = cm.for_each_cell();
    println!("Cells after floodfill: {}", cells.len() / 4);

    // 8️⃣ Clear everything
    cm.clear();
    cm.random_cells();
    println!("Cleared all cells. Random Func. cActive cells: {}", cm.for_each_cell().len() / 4);

    // 9️⃣ Change grid properties
    cm.change_grid_properties("hex".to_string(), "hex".to_string(), 1, "torus".to_string());
    println!(
        "Changed grid: shape={}, neighbors={}, range={}, topology={}",
        cm.config.shape, cm.config.neighbor_type, cm.config.range, cm.config.topology_type
    );

    println!("\n=== Naive Tests Completed ===");
}
