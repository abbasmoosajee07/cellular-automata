#[derive(Clone, Copy)]
pub enum TopologyType {
    Torus,
    Finite,
    Infinite,
    Cylinder,
    Klein,
    CrossSurface,
    Sphere
}

pub struct Topology {
    pub bounds: [i32; 6],
    pub topology_str: String,
    pub topology_type: TopologyType,
}

impl Topology {
    pub fn new(topology_str: &str, bounds: [i32; 6]) -> Self {
        let tp = match topology_str {
            "finite" => TopologyType::Finite,
            _ => TopologyType::Finite,
        };

        Self {
            bounds: bounds,
            topology_type: tp,
            topology_str: topology_str.to_string(),
        }
    }

    pub fn change_topology(&mut self, topology_str: &str) {
        self.topology_str = self.topology_str.to_string();
        self.topology_type = match topology_str {
            "torus" => TopologyType::Torus,
            "klein" => TopologyType::Klein,
            "sphere" => TopologyType::Sphere,
            "finite" => TopologyType::Finite,
            "cylinder" => TopologyType::Cylinder,
            "infinite" => TopologyType::Infinite,
            "cross_surface" => TopologyType::CrossSurface,
            _ => TopologyType::Finite,
        };
    }

    pub fn change_bounds(&mut self, new_bounds: [i32; 6]) {
        self.bounds = new_bounds.clone();
    }

    pub fn check_bounds(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        match self.topology_type {
            TopologyType::Torus => self.torus(q, r, s),
            TopologyType::Klein => self.klein(q, r, s),
            TopologyType::Sphere => self.sphere(q, r, s),
            TopologyType::Finite => self.finite(q, r, s),
            TopologyType::Infinite => self.infinite(q, r, s),
            TopologyType::Cylinder => self.cylinder(q, r, s),
            TopologyType::CrossSurface => self.cross_surface(q, r, s),
        }
    }

    pub fn infinite(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        Some([q, r, s])
    }

    pub fn finite(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        let [min_q, max_q, min_r, max_r, _, _] = self.bounds;

        if q >= min_q && q <= max_q && r >= min_r && r <= max_r {
            Some([q, r, s])
        } else {
            None
        }
    }

    pub fn torus(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        let [min_q, max_q, min_r, max_r, _, _] = self.bounds;

        let wrap = |x, min, max| {
            let len = max - min + 1;
            min + ((x - min) % len + len) % len
        };

        Some([wrap(q, min_q, max_q), wrap(r, min_r, max_r), s])
    }

    pub fn cylinder(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        let [_, _, min_r, max_r, _, _] = self.bounds;

        let wrap = |x, min, max| {
            let len = max - min + 1;
            min + ((x - min) % len + len) % len
        };

        Some([q, wrap(r, min_r, max_r), s])
    }

    pub fn klein(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        let [min_q, max_q, min_r, max_r, _, _] = self.bounds;

        let wrap = |x, min, max| {
            let len = max - min + 1;
            min + ((x - min) % len + len) % len
        };

        let wrapped_q = wrap(q, min_q, max_q);
        let mut twisted_r = wrap(r, min_r, max_r);

        // detect q wrapping before comparing to wrapped form
        let q_wrapped = q < min_q || q > max_q;

        // Klein bottle flip: when q wraps, flip r
        if q_wrapped {
            twisted_r = min_r + (max_r - twisted_r);
        }

        Some([wrapped_q, twisted_r, s])
    }

    pub fn cross_surface(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        let [min_q, max_q, min_r, max_r, _, _] = self.bounds;

        let wrap = |x, min, max| {
            let len = max - min + 1;
            min + ((x - min) % len + len) % len
        };

        // Wrap into domain
        let mut wq = wrap(q, min_q, max_q);
        let mut wr = wrap(r, min_r, max_r);

        // Detect wrap events
        let q_wrapped = q < min_q || q > max_q;
        let r_wrapped = r < min_r || r > max_r;

        // reflect functions (inline to avoid clutter)
        if q_wrapped {
            // q wrapped → flip r
            wr = min_r + (max_r - wr);
        } else if r_wrapped {
            // r wrapped → flip q
            wq = min_q + (max_q - wq);
        }

        Some([wq, wr, s])
    }

    pub fn sphere(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        let [min_q, max_q, min_r, max_r, _, _] = self.bounds;

        let mut shifted_r = r;
        let mut shifted_q = q;
        if r < min_r{
            shifted_r = -q;
            shifted_q = max_q;
        } else if q < min_q{
            shifted_q = -r;
            shifted_r = max_r;
        } else if r > max_r{
            shifted_r = -q;
            shifted_q = min_q;
        } else if q > max_q{
            shifted_q = -r;
            shifted_r = min_r;
        }

        Some([shifted_q, shifted_r, s])
    }

}
