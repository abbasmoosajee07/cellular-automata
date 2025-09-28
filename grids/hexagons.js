
class HexagonGrid{
    constructor( zoom = 1, radius = 30) {
        this.hexColor = "#32cd32";
        this.lineColor = "#555555";
        this.radius = radius;
        this.zoom = zoom;

    }

    // Draw a hexagon at position (x, y), filled if specified
    drawCell(ctx, x, y, filled) {
        ctx.beginPath();
        // Create hexagon by connecting 6 points in a circle
        for (let i = 0; i < 6; i++) {
            const a = Math.PI/3 * i;  // Angle for each vertex (60° increments)
            const px = x + this.radius * Math.cos(a);
            const py = y + this.radius * Math.sin(a);
            i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
        }
        ctx.closePath();
        ctx.strokeStyle = this.lineColor;  // Grid line color
        ctx.lineWidth = 1/this.zoom;  // Thinner lines when zoomed out
        ctx.stroke();
        if(filled){
            ctx.fillStyle=this.hexColor;
            ctx.fill();
        }
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
            // Hexagonal grid: using axial coordinates (q, r)
            const q = Math.round(world.x / (1.5*this.radius));
            const r = Math.round((world.y - (q%2?Math.sqrt(3)*this.radius/2:0)) / (Math.sqrt(3)*this.radius));
            return [q, r];
    }

    drawGrid(ctx, gridSize, cells) {

        const horiz = 1.5 * this.radius;        // Horizontal spacing between hex centers
        const vert = Math.sqrt(3) * this.radius; // Vertical spacing between hex centers

        for (let row = -gridSize; row <= gridSize; row++) {
            for (let col = -gridSize; col <= gridSize; col++) {
                const x = col * horiz;
                const y = row * vert + (col % 2 ? vert / 2 : 0); // offset every other column
                const filled = cells.has(col) && cells.get(col).has(row);
                this.drawCell(ctx, x, y, filled);
            }
        }
    }
}


export { HexagonGrid };