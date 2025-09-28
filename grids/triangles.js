
class TriangleGrid{
    constructor( zoom = 1, radius = 30) {
        this.hexColor = "#32cd32";
        this.lineColor = "#555555";
        this.radius = radius;
        this.zoom = zoom;
    }
    // Draw a triangle at position (x, y), with optional orientation and fill
    drawCell(ctx, x, y, upsideDown, filled) {
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
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 1/this.zoom;
        ctx.stroke();
        if(filled){ ctx.fillStyle=this.hexColor; ctx.fill(); }
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

    drawGrid(ctx, gridSize, cells) {
        const side = this.radius*2;
        const h = Math.sqrt(3)/2*side;
        for(let col=-gridSize*2;col<=gridSize*2;col++){
            for(let row=-gridSize;row<=gridSize;row++){
                const x = col * (side / 2);
                const y = row * h;
                const upsideDown = (col + row) % 2 === 0;  // Alternate triangle orientation
                const filled = cells.has(col) && cells.get(col).has(row);
                this.drawCell(ctx, x,y,upsideDown,filled);
            }
        }
    }
}

export { TriangleGrid };