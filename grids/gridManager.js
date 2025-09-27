import { squareGrid } from './squares.js';
import { hexagonGrid } from './hexagons.js';
import { triangleGrid } from './triangles.js';


class gridManager {
    constructor(shape, canvas) {
        this.shape = shape;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Camera + zoom
        this.camX = 0;
        this.camY = 0;
        this.zoom = 1;
        this.radius = 20;

        this.cells = new Set();
        if (shape.value === "square") {
            this.shapeGrid = new hexagonGrid();
        } else if (shape.value ==="triangle") {
            this.shapeGrid = new hexagonGrid();
        } else if (shape.value === "hex"){
            this.shapeGrid = new hexagonGrid();
        }
        this.updateCanvasSize();

    }

    getKey(...coords) {
        return coords.join(',');
    }

    updateCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    // Convert screen coordinates (pixels) to world coordinates (grid units)
    screenToWorld(px, py) {
        return {
            x: (px - this.width/2 - this.camX) / this.zoom,  // Account for camera pan and zoom
            y: (py - this.height/2 - this.camY) / this.zoom
        };
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
        return this.shapeGrid.worldToCell(world);
    }

    // ---------- MAIN GRID DRAWING FUNCTION ----------
    drawGrid(gridSize) {
        const canvas = document.getElementById("gridCanvas");
        const ctx = canvas.getContext("2d");
        // Clear the entire canvas
        ctx.clearRect(0,0,this.width,this.height);
        // Save current transformation state and apply camera transformations
        ctx.save();
        ctx.translate(this.width/2+this.camX, this.height/2+this.camY);  // Center the grid + camera offset
        ctx.scale(this.zoom,this.zoom);  // Apply zoom

        this.shapeGrid.drawGrid(gridSize, this.cells)

        // Restore original transformation state
        ctx.restore();
    }

    // Toggle cell state at screen coordinates (px, py)
    toggleAt(px, py) {
        const shape = this.shape.value;
        const world = this.screenToWorld(px, py);      // screen → world
        const cell  = this.worldToCell(world, shape);  // world → grid
        const key   = this.getKey(...cell);

        // DRAW mode
        if (drawTiles.checked) {
            this.cells.add(key);                        // add cell regardless of previous state
        }
        // ERASE mode
        else if (eraseTiles.checked) {
            this.cells.delete(key);                     // remove if present
        }
        else {
            // PAN MODE: don't touch cells, let mouse events handle dragging
            // (nothing here — just leave cells as is)
            return;
        }
    }

}



export {gridManager};