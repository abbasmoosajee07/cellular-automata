class DirectRender {
    constructor(gridManager) {
        this.gridManager = gridManager;
        this.shapeGrid = gridManager.shapeGrid;
        this.renderer = gridManager.renderer;
        this.grid_mesh = gridManager.grid_mesh;
        console.log("Rendering Strategy: Direct")
    }

    changeCell(q, r, s, state) {
        this.renderer.renderCell(this.gridManager.cameraView, q, r, s, state);
    }

    renderGrid(tl, br, updateCells = false) {
        const geometry = this.shapeGrid.getGridGeometry(this.gridManager.gridSize);
        this.renderer.uploadGeometry(geometry);
        this.renderer.renderGrid(this.gridManager.cameraView, this.grid_mesh, updateCells);
    }
}

export { DirectRender };