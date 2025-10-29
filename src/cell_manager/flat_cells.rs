
pub struct FlatCellManager {
    width: usize,
    height: usize,
    depth: usize,
    origin: (i32, i32, i32),
    cells: Vec<u32>,
}

impl FlatCellManager {
    fn index_internal(&self, q: i32, r: i32, s: i32) -> Option<usize> {
        let q = q + self.origin.0;
        let r = r + self.origin.1;
        let s = s + self.origin.2;

        if q < 0 || r < 0 || s < 0 {
            return None;
        }

        let q = q as usize;
        let r = r as usize;
        let s = s as usize;

        if q >= self.width || r >= self.height || s >= self.depth {
            return None;
        }

        Some(q + r * self.width + s * self.width * self.height)
    }
}

impl FlatCellManager {
    pub fn new(width: usize, height: usize, depth: usize) -> FlatCellManager {
        let origin = (
            (width as i32) / 2,
            (height as i32) / 2,
            (depth as i32) * 0,
        );
        FlatCellManager {
            width,
            height,
            depth,
            origin,
            cells: vec![0u32; width * height * depth],
        }
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        if let Some(idx) = self.index_internal(q, r, s) {
            self.cells[idx] = value;
        }
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        self.index_internal(q, r, s).map(|i| self.cells[i]).unwrap_or(0)
    }

    pub fn clear(&mut self) {
        self.cells.fill(0);
    }

    pub fn for_each_cell(&self) -> Vec<i32> {
        let mut out = Vec::new();
        for s in 0..self.depth {
            for r in 0..self.height {
                for q in 0..self.width {
                    let idx = q + r * self.width + s * self.width * self.height;
                    let val = self.cells[idx];
                    if val != 0 {
                        out.push(q as i32 - self.origin.0);
                        out.push(r as i32 - self.origin.1);
                        out.push(s as i32 - self.origin.2);
                        out.push(val as i32);
                    }
                }
            }
        }
        out
    }

    pub fn resize(&mut self, new_width: usize, new_height: usize, new_depth: usize) {
        let new_origin = (
            (new_width as i32) / 2,
            (new_height as i32) / 2,
            (new_depth as i32) * 0,
        );

        let mut new_cells = vec![0u32; new_width * new_height * new_depth];
        for s in 0..self.depth.min(new_depth) {
            for r in 0..self.height.min(new_height) {
                for q in 0..self.width.min(new_width) {
                    let old_idx = q + r * self.width + s * self.width * self.height;
                    let new_idx = q + r * new_width + s * new_width * new_height;
                    new_cells[new_idx] = self.cells[old_idx];
                }
            }
        }

        self.width = new_width;
        self.height = new_height;
        self.depth = new_depth;
        self.origin = new_origin;
        self.cells = new_cells;
    }
}
