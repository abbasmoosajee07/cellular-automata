pub struct Stopwatch {
    pub timestamp: f64
}

#[cfg(target_arch = "wasm32")]
fn get_timestamp() -> f64 {
    web_sys::window()
        .expect("no window")
        .performance()
        .expect("no performance")
        .now()  // returns f64 with sub-ms precision
}

#[cfg(not(target_arch = "wasm32"))]
fn get_timestamp() -> f64 {
    use std::time::Instant;
    thread_local! {
        static ORIGIN: Instant = Instant::now();
    }
    ORIGIN.with(|o| o.elapsed().as_secs_f64() * 1000.0)
}

impl Stopwatch {
    pub fn start() -> Self {
        Self {
            timestamp: get_timestamp(),
        }
    }

    pub fn stamp(&mut self) {
        self.timestamp = get_timestamp();
    }

    pub fn elapsed_ms(&mut self) -> f64 {
        let dt: f64 = get_timestamp() - self.timestamp;
        dt
    }
}
