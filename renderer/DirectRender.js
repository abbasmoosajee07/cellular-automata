class DirectRender {
    constructor() {
    }

    changeCell(q, r, s, state) {
        this.grid_mesh.set_cell(q, r, s, state);
        this.renderer.renderCell(this.cameraView, q, r, s, state);
    }

    renderGrid(updateCells = false) {
        const geometry = this.shapeGrid.getGridGeometry(this.gridSize);
        this.renderer.uploadGeometry(geometry);
        this.renderer.renderGrid(this.cameraView, this.grid_mesh, updateCells);
    }
}

export { DirectRender };