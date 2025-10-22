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
        
        cells.forEachCell((q, r, s, state) => {
            // if (state) {
                this.shapeGrid.drawShapeCell(ctx, q, r, s, state);
            // }
        }, { skipDead: true });
        ctx.restore();
    }

    drawShapeCell(ctx, q, r, s, state) {
        const radius = this.radius || 30;

        // Calculate hexagon center using cube coordinates
        const centerX = radius * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const centerY = radius * r * -1.5;

        const drawColor = this.colorSchema[state] || [1, 1, 1, 1];
        ctx.fillStyle = `rgba(
            ${Math.round(drawColor[0] * 255)},
            ${Math.round(drawColor[1] * 255)},
            ${Math.round(drawColor[2] * 255)},
            ${drawColor[3]}
        )`;
        this.drawHexagon(ctx, centerX, centerY, radius);

    }

    drawHexagon(ctx, centerX, centerY, radius) {
        ctx.beginPath();
        // Draw flat-topped hexagon
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6; // -30° offset for flat-topped
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    renderCell(cameraView, q, r, s, state) {
        return
        const ctx = this.ctx;

        // --- Camera transform (match WebGL logic) ---
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        ctx.translate(cameraView.camX, -cameraView.camY);

        // --- Draw cells via shape-specific logic ---
        this.shapeGrid.drawShapeCell(ctx, q, r, s, state);

        ctx.restore();
    }
}

export { Canvas2DRenderer };

