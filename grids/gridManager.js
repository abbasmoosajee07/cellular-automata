import { SquareGrid } from './tiles/square.js';
import { HexagonGrid } from './tiles/hexagon.js';
import { TriangleGrid } from './tiles/triangle.js';
import { RhomboidalGrid } from './tiles/rhomboid.js';

import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';

class GridManager {
    adj_neighbors = [[0, -1], [0, 1], [1, 0], [-1, 0]];

    constructor(shape, canvas, init_cells = new Map(), useWebGL = false) {
        this.shape = shape || "square";
        this.canvas = canvas;
        this.useWebGL = useWebGL;
        this.cells = init_cells;
        this.neighborsMap = new Map();

        // Grid defaults
        this.gridRows = 20;
        this.gridCols = 20;
        this.infiniteGrid = false;
        this.boundaryType = "wrap";
        this.neighborType = "adjacent";

        // Camera & colors
        this.cameraView = { camX: 0, camY: 0, zoom: 1 };
        this.colorSchema = {
            line: this.hexToRgb("#555555"),
            1: this.hexToRgb("#32cd32"),
        };
        this.drawColor = this.colorSchema[1];
        this.bgColor = [0.5,0.5,0.5,0];//this.hexToRgb("");
        // console.log(this.bgColor);

        // Initialize shape-specific grid
        this.shapeGrid = this.createShapeGrid(this.shape);
        
        // Initialize renderer (WebGL or Canvas2D)
        this.initializeRenderer(this.useWebGL);
        
        // Initialize grid - only call initGridTexture if we have a valid WebGL context
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.initGridTexture(this.renderer.gl, this.gridCols);
        } else {
            // For Canvas2D, manually set the grid size without calling initGridTexture
            this.shapeGrid.gridSize = this.gridCols;
            this.shapeGrid.useWebGL = false;
        }
        
        // Sync existing cells
        this.syncCellsToTexture();
        
        this.updateCanvasSize();
        
