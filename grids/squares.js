class SquareGrid{
    constructor(colorSchema) {
        this.colorSchema = colorSchema;
        this.radius = 30;
        this.zoom = 1;
    }
    // Draw a square at position (x, y), filled if specified
    drawCell(ctx, x, y, status) {
        const size = this.radius*2;
        ctx.beginPath();
        ctx.rect(x-size/2, y-size/2, size, size);  // Center the square on (x,y)
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
        // Square grid: simple division by cell size
        const size = this.radius*2;
        return [Math.floor(world.x/size), Math.floor(world.y/size)];
    }

    drawGrid(ctx, minX, maxX, minY, maxY, cells) {
        const horiz = 1.5 * this.radius;
        const vert  = Math.sqrt(3) * this.radius;
        const size = this.radius*2;

        // Find bounding indices of visible cols/rows
        const minCol = Math.floor(minX / horiz) - 1;
        const maxCol = Math.ceil(maxX / horiz) + 1;
        const minRow = Math.floor(minY / vert) - 1;
        const maxRow = Math.ceil(maxY / vert) + 1;
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                this.drawCell(ctx, col*size, row*size, status);
            }
        }
    }
}

export { SquareGrid };