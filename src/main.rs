
#[cfg(not(target_arch = "wasm32"))]
fn main() {
    cellular_automata::native_interface::run_native_tests();
}

