const radius = 30;  // Base size for grid elements
const hex_color = "#32cd32"
const line_color = "#555555"
class triangleGrid{
    // Draw a triangle at position (x, y), with optional orientation and fill
    drawCell(x, y, upsideDown, filled) {
        const canvas = document.getElementById("gridCanvas");
        const ctx = canvas.getContext("2d");
        const side = radius*2;  // Triangle side length
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
        ctx.strokeStyle = line_color;
        ctx.lineWidth = 1/zoom;
        ctx.stroke();
        if(filled){ ctx.fillStyle=hex_color; ctx.fill(); }
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {

            // Triangular grid: more complex coordinate system
            const side = radius*2;
            const h = Math.sqrt(3)/2*side;  // Triangle height
            const gridX = Math.floor(world.x / (side/2));
            const gridY = Math.floor(world.y / h);
            return [gridX, gridY];

    }

    drawGrid(gridSize, cells) {
        const side = radius*2;
        const h = Math.sqrt(3)/2*side;
        for(let col=-gridSize*2;col<=gridSize*2;col++){
            for(let row=-gridSize;row<=gridSize;row++){
                const x = col*(side/2);
                const y = row*h;
                const upsideDown = (col+row)%2===0;  // Alternate triangle orientation
                const filled = cells.has(getKey(col,row));
                this.drawCell(x,y,upsideDown,filled);
            }
        }
    }
}
function getKey(...coords){return coords.join(',');}

export { triangleGrid };