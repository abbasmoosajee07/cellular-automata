
use crate::Engine;
// use std::time::Instant;

/// Runs a native test of a single Game of Life step
pub fn run_native_tests() {
    println!("=== Running Naive Game of Life Test ===\n");

    // 1️⃣ Create a test mesh
    let mut cm = Engine::new(20, 20, 1, None);
    cm.mesh.resize(2000, 2000, 1);
    // println!("{:?}\n", cm.mesh.config);

    // // 2️⃣ Randomize cells (TIMED)
    // let start_rand = Instant::now();
    // cm.mesh.random_cells();
    // let rand_elapsed = start_rand.elapsed();

    // let cells = cm.mesh.each_live_cell();
    // println!("Initial active cell count: {}", cells.len() / 4);
    // println!("Random fill time: {:?}", rand_elapsed);

    // // 3️⃣ Run one step of Game of Life (TIMED)
    // println!("--- Running one GoL step ---");
    // let start_step = Instant::now();
    // cm.step_game_of_life();
    // let step_elapsed = start_step.elapsed();

    // // 4️⃣ Show the new set of live cells
    // let cells_after = cm.mesh.each_live_cell();
    // println!("Cells after GoL step: {}", cells_after.len() / 4);
    // println!("GoL step time: {:?}", step_elapsed);

    // println!("=== GoL Test Completed ===");

    let _test = cm.test_pattern();

}
