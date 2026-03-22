use crate::cell_manager::{
    flat_cells::FlatCellManager,
    chunk_cells::ChunkedCellManager,
};

pub enum CellBackend {
    Flat(FlatCellManager),
    Chunked(ChunkedCellManager),
}

impl CellBackend {

    pub fn get_cell_struct(&mut self) -> String {
        match self {
            CellBackend::Flat(_fm) => "flat_cells".to_string(),
            CellBackend::Chunked(_cm) => "chunk_cells".to_string(),
        }
    }

    pub fn set_cell(&mut self, q: i32, r: i32, s: i32, value: u32) {
        match self {
            CellBackend::Flat(fm) => fm.set_cell(q, r, s, value),
            CellBackend::Chunked(cm) => cm.set_cell(q, r, s, value),
        }
    }

    pub fn get_cell(&self, q: i32, r: i32, s: i32) -> u32 {
        match self {
            CellBackend::Flat(fm) => fm.get_cell(q, r, s),
            CellBackend::Chunked(cm) => cm.get_cell(q, r, s),
        }
    }

    pub fn clear(&mut self) {
        match self {
            CellBackend::Flat(fm) => fm.clear(),
            CellBackend::Chunked(cm) => cm.clear(),
        }
    }

    pub fn each_live_cell(&self) -> Vec<i32> {
        match self {
            CellBackend::Flat(fm) => fm.each_live_cell(),
            CellBackend::Chunked(cm) => cm.each_live_cell(),
        }
    }

    pub fn iter_cell(&self) -> Box<dyn Iterator<Item = [i32; 4]> + '_> {
        match self {
            CellBackend::Flat(fm) => Box::new(fm.iter_cell()),
            CellBackend::Chunked(cm) => Box::new(cm.iter_cell()),
        }
    }

    pub fn for_each_cell(&self) -> Vec<i32> {
        match self {
            CellBackend::Flat(fm) => fm.for_each_cell(),
            CellBackend::Chunked(cm) => cm.for_each_cell(),
        }
    }

    pub fn count_live_cells(&self) -> i32 {
        match self {
            CellBackend::Flat(fm) => fm.count_live_cells(),
            CellBackend::Chunked(cm) => cm.count_live_cells(),
        }
    }

    pub fn get_depth(&self) -> usize {
        match self {
            CellBackend::Flat(fm) => fm.get_depth(),
            CellBackend::Chunked(cm) => cm.get_depth(),
        }
    }

    pub fn get_chunk_size(&self) -> usize {
        match self {
            CellBackend::Flat(_fm) => 0 as usize,
            CellBackend::Chunked(cm) => cm.get_chunk_size(),
        }
    }

    pub fn get_chunk_keys(&self) -> Result<Vec<i32>, String> {
        match self {
            CellBackend::Flat(_fm) => Err("get_chunk_keys is not supported for Flat backend".to_string()),
            CellBackend::Chunked(cm) => Ok(cm.get_chunk_keys()),
        }
    }

    pub fn get_chunk_cells(&self, cx: i32, cy: i32, cz: i32) -> Result<Vec<u32>, String> {
        match self {
            CellBackend::Flat(_fm) => Err("get_chunk_cells is not supported for Flat backend".to_string()),
            CellBackend::Chunked(cm) => Ok(cm.get_chunk_cells(cx, cy, cz)),
        }
    }
}
