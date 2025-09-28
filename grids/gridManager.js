import { SquareGrid } from './squares.js';
import { HexagonGrid } from './hexagons.js';
import { TriangleGrid } from './triangles.js';


class GridManager {
    constructor(shape, canvas, init_cells = new Map()) {
        this.shape = shape;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.size = 10;

        // Camera + zoom
        this.cameraView = { camX: 0, camY: 0, zoom: 1,}
        this.colorSchema = {
            "line": "#555555",
            0: "#111111",
            1: "#32cd32",
        }

        this.cells = init_cells;
        switch (shape.value) {
            case "square":
                this.shapeGrid = new SquareGrid(this.colorSchema);
                break;
            case "triangle":
                this.shapeGrid = new TriangleGrid(this.colorSchema);
                break;
            case "hex":
                this.shapeGrid = new HexagonGrid(this.colorSchema);
                break;
            default:
                throw new Error(`Unknown grid shape: ${shape.value}`);
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
            x: (px - this.width/2 - this.cameraView["camX"]) / this.cameraView["zoom"],  // Account for camera pan and zoom
            y: (py - this.height/2 - this.cameraView["camY"]) / this.cameraView["zoom"]
        };
    }

    // Convert world coordinates to specific cell coordinates based on grid shape
    worldToCell(world) {
        return this.shapeGrid.worldToCell(world);
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.translate(this.width/2 + this.cameraView.camX, this.height/2 + this.cameraView.camY);
        ctx.scale(this.cameraView.zoom, this.cameraView.zoom);
        this.shapeGrid.zoom = this.cameraView.zoom;

        // --- compute visible world bounds ---
        const halfW = this.width / (2 * this.cameraView.zoom);
        const halfH = this.height / (2 * this.cameraView.zoom);

        const minWorldX = -this.cameraView.camX/this.cameraView.zoom - halfW;
        const maxWorldX = -this.cameraView.camX/this.cameraView.zoom + halfW;
        const minWorldY = -this.cameraView.camY/this.cameraView.zoom - halfH;
        const maxWorldY = -this.cameraView.camY/this.cameraView.zoom + halfH;

        // --- delegate to shapeGrid to draw only visible cells ---
        this.shapeGrid.drawGrid(ctx, minWorldX, maxWorldX, minWorldY, maxWorldY, this.cells);

        ctx.restore();
    }

    addCell(x, y) {
        if (!this.cells.has(x)) this.cells.set(x, new Map());
        this.cells.get(x).set(y, 1);
    }

    deleteCell(x, y) {
        // if (!this.cells.has(x)) this.cells.set(x, new Map());
        // this.cells.get(x).set(y, "dead");
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

        // // Bounds check: skip if outside the drawn grid
        // if (x < -this.size || x > this.size || y < -this.size || y > this.size) {
        //     return;
        // }

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