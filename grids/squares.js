class SquareGrid{
    constructor( zoom = 1, radius = 30) {
        this.hexColor = "#32cd32";
        this.lineColor = "#555555";
        this.radius = radius;
        this.zoom = zoom;
    }
    // Draw a square at position (x, y), filled if specified
    drawCell(ctx, x, y, filled) {
        const size = this.radius*2;
        ctx.beginPath();
        ctx.rect(x-size/2, y-size/2, size, size);  // Center the square on (x,y)
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 1/this.zoom;
        ctx.stroke();
        if(filled){ ctx.fillStyle=this.hexColor; ctx.fill(); }
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
        // Square grid: simple division by cell size
        const size = this.radius*2;
        return [Math.floor(world.x/size), Math.floor(world.y/size)];
    }

    drawGrid(ctx, gridSize, cells) {
        // Draw different grid types based on selected shape
        const size = this.radius*2;
        // Iterate through grid coordinates
        for(let x=-gridSize;x<=gridSize;x++){
            for(let y=-gridSize;y<=gridSize;y++){
                const filled = cells.has(x) && cells.get(x).has(y);
                this.drawCell(ctx, x*size, y*size, filled);
            }
        }
    }
}

export { SquareGrid };