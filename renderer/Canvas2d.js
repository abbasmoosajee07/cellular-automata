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

    clearAll() {
        return;
    }

    drawCanvas(cameraView, colorSchema, cells) {
        const ctx = this.ctx;

        // --- Full reset before drawing ---
        ctx.setTransform(1, 0, 0, 1, 0, 0);  // reset any previous transforms
        ctx.clearRect(0, 0, this.width, this.height); // clear the buffer
        const bgColor = colorSchema.bg || [0.5, 0.5, 0.5, 1];

        // --- Background fill ---
        ctx.fillStyle = `rgba(
            ${Math.round(bgColor[0] * 255)},
            ${Math.round(bgColor[1] * 255)},
            ${Math.round(bgColor[2] * 255)},
            ${bgColor[3]}
        )`;
        ctx.fillRect(0, 0, this.width, this.height);

        // --- Camera transform (match WebGL logic) ---
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);

        // --- Draw cells via shape-specific logic ---
        ctx.save();
        const arr = cells.for_each_cell();
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];
            this.shapeGrid.drawShapeCell(ctx, q, r, s, state);
        }
        ctx.restore();
    }

    drawCanvasTest(cameraView, colorSchema, cells) {
        const ctx = this.ctx;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        const bgColor = colorSchema.bg || [0.1, 0.1, 0.1, 1.0];

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

        // --- NEW: Grid area background ---
        const gridBg = colorSchema.canvas || [0.1, 0.1, 0.1, 1.0];
        ctx.fillStyle = `rgba(
            ${Math.round(gridBg[0] * 255)},
            ${Math.round(gridBg[1] * 255)},
            ${Math.round(gridBg[2] * 255)},
            ${gridBg[3]}
        )`;

        const w = this.shapeGrid.gridCols * this.shapeGrid.cellSize;
        const h = this.shapeGrid.gridRows * this.shapeGrid.cellSize;

        ctx.fillRect(-w / 2, -h / 2, w, h);

        // --- Draw active cells ---
        const arr = cells.for_each_cell();
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];

            this.shapeGrid.drawShapeCell(ctx, q, r, s, state);
        }

        ctx.restore();
    }

    renderCell(cameraView, q, r, s, state) {
        return
    }
}

export { Canvas2DRenderer };

