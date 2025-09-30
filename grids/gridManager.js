import { SquareGrid } from './squares.js';
import { HexagonGrid } from './hexagons.js';
import { TriangleGrid } from './triangles.js';

import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';


class GridManager {
    constructor(shape, canvas, init_cells = new Map(), useWebGL = true) {
        this.shape = shape;
        this.canvas = canvas;
        this.useWebGL = useWebGL;
        this.cells = init_cells

        this.gridRows = 10;
        this.gridCols = 10;
        this.infiniteGrid = false;

        this.cameraView = { camX: 0, camY: 0, zoom: 1 };
        this.colorSchema = {
            line: "#555555",
            0: "#280f6f",
            1: "#32cd32",
        }
;

        // Initialize grid logic
        switch (shape.value) {
            case "square":
                this.shapeGrid = new SquareGrid(this.colorSchema, 1000, 10000);
                break;
            case "hex":
                this.shapeGrid = new HexagonGrid(this.colorSchema, 1000, 10000);
                break;
            case "triangle":
                this.shapeGrid = new TriangleGrid(this.colorSchema, 1000, 10000);
                break;
            default:
                throw new Error(`Unknown grid shape: ${shape.value}`);
        }

        // Initialize renderer
        this.initializeRenderer(useWebGL);
        this.updateCanvasSize();
    }

    initializeRenderer(useWebGL) {
        try {
            if (useWebGL) {
                this.renderer = new WebGLRenderer(this.canvas);
                console.log("Using WebGL renderer");
            } else {
                this.renderer = new Canvas2DRenderer(this.canvas);
                console.log("Using Canvas2D renderer");
            }
        } catch (error) {
            console.warn("WebGL not supported, falling back to Canvas2D:", error);
            this.renderer = new Canvas2DRenderer(this.canvas);
            this.useWebGL = false;
        }
    }

    updateCanvasSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;

        if (this.renderer && this.renderer.updateCanvasSize) {
            this.renderer.updateCanvasSize();
        }
    }

    getVisibleBounds() {
        const halfW = this.width / (2 * this.cameraView.zoom);
        const halfH = this.height / (2 * this.cameraView.zoom);

        const minWorldX = -this.cameraView.camX / this.cameraView.zoom - halfW;
        const maxWorldX = -this.cameraView.camX / this.cameraView.zoom + halfW;
        const minWorldY = -this.cameraView.camY / this.cameraView.zoom - halfH;
        const maxWorldY = -this.cameraView.camY / this.cameraView.zoom + halfH;

        return [minWorldX, maxWorldX, minWorldY, maxWorldY];
    }

    drawGrid() {
        const bounds = this.getVisibleBounds();
        const geometry = this.shapeGrid.getGridGeometry(
            bounds, this.cells, this.gridCols, this.gridRows, this.infiniteGrid
        );

        if (this.useWebGL) {
            // WebGL renderer uses geometry data
            this.renderer.uploadGeometry(geometry);
            this.renderer.draw(this.cameraView);
        } else {
            // Canvas2D renderer can use geometry or direct drawing
            this.renderer.draw(this.cameraView, geometry);
        }
    }

    // Keep all other methods the same...
    screenToWorld(px, py) {
        return {
            x: (px - this.width/2 - this.cameraView.camX) / this.cameraView.zoom,
            y: (py - this.height/2 - this.cameraView.camY) / this.cameraView.zoom
        };
    }

    worldToCell(world) {
        return this.shapeGrid.worldToCell(world);
    }

    addCell(x, y) {
        if (!this.cells.has(x)) this.cells.set(x, new Map());
        this.cells.get(x).set(y, 1);
    }

    deleteCell(x, y) {
        if (!this.cells.has(x)) this.cells.set(x, new Map());
        this.cells.get(x).set(y, 0);
    }

    hasCell(x, y) {
        return this.cells.has(x) && this.cells.get(x).has(y);
    }

    getBounds(cols, rows, infinite) {
        if (infinite) return null;

        cols = Number(cols) || 0;
        rows = Number(rows) || 0;

        const minCol = -Math.floor(cols / 2);
        const maxCol = minCol + cols;
        const minRow = -Math.floor(rows / 2);
        const maxRow = minRow + rows;

        return [minCol, maxCol, minRow, maxRow];
    }

    checkBounds(x, y) {
        if (!this.infiniteGrid) {
            const cols = Number(this.gridCols) || 0;
            const rows = Number(this.gridRows) || 0;

            const minCol = -Math.floor(cols / 2);
            const maxCol = minCol + cols;
            const minRow = -Math.floor(rows / 2);
            const maxRow = minRow + rows;

            if (x < minCol || x > maxCol || y < minRow || y > maxRow) {
                return false;
            }
        }
        return true;
    }

    toggleAt(px, py) {
        const world = this.screenToWorld(px, py);
        const [x, y] = this.worldToCell(world);

        if (!this.checkBounds(x, y)) return;

        if (window.drawTiles && window.drawTiles.checked) {
            this.addCell(x, y);
        } else if (window.eraseTiles && window.eraseTiles.checked) {
            this.deleteCell(x, y);
        }
    }
}

export { GridManager };

