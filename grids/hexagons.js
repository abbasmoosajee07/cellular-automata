
class HexagonGrid{
    constructor(colorSchema) {
        this.colorSchema = colorSchema;
        this.radius = 30;
        this.zoom = 1;
    }

    // Draw a hexagon at position (x, y), filled if specified
    drawCell(ctx, x, y, status) {
        ctx.beginPath();
        // Create hexagon by connecting 6 points in a circle
        for (let i = 0; i < 6; i++) {
            const a = Math.PI/3 * i;  // Angle for each vertex (60° increments)
            const px = x + this.radius * Math.cos(a);
            const py = y + this.radius * Math.sin(a);
            i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
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
            // Hexagonal grid: using axial coordinates (q, r)
            const q = Math.round(world.x / (1.5*this.radius));
            const r = Math.round((world.y - (q%2?Math.sqrt(3)*this.radius/2:0)) / (Math.sqrt(3)*this.radius));
            return [q, r];
    }

    drawGrid(ctx, minX, maxX, minY, maxY, cells) {
        const horiz = 1.5 * this.radius;
        const vert  = Math.sqrt(3) * this.radius;

        // Find bounding indices of visible cols/rows
        const minCol = Math.floor(minX / horiz) - 1;
        const maxCol = Math.ceil(maxX / horiz) + 1;
        const minRow = Math.floor(minY / vert) - 1;
        const maxRow = Math.ceil(maxY / vert) + 1;

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const x = col * horiz;
                const y = row * vert + (col % 2 ? vert / 2 : 0);
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                this.drawCell(ctx, x, y, status);
            }
        }
    }

}


export { HexagonGrid };