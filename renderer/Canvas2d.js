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

        // --- Skip drawing if no cells ---
        if (!cells || cells.size === 0) return;

        // --- Camera transform (match WebGL logic) ---
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);

        // --- Draw cells via shape-specific logic ---
        this.shapeGrid.drawCanvasCells(ctx, cells);

        ctx.restore();
    }

    clearAll() {
        return;
    }

    renderCell(q, r, s, state) {
        return this.shapeGrid.drawSingleCell(this.ctx, q, r, s, state);
    }
}

export { Canvas2DRenderer };

