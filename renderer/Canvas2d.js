class Canvas2DRenderer {
    constructor(canvas, shapeGrid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shapeGrid = shapeGrid;
        this.updateCanvasSize();
    }

    updateCanvasSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
    }

    uploadGeometry(geometry) {
        this.cachedGeometry = geometry;
    }

    clearAll() {
        return;
    }

    renderCell(cameraView, q, r, s, state) {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // --- Camera transform ---
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);
        this.shapeGrid.drawShapeCell(ctx, q, r, s, state)
    }

    syncCellsToCanvas(ctx, cells) {
        const arr = cells.each_live_cell();
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];

            this.shapeGrid.drawShapeCell(ctx, q, r, s, state);
        }
    }

    renderGrid(cameraView, cells, updateCells) {
        const ctx = this.ctx;
        const colorSchema = this.colorSchema;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        const bgColor = colorSchema.canvas;

        ctx.fillStyle = `rgba(
            ${Math.round(bgColor[0] * 255)},
            ${Math.round(bgColor[1] * 255)},
            ${Math.round(bgColor[2] * 255)},
            ${bgColor[3]}
        )`;
        ctx.fillRect(0, 0, this.width, this.height);

        // --- Camera transform ---
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);

        const gridBg = colorSchema.grid;
        ctx.fillStyle = `rgba(
            ${Math.round(gridBg[0] * 255)},
            ${Math.round(gridBg[1] * 255)},
            ${Math.round(gridBg[2] * 255)},
            ${gridBg[3]}
        )`;
        this.shapeGrid.drawGridShape(ctx);
        this.syncCellsToCanvas(ctx, cells);
        ctx.restore();
    }

    updateView(cameraView) {
        return;
    }

}

export { Canvas2DRenderer };
