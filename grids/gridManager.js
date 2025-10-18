import { SquareGrid } from './tiles/square.js';
import { HexagonGrid } from './tiles/hexagon.js';
import { TriangleGrid } from './tiles/triangle.js';
import { RhomboidalGrid } from './tiles/rhomboid.js';

import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';

class GridManager {
    adj_neighbors = [[0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0]];

    constructor(shape, canvas, init_cells = new Map(), useWebGL = false) {
        this.shape = shape || "square";
        this.canvas = canvas;
        this.useWebGL = useWebGL;
        this.cells = init_cells;
        this.neighborsMap = new Map();
        this.boundaryCells = new Map();

        // Grid defaults
        this.gridCols = 20;
        this.gridRows = 20;
        this.infiniteGrid = false;
        this.boundaryType = "wrap";
        this.neighborType = "adjacent";

        // Camera & colors
        this.cameraView = { camX: 0, camY: 0, zoom: 1 };
        this.colorSchema = {
            "boundary": this.hexToRgb("#fbff00"),
            bg: this.hexToRgb("#000000"), // Add background color to schema
            1: this.hexToRgb("#32cd32"),
            11: this.hexToRgb("#ff3700"),
        };

        // Initialize shape-specific grid
        this.shapeGrid = this.createShapeGrid(this.shape);

        // Sync grid dimensions to shape grid
        this.shapeGrid.gridCols = this.gridCols;
        this.shapeGrid.gridRows = this.gridRows;

        // Initialize renderer
        this.initializeRenderer(this.useWebGL);

        // Initialize grid
        if (this.useWebGL && this.renderer.gl) {
            if (this.shapeGrid.initGridTexture) {
                this.shapeGrid.initGridTexture(this.renderer.gl, this.gridCols, this.gridRows);
            } else if (this.shapeGrid.initForGL) {
                this.shapeGrid.initForGL(this.renderer.gl);
            }
        } else {
            // For Canvas2D, manually set the grid size
            this.shapeGrid.useWebGL = false;
        }

        // Sync existing cells
        this.syncCellsToTexture();

        this.updateCanvasSize();
        this.createBoundary();

        // Start continuous rendering
        this.startRendering();
    }

    createBoundary() {
        const [minQ, maxQ, minR, maxR] = this.getBounds();
        console.log(`Generating cells from (Q${minQ},R${minR}) to (Q${maxQ},R${maxR})`);
        const s = 0;
        const shift = 1;
        const boundary = "boundary";
        for (let q = minQ - shift; q <= maxQ + shift; q++) {
            this.changeCell(q, minR -1, s, boundary);
            this.changeCell(q, maxR +1, s, boundary);
        }
        for (let r = minR - shift; r <= maxR + shift; r++) {
            this.changeCell(minQ -1, r, s, boundary);
            this.changeCell(maxQ + 1, r, s, boundary);
        }
    }

    createShapeGrid(shape) {
        const { colorSchema } = this;
        switch (shape) {
            case "hex": return new HexagonGrid(colorSchema);
            case "square": return new SquareGrid(colorSchema);
            case "rhombus": return new RhomboidalGrid(colorSchema);
            case "triangle": return new TriangleGrid(colorSchema);
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
            // this.drawGrid();
            requestAnimationFrame(renderLoop);
        };
        renderLoop();
    }

    syncCellsToTexture() {
        for (const [key, state] of this.cells) {
            const [q, r, s] = this.parseCubeKey(key);
            if (state && this.checkBounds(q, r, s)) {
                if (this.useWebGL && this.renderer.gl) {
                    this.shapeGrid.setCellState(this.renderer.gl, q, r, s, state);
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

    getNeighbors(q, r, s) {
        const neighbors = [];
        for (const [dq, dr, ds] of this.adj_neighbors) {
            const nq = dq + q;
            const nr = dr + r;
            const ns = ds + s;
            neighbors.push([nq, nr, ns]);
        }
        return neighbors;
    }

    buildNeighborsMap() {
        const neighborsMap = new Map();
        const [minQ, maxQ, minR, maxR] = this.getBounds();

        for (let q = minQ; q <= maxQ; q++) {
            for (let r = minR; r <= maxR; r++) {
                const s = 0; // Square grid uses s = 0
                const cellNeighbors = this.getNeighbors(q, r, s);
                neighborsMap.set(this.createCubeKey(q, r, s), cellNeighbors);
            }
        }
        return neighborsMap;
    }

    addNeighbors(q, r, s) {
        const valid_neighbors = this.getNeighbors(q, r, s);
        this.neighborsMap.set(this.createCubeKey(q, r, s), valid_neighbors);
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

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ] : [0.5, 0.5, 0.5, 1.0];
    }

    createCubeKey(q, r, s) {
        return `${q},${r},${s}`;
    }

    parseCubeKey(key) {
        const [q, r, s] = key.split(',').map(Number);
        return [q, r, s];
    }

    changeCell(q, r, s, state) {
        const key = this.createCubeKey(q, r, s);
        if (state === 0) {
            this.cells.delete(key);
        } else {
            this.cells.set(key, state);
        }

        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.setCellState(this.renderer.gl, q, r, s, state);
        }

        this.addNeighbors(q, r, s);
    }

    getBounds() {
        // Use the actual grid dimensions with centered coordinates
        const cols = this.gridCols;
        const rows = this.gridRows;

        // Center the grid around (0,0)
        const minQ = -Math.floor(cols / 2);
        const maxQ = Math.floor((cols - 1) / 2);
        const minR = -Math.floor(rows / 2);
        const maxR = Math.floor((rows - 1) / 2);

        return [minQ, maxQ, minR, maxR];
    }

    checkBounds(q, r, s) {
        if (!this.infiniteGrid) {
            const [minQ, maxQ, minR, maxR] = this.getBounds();
            if (q < minQ || q > maxQ || r < minR || r > maxR) {
                return false;
            }
        }
        return true;
    }

    clearAll() {
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.clearGrid(this.renderer.gl);
        }
        this.cells.clear();
    }

    drawLineBetweenPoints(startWorld, endWorld, mode) {
        const startCell = this.shapeGrid.worldToCell(startWorld);
        const endCell = this.shapeGrid.worldToCell(endWorld);

        if (!startCell || !endCell || startCell[0] === -1 || endCell[0] === -1) return;

        const [q1, r1, s1] = startCell;
        const [q2, r2, s2] = endCell;

        // Cube coordinate line drawing
        const N = Math.max(Math.abs(q2 - q1), Math.abs(r2 - r1), Math.abs(s2 - s1));
        
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const q = Math.round(q1 + (q2 - q1) * t);
            const r = Math.round(r1 + (r2 - r1) * t);
            const s = -q - r;
            
            if (this.checkBounds(q, r, s)) {
                const state = (mode === 'draw') ? 1 : 0;
                this.changeCell(q, r, s, state);
            }
        }
    }

