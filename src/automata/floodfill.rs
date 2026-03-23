// simulation.rs
use crate::GridMesh;

pub struct FloodFill;

impl FloodFill {

    pub fn floodfill(mesh: &mut GridMesh) -> i32 {
        let arr = mesh.inner.each_live_cell();
        let mut neighbors_to_activate = Vec::new();
        let mut cells_filled = 0;
        let mut i = 0;

        while i + 3 < arr.len() {
            let state = arr[i + 3];
            if state == 1 {
                cells_filled += 1; // count already-active cells
                neighbors_to_activate.extend(
                    mesh.get_neighbors(arr[i], arr[i + 1], arr[i + 2])
                );
            }
            i += 4;
        }

        for (nq, nr, ns) in neighbors_to_activate {
            if mesh.inner.get_cell(nq, nr, ns) != 1 { // only count if not already active
                cells_filled += 1;
            }
            mesh.inner.set_cell(nq, nr, ns, 1);
        }

        cells_filled
    }


}
