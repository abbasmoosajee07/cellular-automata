import { SquareGrid } from './tiles/square.js';
import { HexagonGrid } from './tiles/hexagon.js';
import { TriangleGrid } from './tiles/triangle.js';
import { RhomboidalGrid } from './tiles/rhomboid.js';

import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';

class GridManager {
    constructor(shape, canvas, init_cells, useWebGL = false) {
        this.shape = shape || "square";
        this.topology = "finite";
        this.useWebGL = useWebGL;
        this.grid_mesh = init_cells;
        this.canvas = canvas;

        // Grid configuration
        this.gridSize = [20, 20, 1]

        // Camera & rendering
        this.cameraView = { camX: 0, camY: 0, zoom: 0 };
        this.colorSchema = this.createDefaultColorSchema();

        // Initialize components
        this.shapeGrid = this.createShapeGrid(this.shape);
        this.grid_bounds = this.grid_mesh.get_bounds();
        this.initializeRenderer(this.useWebGL);
        this.renderer.colorSchema = this.colorSchema;
        this.updateCanvasSize();
        // this.startRendering();
    }

    createDefaultColorSchema() {
        const schema  = {
            grid: [0.1, 0.1, 1.1, 0.75],
            canvas: [0.0, 0.0, 0.0, 0.0],
            0: [0.1, 0.1, 1.1, 0.75],
            1: this.hexToRgb("#32cd32"),
            11: this.hexToRgb("#ff3700"),
        };
        return schema;
    }

    createShapeGrid(shape) {
        const shapeMap = {
            "square": SquareGrid,
            "hexagon": HexagonGrid,
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
                this.shapeGrid.initGridTexture(this.renderer.gl, this.gridSize[0], this.gridSize[1]);
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
            this.drawGrid();
            requestAnimationFrame(renderLoop);
        };
        renderLoop();
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

    changeCell(q, r, s, state) {
        this.grid_mesh.set_cell(q, r, s, state);
        this.renderer.renderCell(this.cameraView, q, r, s, state);
    }

    checkBounds(q, r, s) {
        if (this.infiniteGrid) return true;
        const [minQ, maxQ, minR, maxR, minS, maxS] = [...this.grid_bounds];
        return !(q < minQ || q > maxQ || r < minR || r > maxR);
    }

    clearAll() {
        this.grid_mesh.clear();
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

        this.renderer.updateView(this.cameraView);
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

    setColorSchema(newSchema) {
        this.colorSchema = newSchema;
        this.renderer.colorSchema = newSchema
        this.shapeGrid.colorSchema = newSchema;
        this.renderer.renderGrid(this.cameraView, this.grid_mesh);
    }

    showGridLimits() {
        let [minQ, maxQ, minR, maxR, minS, maxS] =
            this.topology === "infinite"
                ? this.grid_mesh.get_cell_extremes()
                : this.grid_bounds;

        // Clamp lower bounds
        minQ = Math.min(minQ, -10);
        minR = Math.min(minR, -10);

        // Clamp upper bounds
        maxS = Math.max(maxS, 9);
        maxR = Math.max(maxR, 9);

        return [minQ, maxQ, minR, maxR, minS, maxS];
    }

    fitGrid() {
        const [minQ, maxQ, minR, maxR, minS, maxS] = this.showGridLimits();

        let [minX, maxX, minY, maxY] = this.shapeGrid.screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS);

        // --- Dimensions ---
        const worldW = maxX - minX;
        const worldH = maxY - minY;

        // --- Zoom ---
        const zoomX = this.width  / worldW;
        const zoomY = this.height / worldH;
        const zoom  = Math.min(zoomX, zoomY);

        this.cameraView.zoom = zoom;

        // --- Center ---
        const centerX = (minX + maxX) * 0.5;
        const centerY = (minY + maxY) * 0.5;

        // --- Camera offset ---
        this.cameraView.camX = -centerX * zoom;
        this.cameraView.camY = -centerY * zoom;
        this.updateCanvasSize();
    }

    resizeGrid(newCols, newRows, newStates) {
        this.gridSize = [newCols, newRows, newStates];
        this.grid_mesh.resize(newCols, newRows, newStates);
        this.shapeGrid.gridRows = newRows;
        this.shapeGrid.gridCols = newCols;
        this.grid_bounds = this.grid_mesh.get_bounds();
        if (this.useWebGL && this.renderer.gl) {
            this.shapeGrid.initGridTexture(this.renderer.gl, newCols, newRows);
        }
    }

    renderGrid(updateCells = false) {
        const geometry = this.shapeGrid.getGridGeometry(this.gridSize);
        this.renderer.uploadGeometry(geometry);
        this.renderer.renderGrid(this.cameraView, this.grid_mesh, updateCells);
    }

}

export { GridManager };