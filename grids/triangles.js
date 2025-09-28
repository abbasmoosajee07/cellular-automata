
class TriangleGrid{
    constructor(colorSchema) {
        this.colorSchema = colorSchema;
        this.radius = 30;
        this.zoom = 1;
    }

    // Draw a triangle at position (x, y), with optional orientation and fill
    drawCell(ctx, x, y, upsideDown, status) {
        const side = this.radius*2;  // Triangle side length
        const h = Math.sqrt(3)/2*side;  // Triangle height
        ctx.beginPath();
        if (!upsideDown) {
            // Point-up triangle
            ctx.moveTo(x, y);
            ctx.lineTo(x+side/2, y+h);
            ctx.lineTo(x-side/2, y+h);
        } else {
            // Point-down triangle
            ctx.moveTo(x, y+h);
            ctx.lineTo(x+side/2, y);
            ctx.lineTo(x-side/2, y);
        }
        ctx.closePath();
        ctx.strokeStyle = this.colorSchema["line"];
        ctx.lineWidth = 1 / (this.zoom);
        ctx.stroke();
        if(status){
            ctx.fillStyle=this.colorSchema[status];
            ctx.fill();
        }
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
            // Triangular grid: more complex coordinate system
            const side = this.radius*2;
            const h = Math.sqrt(3)/2*side;  // Triangle height
            const gridX = Math.floor(world.x / (side/2));
            const gridY = Math.floor(world.y / h);
            return [gridX, gridY];

    }

    drawGrid(ctx, minX, maxX, minY, maxY, cells) {
        const side = 2 * this.radius;
        const h = Math.sqrt(3) / 2 * side;

        // Find bounding indices of visible cols/rows
        const minCol = Math.floor(minX / (side / 2)) - 2;
        const maxCol = Math.ceil(maxX / (side / 2)) + 2;
        const minRow = Math.floor(minY / (h / 2)) - 2;
        const maxRow = Math.ceil(maxY / (h / 2)) + 2;

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const x = col * (side / 2);
                const y = row * h;
                const upsideDown = (col + row) % 2 === 0;
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                this.drawCell(ctx, x, y, upsideDown, status);
            }
        }
    }
}

export { TriangleGrid };