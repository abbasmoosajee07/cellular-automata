class Canvas2DRenderer {
    constructor(canvas, shapeGrid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shapeGrid = shapeGrid;
        this.shapeGrid.rendererUsed = "canvas2d";
        this.chunkedRender = false;

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
        // this.drawVisibleChunks(ctx, cells, cameraView);

        ctx.restore();
    }

    updateView(cameraView) {
        return;
    }

getVisibleChunkRange(cameraView) {
    const shape = this.shapeGrid;

    const tlWorld = shape.screenToWorld(
        0, 0, this.width, this.height, cameraView
    );
    const brWorld = shape.screenToWorld(
        this.width, this.height, this.width, this.height, cameraView
    );

    const tlCell = shape.worldToCell(tlWorld);
    const brCell = shape.worldToCell(brWorld);

    const cs = this.chunkSize;

    return {
        minCX: Math.floor(Math.min(tlCell[0], brCell[0]) / cs),
        maxCX: Math.floor(Math.max(tlCell[0], brCell[0]) / cs),
        minCY: Math.floor(Math.min(tlCell[1], brCell[1]) / cs),
        maxCY: Math.floor(Math.max(tlCell[1], brCell[1]) / cs),
    };
}

drawVisibleChunks(ctx, cells, cameraView) {
    const cs = this.chunkSize;
    const depth = 1;

    const { minCX, maxCX, minCY, maxCY } =
        this.getVisibleChunkRange(cameraView);

    for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cy = minCY; cy <= maxCY; cy++) {

            const chunk = cells.get_chunk_cells(cx, cy, 0);
            if (!chunk) continue;

            for (let ly = 0; ly < cs; ly++) {
                for (let lx = 0; lx < cs; lx++) {
                    const idx = lx + ly * cs;
                    const state = chunk[idx];
                    if (state === 0) continue;

                    const q = cx * cs + lx;
                    const r = cy * cs + ly;

                    this.shapeGrid.drawShapeCell(ctx, q, r, 0, state);
                }
            }
        }
    }
}

}

export { Canvas2DRenderer };
