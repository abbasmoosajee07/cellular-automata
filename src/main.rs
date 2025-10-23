#[cfg(not(target_arch = "wasm32"))]
fn main() {
    cell_manager::native_interface::run_native_test();
}

