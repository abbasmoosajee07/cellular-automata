#[derive(Clone, Copy)]
pub enum TopologyType {
    Torus,
    Finite,
    Infinite,
    Cylinder,
}

pub struct Topology {
    topology_type: TopologyType,
    bounds: [i32; 6],
}

impl Topology {
    pub fn new(topology_type: &str, bounds: [i32; 6]) -> Self {
        let tp = match topology_type {
            "finite" => TopologyType::Finite,
            _ => TopologyType::Finite,
        };

        Self { topology_type: tp, bounds }
    }

    pub fn change_topology(&mut self, topology_type: &str) {
        self.topology_type = match topology_type {
            "torus" => TopologyType::Torus,
            "finite" => TopologyType::Finite,
            "infinite" => TopologyType::Infinite,
            "cylinder" => TopologyType::Cylinder,
            _ => TopologyType::Finite,
        };
    }

    pub fn change_bounds(&mut self, new_bounds: [i32; 6]) {
        self.bounds = new_bounds;
    }

    pub fn check_bounds(&self, q: i32, r: i32, s: i32) -> Option<[i32; 3]> {
        match self.topology_type {
            TopologyType::Torus => self.torus(q, r, s),
            TopologyType::Finite => self.finite(q, r, s),
            TopologyType::Infinite => self.finite(q, r, s),
            TopologyType::Cylinder => self.cylinder(q, r, s),
        }
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

}
