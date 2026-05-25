
use crate::Engine;

/// Runs a native test of a single Game of Life step
pub fn run_native_tests() {
    println!("=== Running Naive Game of Life Test ===\n");

    // 1 Create a ca engine
    let use_pattern = true;

    let mut cm = if use_pattern {
        let cm = Engine::read_file("patterns/base.cells").unwrap();
        let print_cfg =  serde_json::to_string(&cm.storage).unwrap();
        println!("Just Uploaded: {}\n", print_cfg);
        cm
    } else {
        let mut cm = Engine::new("square".to_string(), 250, 250);
        // Randomize cells (TIMED)
        cm.random_cells();
        println!("Random fill time: {:?}", cm.automata.dt_rs);
        cm
    };
    // cm.resize(10, 10);
    cm.change_grid_properties(
        "square".to_string(),
        "moore".to_string(),
        1,
        "infinite".to_string()
    );

    println!("Native Print: {:?}\n", cm.mesh.config);

    // let cells = cm.mesh.count_live_cells();
    println!("Initial active cell count: {}", cm.automata.live);

    // Run one step of Game of Life (TIMED)
    println!("--- Running one GoL step ---");
    cm.step_game_of_life();

    // Show the new set of live cells
    println!("Cells after GoL step: {}", cm.automata.live);
    println!("GoL step time: {:?}", cm.automata.dt_rs);
    println!("=== GoL Test Completed ===\n");

    println!("Post GOL: {:?}\n", cm.mesh.config);

    cm.update_storage();
    // cm.snap_pattern();
    println!("Pattern Text:\n{}", cm.pattern_text());

}