        // Start continuous rendering
        this.startRendering();
    }

    createShapeGrid(shape) {
        const { colorSchema } = this;
        switch (shape) {
            case "square":   return new SquareGrid(colorSchema);
            case "hex":  return new HexagonGrid(colorSchema);
            case "rhombus":  return new RhomboidalGrid(colorSchema);
            case "triangle":  return new TriangleGrid(colorSchema);
            default:
                throw new Error(`Unknown grid shape: ${shape}`);
        }
    }

    initializeRenderer(useWebGL) {
        try {
            if (useWebGL) {
                this.renderer = new WebGLRenderer(this.canvas, this.shapeGrid);
                console.log("Using WebGL texture-based renderer");
                this.useWebGL = true;
            } else {
                this.renderer = new Canvas2DRenderer(this.canvas, this.shapeGrid);
                console.log("Using Canvas2D renderer");
                this.useWebGL = false;
            }
        } catch (error) {
            console.warn("WebGL not supported, falling back to Canvas2D:", error);
            this.renderer = new Canvas2DRenderer(this.canvas, this.shapeGrid);
            this.useWebGL = false;
        }
    }

    startRendering() {
        const renderLoop = () => {
            this.drawGrid();
            requestAnimationFrame(renderLoop);
        };
        renderLoop();
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

    syncCellsToTexture() {
        // Sync existing cells data
        for (const [col, colMap] of this.cells) {
            for (const [row, state] of colMap) {
                if (state && col < this.gridCols && row < this.gridRows) {
                    // Only update texture if in WebGL mode
                    if (this.useWebGL && this.renderer.gl) {
                        this.shapeGrid.setCellState(this.renderer.gl, col, row, state);
                    }
                }
            }
        }
    }

    screenToCell(px, py) {
        const world = this.shapeGrid.screenToWorld(px, py, this.width, this.height, this.cameraView);
        return this.shapeGrid.worldToCell(world);
    }

    setBoundaryType(boundaryType) {
        this.boundaryType = boundaryType;
        this.infiniteGrid = (boundaryType === "infinite");
    }

    getNeighbors(x, y) {
        const neighbors = [];
        for (const [dx, dy] of this.adj_neighbors) {
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
        // console.log("Neighbors dict", neighborsMap);
    }

    addNeighbors(x, y) {
        const valid_neighbors = this.getNeighbors(x, y);
        this.neighborsMap.set([x, y], valid_neighbors)
    }

    randomCells() {
        const [minCol, maxCol, minRow, maxRow] = this.getBounds();
        // console.log(minCol, maxCol, minRow, maxRow);
        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const status = Math.random() < 0.5 ? 0 : 1;
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

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ] : [0.5, 0.5, 0.5, 1.0];
    }

    changeCell(x, y, state) {
        if (!this.cells.has(x)) this.cells.set(x, new Map());
        this.cells.get(x).set(y, state);
        
        // Update texture only if in WebGL mode
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.setCellState(this.renderer.gl, x, y, state);
        }
        
        this.addNeighbors(x, y);
    }

    getBounds() {
        const cols = Number(this.gridCols) || 0;
        const rows = Number(this.gridRows) || 0;

        const minCol = 0;
        const maxCol = cols - 1;
        const minRow = 0;
        const maxRow = rows - 1;

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

    clearAll() {
        // Update texture only if in WebGL mode
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.clearGrid(this.renderer.gl);
        }
        this.cells.clear();
    }

    drawLineBetweenPoints(startWorld, endWorld, mode) {
        const startCell = this.shapeGrid.worldToCell(startWorld);
        const endCell = this.shapeGrid.worldToCell(endWorld);

        if (!startCell || !endCell) return;

        const [x1, y1] = startCell;
        const [x2, y2] = endCell;

        // Simple line drawing algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = (x1 < x2) ? 1 : -1;
        const sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            if (this.checkBounds(x, y)) {
                const state = (mode === 'draw') ? 1 : 0;
                this.changeCell(x, y, state);
            }

            if (x === x2 && y === y2) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    resizeGrid(newCols, newRows) {

        this.gridCols = newCols;
        this.gridRows = newRows;

        // Save current cells data
        const oldCells = new Map();
        for (const [col, colMap] of this.cells) {
            if (col < newCols) {
                const newColMap = new Map();
                for (const [row, state] of colMap) {
                    if (row < newRows && state) {
                        newColMap.set(row, state);
                    }
                }
                if (newColMap.size > 0) {
                    oldCells.set(col, newColMap);
                }
            }
        }

        // Resize the texture (only in WebGL mode)
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.resizeGridTexture(this.renderer.gl, newCols, oldCells);
        } else {
            // For Canvas2D, just update the grid size
            this.shapeGrid.gridSize = newCols;
        }
        
        // Update cells with the resized data
        this.cells = oldCells;
        
        // Re-center the view
        this.centerView();
    }

    centerView() {
        this.cameraView.camX = 0;
        this.cameraView.camY = 0;
        this.cameraView.zoom = 1;
    }

    drawGrid() {
        const bounds = this.getVisibleBounds();

        const geometry = this.shapeGrid.getGridGeometry(
            bounds, this.cells, this.gridCols, this.gridRows, this.infiniteGrid, null
        );

        if (this.useWebGL) {
            // WebGL path
            this.renderer.uploadGeometry(geometry);
            this.renderer.draw(this.cameraView, geometry, this.drawColor, this.bgColor);
        } else {
            // Canvas2D path - pass cells for rendering
            this.renderer.drawCanvas(this.cameraView, this.drawColor, this.bgColor, this.cells);
        }
    }

    toggleAt(px, py, drawMode, eraseMode) {
        const cell = this.screenToCell(px, py);
        if (!cell) return false;

        const [x, y] = cell;

        let newState;
        if (drawMode) {
            newState = 1;
        } else if (eraseMode) {
            newState = 0;
        } else {
            const currentState = (this.cells.has(x) && this.cells.get(x).has(y))
                ? this.cells.get(x).get(y)
                : 0;
            newState = currentState ? 0 : 1;
        }

        this.changeCell(x, y, newState);

        // 🎵 play sound when toggled
        // this.playToggleSound(newState === 1);

        return true;
    }

    playToggleSound(isActive) {
        const audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        this.audioCtx = audioCtx;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Set frequency based on on/off
        osc.frequency.value = isActive ? 600 : 200;

        // Volume envelope (quick click)
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

        // Connect and play
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

}

export { GridManager };

