const radius = 30;  // Base size for grid elements
const hex_color = "#32cd32"
const line_color = "#555555"
const zoom = 1;
class hexagonGrid{
    // Draw a hexagon at position (x, y), filled if specified
    drawCell(x, y, filled) {
        const canvas = document.getElementById("gridCanvas");
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        // Create hexagon by connecting 6 points in a circle
        for (let i = 0; i < 6; i++) {
            const a = Math.PI/3 * i;  // Angle for each vertex (60° increments)
            const px = x + radius * Math.cos(a);
            const py = y + radius * Math.sin(a);
            i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
        }
        ctx.closePath();
        ctx.strokeStyle = line_color;  // Grid line color
        ctx.lineWidth = 1/zoom;  // Thinner lines when zoomed out
        ctx.stroke();
        if(filled){
            ctx.fillStyle=hex_color;
            ctx.fill();
        }
    }
    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
            // Hexagonal grid: using axial coordinates (q, r)
            const q = Math.round(world.x / (1.5*radius));
            const r = Math.round((world.y - (q%2?Math.sqrt(3)*radius/2:0)) / (Math.sqrt(3)*radius));
            return [q, r];
    }

    drawGrid(gridSize, cells) {

        const horiz = 1.5 * radius;        // Horizontal spacing between hex centers
        const vert = Math.sqrt(3) * radius; // Vertical spacing between hex centers

        for (let row = -gridSize; row <= gridSize; row++) {
            for (let col = -gridSize; col <= gridSize; col++) {
                const x = col * horiz;
                const y = row * vert + (col % 2 ? vert / 2 : 0); // offset every other column
                const filled = cells.has(getKey(col, row));
                this.drawCell(x, y, filled);
            }
        }
    }
}

function getKey(...coords){return coords.join(',');}

export { hexagonGrid };