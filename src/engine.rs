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
        Self {
            storage: PatternConfig::default(),
            mesh: grid_mesh,
            automata: Automata::default(),
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
            automata: Automata::default(),
        };
        engine.automata.total = total;

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

        engine.sync_automata(None, Some(true), 0, 0);
        engine
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    fn sync_automata(&mut self, new_live: Option<i32>, recalculate_total: Option<bool>, births: i32, deaths: i32) {
        if recalculate_total.unwrap_or(false) {
            self.automata.total = self.mesh.calculate_total_cells();
        }
        self.automata.births = births;
        self.automata.deaths = deaths;
        self.automata.live = new_live.unwrap_or_else(|| self.mesh.inner.count_live_cells());
        self.automata.density = self.automata.live as f32 / self.automata.total as f32;
        self.automata.mutation_rate = (births + deaths) as f32 / self.automata.total as f32;
    }

    // ── Basic operations ─────────────────────────────────────────────────────
    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        let prev = self.mesh.inner.get_cell(q, r, s);
        self.mesh.inner.set_cell(q, r, s, value);

        let was_live = prev != 0;
        let is_live  = value != 0;

        let (births, deaths) = match (was_live, is_live) {
            (false, true)  => (1, 0),
            (true,  false) => (0, 1),
            _              => (0, 0),
        };

        self.sync_automata(
            Some(self.automata.live + (is_live as i32 - was_live as i32)),
            Some(self.mesh.config.topology_type == "infinite"),
            births,
            deaths,
        );
    }

    pub fn clear(&mut self) {
        self.mesh.inner.clear();
        self.automata = Automata::default();
        self.automata.total = self.mesh.calculate_total_cells();
    }

    pub fn resize(&mut self, w: usize, h: usize) {
        self.mesh.resize(w, h);
        self.sync_automata(None, Some(true), 0, 0);
    }

    pub fn change_grid_properties(
        &mut self,
        shape: String,
        neighbor_type: String,
        range: i32,
        topology_type: String,
    ) {
        self.mesh.change_grid_properties(shape, neighbor_type, range, topology_type);
        self.sync_automata(None, Some(true), 0, 0);
    }

    // ── Simulation steps ─────────────────────────────────────────────────────
    pub fn step_game_of_life(&mut self) {
        let (births, deaths) = ConwayLife::step_game_of_life(&mut self.mesh);
        self.sync_automata(None, None, births, deaths);
        self.automata.ticks += 1;
    }

    pub fn random_cells(&mut self) {
        let old_live = self.automata.live;
        let active_cells = self.mesh.random_cells();
        let births = (active_cells - old_live).max(0);
        let deaths = (old_live - active_cells).max(0);
        self.sync_automata(Some(active_cells), None, births, deaths);
        self.automata.ticks = 0;
    }

    pub fn floodfill(&mut self) {
        let old_live = self.automata.live;
        let active_cells = FloodFill::floodfill(&mut self.mesh);
        let births = (active_cells - old_live).max(0);
        self.sync_automata(
            Some(active_cells),
            Some(self.mesh.config.topology_type == "infinite"),
            births,
            0,
        );
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