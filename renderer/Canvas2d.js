class Canvas2DRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
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

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ] : [0.5, 0.5, 0.5, 1.0];
    }

    draw(cameraView, geometry) {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.width, this.height);
        
        // Save context state
        ctx.save();
        
        // Apply camera transformations
        ctx.translate(this.width/2 + cameraView.camX, this.height/2 + cameraView.camY);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        
        if (!geometry || geometry.vertexCount === 0) {
            ctx.restore();
            return;
        }

        // Draw geometry
        const vertices = geometry.vertices;
        const colors = geometry.colors;
        const indices = geometry.indices;

        // Draw each triangle
        for (let i = 0; i < indices.length; i += 3) {
            const idx0 = indices[i] * 2;
            const idx1 = indices[i + 1] * 2;
            const idx2 = indices[i + 2] * 2;

            const x0 = vertices[idx0];
            const y0 = vertices[idx0 + 1];
            const x1 = vertices[idx1];
            const y1 = vertices[idx1 + 1];
            const x2 = vertices[idx2];
            const y2 = vertices[idx2 + 1];

            // Get color from first vertex of the triangle
            const colorIdx = indices[i] * 4;
            const r = colors[colorIdx] * 255;
            const g = colors[colorIdx + 1] * 255;
            const b = colors[colorIdx + 2] * 255;
            const a = colors[colorIdx + 3];

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

            // Draw filled triangle
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            
            if (a > 0) {
                ctx.fill();
            }
            ctx.stroke();
        }
        
        // Restore context state
        ctx.restore();
    }

    // Alternative method for direct drawing (if you want to bypass geometry)
    drawDirect(cameraView, drawCallback) {
        const ctx = this.ctx;
        
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        
        ctx.translate(this.width/2 + cameraView.camX, this.height/2 + cameraView.camY);
        ctx.scale(cameraView.zoom, cameraView.zoom);
        
        if (drawCallback) {
            drawCallback(ctx);
        }
        
        ctx.restore();
    }
}

export { Canvas2DRenderer };

