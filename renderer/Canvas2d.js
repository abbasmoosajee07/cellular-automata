class Canvas2DRenderer {
    constructor(canvas, shapeGrid) {
        this.canvas = canvas;
        this.shapeGrid = shapeGrid;
        this.colorSchema = shapeGrid.colorSchema;

        const rendererUsed = "canvas2d";
        this.ctx = canvas.getContext('2d');
        this.shapeGrid.addRenderer(rendererUsed);
        this.updateCanvasSize();
        console.log("Renderer Used:", rendererUsed)
    }

    setupRenderStrategy(strategy) {
        this.chunked = (strategy === "chunked");
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

    rgba(color) {
        const [r, g, b, a] = color;
        return `rgba(${(r * 255) | 0}, ${(g * 255) | 0}, ${(b * 255) | 0}, ${a})`;
    }

    directGridRender(cameraView, cells, updateCells) {
        const ctx = this.ctx;
        const { canvas: canvasColor, 0: gridColor } = this.colorSchema;

        // Reset + clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        // ----- Background -----
        ctx.fillStyle = this.rgba(canvasColor);
        ctx.fillRect(0, 0, this.width, this.height);

        // ----- Camera Transform -----
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);

        // ----- Grid Background (non-chunked only) -----
        ctx.fillStyle = this.rgba(gridColor);
        this.shapeGrid.drawGridShape(ctx);

        // ----- Cells -----
        this.syncCellsToCanvas(ctx, cells);

        ctx.restore();
    }

    chunkedGridRender(cameraView, cells, updateCells) {
        const ctx = this.ctx;
        const { canvas: canvasColor, 0: gridColor } = this.colorSchema;

        // Reset + clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        // ----- Background -----
        ctx.fillStyle = this.rgba(canvasColor);
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = this.rgba(gridColor);
        ctx.fillRect(0, 0, this.width, this.height);

        // ----- Camera Transform -----
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);

        // ----- Cells -----
        this.syncCellsToCanvas(ctx, cells);

        ctx.restore();
    }

    updateView(cameraView) {
        return;
    }

}

export { Canvas2DRenderer };
