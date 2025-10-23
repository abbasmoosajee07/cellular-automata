use crate::core::CellManager;

pub fn run_native_test() {
    let mut cm = CellManager::new(10, 10, 3, None);

    cm.set_cell(1, 1, 1, 1);
    cm.set_cell(2, 2, 1, 1);
    cm.set_cell(3, 3, 1, 1);

    println!("Live neighbors around (2,2,1): {}", cm.count_live_neighbors(2, 2, 1));

    println!("All nonzero cells:");
    for chunk in cm.for_each_cell().chunks(4) {
        println!("q={} r={} s={} val={}", chunk[0], chunk[1], chunk[2], chunk[3]);
    }
}
