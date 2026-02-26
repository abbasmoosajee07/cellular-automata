class DirectRender {
    constructor(gridManager) {
        this.gridManager = gridManager;
        this.renderer    = gridManager.renderer;
        this.engine   = gridManager.engine;

        this.renderer.setupRenderStrategy("direct");
        console.log("Rendering Strategy: Direct");
    }

    changeCell(q, r, s, state) {
        this.renderer.renderCell(this.gridManager.cameraView, q, r, s, state);
    }

    renderGrid(tl, br, cameraView, updateCells = false) {
        this.renderer.renderGrid(cameraView, this.engine, updateCells);
    }

    clearCache() {
        this.renderer.clearAll();
    }
}

export { DirectRender };