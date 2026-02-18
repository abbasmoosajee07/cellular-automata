
use crate::Engine;
use std::time::Instant;

/// Runs a native test of a single Game of Life step
pub fn run_native_tests() {
    println!("=== Running Naive Game of Life Test ===\n");

    // 1 Create a ca engine
    let use_pattern = true;

    let mut cm = if use_pattern {
        let cm = Engine::read_file("patterns/glider.cells").unwrap();
        let print_cfg =  serde_json::to_string(&cm.storage).unwrap();
        println!("Just Uploaded: {}\n", print_cfg);
        cm
    } else {
        let mut cm = Engine::new(250, 250, 1);
        // Randomize cells (TIMED)
        let start_rand = Instant::now();
        cm.mesh.random_cells();
        let rand_elapsed = start_rand.elapsed();
        println!("Random fill time: {:?}", rand_elapsed);
        cm
    };
    cm.mesh.resize(10, 10, 1);

    cm.mesh.change_grid_properties(
        "square".to_string(),
        "moore".to_string(),
        1,
        "infinite".to_string()
    );

    println!("Native Print: {:?}\n", cm.mesh.config);

    let cells = cm.mesh.each_live_cell();
    println!("Initial active cell count: {}", cells.len() / 4);

    // Run one step of Game of Life (TIMED)
    println!("--- Running one GoL step ---");
    let start_step = Instant::now();
    cm.step_game_of_life();
    let step_elapsed = start_step.elapsed();

    // Show the new set of live cells
    let cells_after = cm.mesh.each_live_cell();
    println!("Cells after GoL step: {}", cells_after.len() / 4);
    println!("GoL step time: {:?}", step_elapsed);
    println!("=== GoL Test Completed ===\n");

    println!("Post GOL: {:?}\n", cm.mesh.config);

    cm.update_storage();
    // cm.snap_pattern();
    println!("Pattern Text:\n{}", cm.pattern_text());

}