    centerView() {
        this.cameraView.camX = 0;
        this.cameraView.camY = 0;
        this.cameraView.zoom = 1;
    }

    toggleAt(px, py, drawMode, eraseMode) {
        const world = this.shapeGrid.screenToWorld(px, py, this.width, this.height, this.cameraView);
        const cell = this.shapeGrid.worldToCell(world);

        const [q, r, s] = cell;
        console.log("toggle", q,r,s);
        if (!this.checkBounds(q, r,)) {return;}

        let newState;
        if (drawMode && eraseMode) {
            newState = 11;
        } else if (drawMode) {
            newState =  1;
        } else if (eraseMode) {
            newState = 0;
        }
        this.changeCell(q, r, s, newState);
        return true;
    }

    playToggleSound(isActive) {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        const audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        this.audioCtx = audioCtx;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.frequency.value = isActive ? 600 : 200;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    randomCells() {
        const [minQ, maxQ, minR, maxR] = this.getBounds();
        // console.log(`Grid dimensions: ${this.gridCols}x${this.gridRows}`);
        // console.log(`Generating cells from (${minQ},${minR}) to (${maxQ},${maxR})`);
        // console.log(`Total cells: ${(maxQ - minQ + 1) * (maxR - minR + 1)}`);

        let cellsGenerated = 0;
        for (let q = minQ; q <= maxQ; q++) {
            for (let r = minR; r <= maxR; r++) {
                const status = Math.random() < 0.5 ? 0 : 1;
                const s = 0; // Square grid uses s = 0
                if (status === 1) {
                    this.changeCell(q, r, s, status);
                    cellsGenerated++;
                }
            }
        }
        // console.log(`Cells activated: ${cellsGenerated}`);
        this.drawGrid();
    }

    resizeGrid(newCols, newRows) {
        this.gridCols = newCols;
        this.gridRows = newRows;

        // Update shape grid dimensions
        this.shapeGrid.gridCols = newCols;
        this.shapeGrid.gridRows = newRows;

        // Save current cells data
        const oldCells = new Map();
        for (const [key, state] of this.cells) {
            const [q, r, s] = this.parseCubeKey(key);
            if (this.checkBounds(q, r, s) && state) {
                oldCells.set(key, state);
            }
        }

        // Resize the texture
        if (this.useWebGL && this.renderer.gl) {
            if (this.shapeGrid.resizeGridTexture) {
                this.shapeGrid.resizeGridTexture(this.renderer.gl, newCols, newRows, oldCells);
            } else if (this.shapeGrid.initGridTexture) {
                this.shapeGrid.initGridTexture(this.renderer.gl, newCols, newRows);
                // Re-sync cells after texture resize
                for (const [key, state] of oldCells) {
                    const [q, r, s] = this.parseCubeKey(key);
                    this.shapeGrid.setCellState(this.renderer.gl, q, r, s, state);
                }
            }
        }
        this.createBoundary();

        // Update cells with the resized data
        this.cells = oldCells;

        // Re-center the view
        this.centerView();
    }

    setColorSchema(newSchema) {
        this.colorSchema = newSchema;
        this.bgColor = this.colorSchema.bg || [0.5, 0.5, 0.5, 0];

        // If using WebGL, we need to update all cell textures
        if (this.useWebGL && this.renderer.gl) {
            for (const [key, state] of this.cells) {
                const [q, r, s] = this.parseCubeKey(key);
                this.shapeGrid.setCellState(this.renderer.gl, q, r, s, state);
            }
        }
    }

    drawGrid() {

        if (this.useWebGL) {
            // WebGL path
            const geometry = this.shapeGrid.getGridGeometry(
                this.gridCols, this.gridRows, this.infiniteGrid, null
            );
            this.renderer.uploadGeometry(geometry);
            this.renderer.draw(this.cameraView, geometry);
        } else {
            // Canvas2D path - use schema bg color
            this.renderer.drawCanvas(this.cameraView, this.colorSchema, this.cells);
        }
    }

}

export { GridManager };