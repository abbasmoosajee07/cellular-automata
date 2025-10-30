use crate::cell_manager::{
    flat_cells::FlatCellManager,
    chunk_cells::ChunkedCellManager,
};

pub enum CellBackend {
    Flat(FlatCellManager),
    Chunked(ChunkedCellManager),
}

impl CellBackend {
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

    pub fn for_each_cell(&self) -> Vec<i32> {
        match self {
            CellBackend::Flat(fm) => fm.for_each_cell(),
            CellBackend::Chunked(cm) => cm.for_each_cell(),
        }
    }


}
