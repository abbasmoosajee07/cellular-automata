import { SquareGrid } from './tiles/square.js';
import { HexagonGrid } from './tiles/hexagon.js';
import { TriangleGrid } from './tiles/triangle.js';
import { RhomboidalGrid } from './tiles/rhomboid.js';

import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';

class GridManager {
    constructor(shape, canvas, init_cells, useWebGL = false) {
        this.shape = shape || "square";
        this.canvas = canvas;
        this.useWebGL = useWebGL;
        this.cells = init_cells;
        
        // Grid configuration
        this.gridCols = 20;
        this.gridRows = 20;
        this.infiniteGrid = false;
        this.boundaryType = "wrap";
        this.neighborType = "adjacent";
        
        // Camera & rendering
        this.cameraView = { camX: 0, camY: 0, zoom: 1 };
        this.colorSchema = this.createDefaultColorSchema();
        
        // Initialize components
        this.shapeGrid = this.createShapeGrid(this.shape);
        this.initializeRenderer(this.useWebGL);
        this.syncCellsToTexture();
        this.updateCanvasSize();
        this.createBoundary();
        this.cells.bounds = this.getBounds();
        
        // this.startRendering();
    }

    createDefaultColorSchema() {
        return {
            255: this.hexToRgb("#0f4812"),
            bg: this.hexToRgb("#000000"),
            1: this.hexToRgb("#32cd32"),
            11: this.hexToRgb("#ff3700"),
        };
    }

    createShapeGrid(shape) {
        const shapeMap = {
            "hex": HexagonGrid,
            "square": SquareGrid,
            "rhombus": RhomboidalGrid,
            "triangle": TriangleGrid
        };
        
        const GridClass = shapeMap[shape];
        if (!GridClass) throw new Error(`Unknown grid shape: ${shape}`);
        
        return new GridClass(this.colorSchema);
    }

    initializeRenderer(useWebGL) {
        try {
            if (useWebGL) {
                this.renderer = new WebGLRenderer(this.canvas, this.shapeGrid);
                this.shapeGrid.initGridTexture(this.renderer.gl, this.gridCols, this.gridRows);
                this.useWebGL = true;
                console.log("Using WebGL texture-based renderer");
            } else {
                throw new Error("Force Canvas2D fallback");
            }
        } catch (error) {
            this.renderer = new Canvas2DRenderer(this.canvas, this.shapeGrid);
            this.useWebGL = false;
            console.warn("WebGL not supported, using Canvas2D:", error);
        }
    }

    startRendering() {
        const renderLoop = () => {
            requestAnimationFrame(renderLoop);
        };
        renderLoop();
    }

    syncCellsToTexture() {
        const arr = this.cells.for_each_cell();
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];
            if (this.checkBounds(q, r, s))
                this.renderer.renderCell(this.cameraView, q, r, s, state);
        };
    }

    updateCanvasSize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.renderer.updateCanvasSize();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return [0.5, 0.5, 0.5, 1.0];
        
        return [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ];
    }

    screenToCell(px, py) {
        const world = this.shapeGrid.screenToWorld(px, py, this.width, this.height, this.cameraView);
        return this.shapeGrid.worldToCell(world);
    }

    setBoundaryType(boundaryType) {
        this.boundaryType = boundaryType;
        this.infiniteGrid = (boundaryType === "infinite");
    }

    createBoundary() {
        const [minQ, maxQ, minR, maxR] = this.getBounds();
        console.log(`Generating boundary from (Q${minQ},R${minR}) to (Q${maxQ},R${maxR})`);

        const boundary = 255;
        for (let q = minQ - 1; q <= maxQ + 1; q++) {
            this.changeCell(q, minR - 1, 0, boundary);
            this.changeCell(q, maxR + 1, 0, boundary);
        }
        for (let r = minR - 1; r <= maxR + 1; r++) {
            this.changeCell(minQ - 1, r, 0, boundary);
            this.changeCell(maxQ + 1, r, 0, boundary);
        }
    }

    changeCell(q, r, s, state) {
        // console.log(q, r, s, state);
        // this.cells.set_cell(q, r, s, state);
        this.renderer.renderCell(this.cameraView, q, r, s, state);
    }

    getBounds() {
        const cols = this.gridCols;
        const rows = this.gridRows;

        return [
            -Math.floor(cols / 2),
            Math.floor((cols - 1) / 2),
            -Math.floor(rows / 2),
            Math.floor((rows - 1) / 2)
        ];
    }

    checkBounds(q, r, s) {
        if (this.infiniteGrid) return true;
        
        const [minQ, maxQ, minR, maxR] = this.getBounds();
        return !(q < minQ || q > maxQ || r < minR || r > maxR);
    }

    clearAll() {
        this.cells.clear();
        this.renderer.clearAll();
    }

    drawLineBetweenPoints(startWorld, endWorld, mode) {
        const startCell = this.shapeGrid.worldToCell(startWorld);
        const endCell = this.shapeGrid.worldToCell(endWorld);

        if (!startCell || !endCell || startCell[0] === -1 || endCell[0] === -1) return;

        const [q1, r1, s1] = startCell;
        const [q2, r2, s2] = endCell;
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
        if (!this.checkBounds(q, r)) return false;
        // console.log(q, r, s);
        let newState;
        if (drawMode && eraseMode) {
            newState = 11;
        } else if (drawMode) {
            newState = 1;
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

    resizeGrid(newCols, newRows) {
        this.gridCols = newCols;
        this.gridRows = newRows;
        this.cells.resize(newCols, newRows, 4);
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.resizeGridTexture(this.renderer.gl, newCols, newRows, this.cells);
        }

        this.createBoundary();
        this.cells.bounds = this.getBounds();
        this.centerView();
    }

    setColorSchema(newSchema) {
        this.colorSchema = newSchema;
        this.shapeGrid.colorSchema = newSchema;

        for (const [key, state] of this.cells.cells) {
            const [q, r, s] = this.cells.parseCubeKey(key);
            this.renderer.renderCell(this.cameraView, q, r, s, state);
        }
    }

    drawGrid() {
        if (this.useWebGL) {
            const geometry = this.shapeGrid.getGridGeometry(this.gridCols, this.gridRows, null);
            this.renderer.uploadGeometry(geometry);
            this.renderer.draw(this.cameraView, geometry);
        } else {
            this.renderer.drawCanvas(this.cameraView, this.colorSchema, this.cells);
        }
    }

}

export { GridManager };