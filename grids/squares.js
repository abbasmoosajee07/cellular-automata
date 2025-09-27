const radius = 30;  // Base size for grid elements
const hex_color = "#32cd32"
const line_color = "#555555"

class squareGrid{
    // Draw a square at position (x, y), filled if specified
    drawCell(x, y, filled) {
        const canvas = document.getElementById("gridCanvas");
        const ctx = canvas.getContext("2d");
        const size = radius*2;
        ctx.beginPath();
        ctx.rect(x-size/2, y-size/2, size, size);  // Center the square on (x,y)
        ctx.strokeStyle = line_color;
        ctx.lineWidth = 1/zoom;
        ctx.stroke();
        if(filled){ ctx.fillStyle=hex_color; ctx.fill(); }
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
        // Square grid: simple division by cell size
        const size = radius*2;
        return [Math.floor(world.x/size), Math.floor(world.y/size)];

    }
    drawGrid(gridSize, cells) {
        // Draw different grid types based on selected shape
        const size = radius*2;
        // Iterate through grid coordinates
        for(let x=-gridSize;x<=gridSize;x++){
            for(let y=-gridSize;y<=gridSize;y++){
                const filled = cells.has(getKey(x,y));  // Check if cell is active
                this.drawCell(x*size, y*size, filled);
            }
        }
    }
}
function getKey(...coords){return coords.join(',');}

export { squareGrid };