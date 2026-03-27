use crate::{GridMesh, PatternIO, formats::PatternConfig};
use crate::automata::{Automata, FloodFill, ConwayLife};
use std::{fs, path::{Path}};

pub struct Engine {
    pub storage: PatternConfig,
    pub mesh: GridMesh,
    pub automata: Automata,
}

impl Engine {

    // New Automata Engine
    pub fn new(shape: String, width: usize, height: usize) -> Self {
        let grid_mesh = GridMesh::new(shape, width, height);
        let total = grid_mesh.calculate_total_cells();
        Self {
            storage: PatternConfig::default(),
            mesh: grid_mesh,
            automata: Automata { live: 0, gen_no: 0, total },
        }
    }

    pub fn read_file<P: AsRef<Path>>(path: P) -> Result<Self, std::io::Error> {
        let path_str = path.as_ref().to_string_lossy().to_string();
        let file_text = fs::read_to_string(path.as_ref())?;
        Ok(Self::new_with_pattern(&path_str, &file_text))
    }

    pub fn new_with_pattern(pattern_props: &str, pattern_data: &str) -> Self {
        let cfg = PatternIO::read_pattern(pattern_props, pattern_data);

        let [w, h, _d] = cfg.grid_size;
        let grid_mesh = GridMesh::new(cfg.shape.clone(), w as usize, h as usize);
        let total = grid_mesh.calculate_total_cells();

        let mut engine = Self {
            storage: cfg.clone(),
            mesh: grid_mesh,
            automata: Automata { live: 0, gen_no: 0, total },
        };

        engine.mesh.change_grid_properties(
            cfg.shape.clone(),
            cfg.neighbor_type.clone(),
            cfg.range,
            cfg.topology_type.clone(),
        );

        let [shift_q, shift_r, shift_s] = cfg.top_left;

        for (y, x, z, state) in &cfg.alive {
            if *state != 0 {
                engine.mesh.inner.set_cell(
                    *y + shift_q,
                    *x + shift_r,
                    *z + shift_s,
                    *state,
                );
            }
        }

        engine.sync_automata();
        engine
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    fn sync_automata(&mut self) {
        self.automata.live  = self.mesh.inner.count_live_cells();
        self.automata.total = self.mesh.calculate_total_cells();
    }

    // ── Basic operations ─────────────────────────────────────────────────────
    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        let prev = self.mesh.inner.get_cell(q, r, s);
        self.mesh.inner.set_cell(q, r, s, value);

        // Incremental update: O(1) instead of O(n).
        let was_live = if prev != 0 { 1 } else { 0 };
        let is_live  = if value != 0 { 1 } else { 0 };
        self.automata.live += is_live - was_live;
    }

    pub fn clear(&mut self) {
        self.mesh.inner.clear();
        self.automata.live   = 0;
        self.automata.gen_no = 0;
    }

    pub fn count_live_cells(&self) -> i32 {
        self.mesh.inner.count_live_cells()
    }

    pub fn resize(&mut self, w: usize, h: usize) {
        self.mesh.resize(w, h);
        self.automata.total = self.mesh.calculate_total_cells();
    }

    pub fn change_grid_properties(
        &mut self,
        shape: String,
        neighbor_type: String,
        range: i32,
        topology_type: String,
    ) {
        self.mesh.change_grid_properties(shape, neighbor_type, range, topology_type);
        self.automata.total = self.mesh.calculate_total_cells();
    }

    // ── Simulation steps ─────────────────────────────────────────────────────
    pub fn step_game_of_life(&mut self) {
        ConwayLife::step_game_of_life(&mut self.mesh);
        self.automata.live   = self.mesh.inner.count_live_cells();
        self.automata.gen_no += 1;
    }

    pub fn random_cells(&mut self) {
        let active_cells     = self.mesh.random_cells();
        self.automata.live   = active_cells;
        self.automata.gen_no = 0;
    }

    pub fn floodfill(&mut self) {
        let active_cells   = FloodFill::floodfill(&mut self.mesh);
        self.automata.live = active_cells;
    }

    // ── Storage operations ────────────────────────────────────────────────────
    pub fn update_storage(&mut self) {
        let config = self.mesh.config.clone();

        let use_bounds: [i32; 6] = if config.topology_type == "infinite" {
            self.mesh.get_cell_extremes()
        } else {
            config.bounds
        };

        let [min_q, max_q, min_r, max_r, min_s, max_s] = use_bounds;

        let alive: Vec<(i32, i32, i32, u32)> = self
            .mesh
            .inner
            .iter_cell()
            .filter(|[_, _, _, state]| *state != 0)
            .map(|[q, r, s, state]| {
                (q - min_q, r - min_r, s - min_s, state as u32)
            })
            .collect();

        self.storage.grid_size     = [
            (max_q - min_q + 1) as usize,
            (max_r - min_r + 1) as usize,
            (max_s - min_s + 1) as usize,
        ];
        self.storage.top_left      = [min_q, min_r, min_s];
        self.storage.neighbor_type = config.neighbor_type;
        self.storage.topology_type = config.topology_type;
        self.storage.shape         = config.shape;
        self.storage.range         = config.range;
        self.storage.alive         = alive;
    }

    pub fn snap_pattern(&mut self) {
        let _reader = PatternIO::save_file(self.storage.clone());
    }

    pub fn pattern_text(&mut self) -> String {
        PatternIO::write_text(self.storage.clone())
    }
}