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

    drawCanvas(cameraView, drawColor, bgColor, cells) {
        const ctx = this.ctx;

        // Clear canvas with background color
        ctx.fillStyle = `rgba(${Math.round(bgColor[0] * 255)}, ${Math.round(bgColor[1] * 255)}, ${Math.round(bgColor[2] * 255)}, ${bgColor[3]})`;
        ctx.fillRect(0, 0, this.width, this.height);

        if (!cells || cells.size === 0) return;

        // Set up transformation for camera view - match WebGL coordinate system
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, cameraView.camY);

        // Draw grid cells using the shape-specific rendering
        ctx.fillStyle = `rgba(${Math.round(drawColor[0] * 255)}, ${Math.round(drawColor[1] * 255)}, ${Math.round(drawColor[2] * 255)}, ${drawColor[3]})`;
        this.shapeGrid.drawCanvasCells(ctx, cells)

        ctx.restore();
    }
}

export { Canvas2DRenderer };

