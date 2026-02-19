class Canvas2DRenderer {
    constructor(canvas, shapeGrid) {
        this.canvas = canvas;
        this.shapeGrid = shapeGrid;
        this.colorSchema = shapeGrid.colorSchema;

        const rendererUsed = "canvas2d";
        this.ctx = canvas.getContext('2d');
        this.shapeGrid.addRenderer(rendererUsed);
        this.updateCanvasSize();
        console.log("Renderer Used:", rendererUsed);
    }

    setupRenderStrategy(strategy) {
        this.chunked = (strategy === "chunked");
    }

    updateCanvasSize() {
        this.width  = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width  = this.width;
        this.canvas.height = this.height;
    }

    rgba([r, g, b, a]) {
        return `rgba(${(r * 255) | 0}, ${(g * 255) | 0}, ${(b * 255) | 0}, ${a})`;
    }

    // Shared camera setup — call once at the start of each full render.
    _applyCameraTransform(ctx, cameraView) {
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);
    }

    // Sync every live cell from the grid mesh to the canvas.
    _syncCells(ctx, cells) {
        const arr = cells.each_live_cell();
        for (let i = 0; i < arr.length; i += 4) {
            this.shapeGrid.drawShapeCell(ctx, arr[i], arr[i + 1], arr[i + 2], arr[i + 3]);
        }
    }

    uploadGeometry(geometry) {
        return;
    }

    // Draw a single cell on top of the current frame (used by DirectRender.changeCell).
    renderCell(cameraView, q, r, s, state) {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        this._applyCameraTransform(ctx, cameraView);
        this.shapeGrid.drawShapeCell(ctx, q, r, s, state);
        ctx.restore();
    }

    renderGrid(cameraView, cells, updateCells) {
        const ctx = this.ctx;
        const { canvas: canvasColor, 0: gridColor } = this.colorSchema;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        // Background
        if (this.chunked) {
            ctx.fillStyle = this.rgba(gridColor);
            ctx.fillRect(0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = this.rgba(canvasColor);
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.save();
        this._applyCameraTransform(ctx, cameraView);

        if (!this.chunked) {
            // In direct mode, draw the grid background shape behind the cells.
            ctx.fillStyle = this.rgba(gridColor);
            this.shapeGrid.drawGridShape(ctx);
        }

        this._syncCells(ctx, cells);

        ctx.restore();
    }

    drawChunk(cameraView, cx, cy, chunkSize, data) {
        if (!data || data.length === 0) return;

        const ctx = this.ctx;
        const cellSize = this.shapeGrid.cellSize;

        ctx.save();
        this._applyCameraTransform(ctx, cameraView);

        const originQ = cx * chunkSize;
        const originR = cy * chunkSize;

        for (let ly = 0; ly < chunkSize; ly++) {
            for (let lx = 0; lx < chunkSize; lx++) {
                // chunk data is flat: index = lx + ly * chunkSize (depth=1, lz=0)
                const idx = lx + ly * chunkSize;
                const state = data[idx];
                if (state === 0) continue;

                const q = originQ + lx;
                const r = originR + ly;
                this.shapeGrid.drawShapeCell(ctx, q, r, 0, state);
            }
        }

        ctx.restore();
    }

    clearAll() {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
    }
}

export { Canvas2DRenderer };