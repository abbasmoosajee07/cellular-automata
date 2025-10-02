import { SquareGrid } from './squares.js';
import { HexagonGrid } from './hexagons.js';
import { TriangleGrid } from './triangles.js';

import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';

class GridManager {
    adj_neighbors = [[0, -1], [0, 1], [1, 0], [-1, 0]];

    constructor(shape, canvas, init_cells = new Map(), useWebGL = true) {
        this.shape = shape.value || shape;  // handle passing element or string
        this.canvas = canvas;
        this.useWebGL = useWebGL;
        this.cells = init_cells;
        this.neighborsMap = new Map(),

        // Grid defaults
        this.gridRows = 20;
        this.gridCols = 20;
        this.infiniteGrid = false;
        this.boundaryType = "wrap";
        this.neighborType = "adjacent";

        // Performance settings
        this.detail = 2000;
        this.simple = 10000;

        // Camera & colors
        this.cameraView = { camX: 0, camY: 0, zoom: 1 };
        this.colorSchema = {
            line: this.hexToRgb("#555555"),
            1: this.hexToRgb("#32cd32"),
        };

        // Initialize shape-specific grid
        this.shapeGrid = this.createShapeGrid(this.shape);

        // Initialize rendering pipeline
        this.initializeRenderer(this.useWebGL);
        this.updateCanvasSize();
    }

    createShapeGrid(shape) {
        const { colorSchema, detail, simple } = this;
        switch (shape) {
            case "square":   return new SquareGrid(colorSchema, detail, simple);
            case "hex":      return new HexagonGrid(colorSchema, detail, simple);
            case "triangle": return new TriangleGrid(colorSchema, detail, simple);
            default:
                throw new Error(`Unknown grid shape: ${shape}`);
        }
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

    setBoundaryType(boundaryType) {
        this.boundaryType = boundaryType;
        this.infiniteGrid = (boundaryType === "infinite");
    }

    getNeighbors(x, y) {
        const touch_neighbors = [[0, -1], [0, 1], [1, 0], [-1, 0], [-1, 1], [-1, -1], [1, 1], [1, -1]];
        const adj_neighbors = [[0, -1], [0, 1], [1, 0], [-1, 0]];

        const neighbors = [];
        for (const [dx, dy] of adj_neighbors) {
            const nx = dx + x;
            const ny = dy + y;
            neighbors.push([nx, ny]);
        }
        return neighbors;
    }

    buildNeighborsMap() {
        const neighborsMap = new Map();
        const [minCol, maxCol, minRow, maxRow] = this.getBounds();
        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const cellNeighbors = this.getNeighbors(c, r)
                neighborsMap.set([c, r], cellNeighbors);
            }
        }
        console.log("Neighbors dict", neighborsMap);
    }

    addNeighbors(x, y) {
        const valid_neighbors = this.getNeighbors(x, y);
        // console.log("", valid_neighbors);
        this.neighborsMap.set([x, y], valid_neighbors)
        // console.log("", this.neighborsMap);
    }

    randomCells() {
        const [minCol, maxCol, minRow, maxRow] = this.getBounds();
        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const status = Math.random() < 0.5 ? 0 : 1; // 50/50 chance
                this.changeCell(c, r, status);
            }
        }
        this.drawGrid();
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

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ] : [0.5, 0.5, 0.5, 1.0];
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

    changeCell(x, y, state) {
        if (!this.cells.has(x)) this.cells.set(x, new Map());
        this.cells.get(x).set(y, state);
        this.addNeighbors(x, y);
    }

    getBounds() {
        const cols = Number(this.gridCols) || 0;
        const rows = Number(this.gridRows) || 0;

        const minCol = -Math.floor(cols / 2);
        const maxCol = minCol + cols;
        const minRow = -Math.floor(rows / 2);
        const maxRow = minRow + rows;

        return [minCol, maxCol, minRow, maxRow];
    }

    checkBounds(x, y) {
        if (!this.infiniteGrid) {
            const [minCol, maxCol, minRow, maxRow] = this.getBounds();
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
            this.changeCell(x, y, 1);  // Add Cell
        } else if (window.eraseTiles && window.eraseTiles.checked) {
            this.changeCell(x, y, 0); // Delete Cell
        }
    }
}

export { GridManager };

