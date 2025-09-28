import { SquareGrid } from './squares.js';
import { HexagonGrid } from './hexagons.js';
import { TriangleGrid } from './triangles.js';


class GridManager {
    constructor(shape, canvas, init_cells = new Map()) {
        this.shape = shape;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Camera + zoom
        this.camX = 0;
        this.camY = 0;
        this.zoom = 1;
        this.radius = 20;

        this.cells = init_cells;
        if (shape.value === "square") {
            this.shapeGrid = new SquareGrid();
        } else if (shape.value ==="triangle") {
            this.shapeGrid = new TriangleGrid();
        } else if (shape.value === "hex"){
            this.shapeGrid = new HexagonGrid();
        }
        this.updateCanvasSize();

    }


    updateCanvasSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
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
        const ctx = this.ctx
        // Clear the entire canvas
        ctx.clearRect(0,0,this.width,this.height);
        // Save current transformation state and apply camera transformations
        ctx.save();
        ctx.translate(this.width/2+this.camX, this.height/2+this.camY);  // Center the grid + camera offset
        ctx.scale(this.zoom,this.zoom);  // Apply zoom
        this.shapeGrid.zoom = this.zoom;
        this.shapeGrid.drawGrid(ctx, gridSize, this.cells)

        // Restore original transformation state
        ctx.restore();
    }

    addCell(x, y) {
        if (!this.cells.has(x)) this.cells.set(x, new Map());
        this.cells.get(x).set(y, true);
    }

    deleteCell(x, y) {
        if (this.cells.has(x)) {
            this.cells.get(x).delete(y);
            if (this.cells.get(x).size === 0) {
                this.cells.delete(x); // cleanup empty rows
            }
        }
    }

    hasCell(x, y) {
        return this.cells.has(x) && this.cells.get(x).has(y);
    }

    // Toggle cell state at screen coordinates (px, py)
    toggleAt(px, py) {
        const world = this.screenToWorld(px, py);
        const [x, y]  = this.worldToCell(world);  // returns numeric coords

        if (drawTiles.checked) {
            this.addCell(x, y);
        }
        else if (eraseTiles.checked) {
            this.deleteCell(x, y);
        }
        else {
            return; // PAN MODE
        }
    }
}



export {GridManager};