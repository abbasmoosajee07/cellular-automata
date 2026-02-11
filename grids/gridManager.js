/* Import Shape Grid Classes */
import { SquareGrid } from './tiles/square.js';
import { HexagonGrid } from './tiles/hexagon.js';
import { TriangleGrid } from './tiles/triangle.js';
import { RhomboidalGrid } from './tiles/rhomboid.js';

/* Import Renderers */
import { WebGLRenderer } from '../renderer/WebGL.js';
import { Canvas2DRenderer } from '../renderer/Canvas2d.js';

/* Import Render Caches */
import { DirectRender } from '../renderer/DirectRender.js';
import { ChunkedRender } from '../renderer/ChunkedRender.js';

class GridManager {
    constructor(
        shape, gridSize,
        init_engine, grid_config,
        canvas,  useWebGL = false
    ) {
        // Core refs
        this.canvas = canvas;
        this.useWebGL = useWebGL;
        this.grid_mesh = init_engine;

        // Grid configuration
        this.shape = shape;
        this.gridSize = gridSize;
        this.bounds = grid_config.bounds;
        this.chunked = grid_config.cell_struct === "chunk_cells";

        // Camera & rendering state
        this.cameraView = { camX: 0, camY: 0, zoom: 0 };
        this.colorSchema = this.createDefaultColorSchema();

        // Grid + renderer setup
        this.shapeGrid = this.createShapeGrid(shape);
        this.renderer = this.initializeRenderer(useWebGL);
        this.renderCache = this.selectCache(this.chunked);
        this.updateCanvasSize();
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

        return new GridClass(this.colorSchema, this.gridSize);
    }

    initializeRenderer(useWebGL) {
        let renderer;
        try {
            if (useWebGL) {
                renderer = new WebGLRenderer(this.canvas, this.shapeGrid, this.chunked);
                this.useWebGL = true;
            } else {
                throw new Error("Force Canvas2D fallback");
            }
        } catch (error) {
            renderer = new Canvas2DRenderer(this.canvas, this.shapeGrid, this.chunked);
            this.useWebGL = false;
        }
        return renderer;
    }

    selectCache(chunked) {
        let renderCache;
        this.chunkSize = this.grid_mesh.get_chunk_size();
        if (chunked) {
            renderCache = new ChunkedRender(
                this, this.chunkSize, this.useWebGL
            );
        } else {
            renderCache = new DirectRender(this);
        }
        return renderCache;
    }

    startRendering() {
        const renderLoop = () => {
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
        const world = this.shapeGrid.screenToWorld(
            px, py,
            this.width, this.height, this.cameraView
        );
        return this.shapeGrid.worldToCell(world);
    }

    changeCell(q, r, s, state) {
        this.grid_mesh.set_cell(q, r, s, state);
        this.renderCache.changeCell(q, r, s, state);
    }

    checkBounds(q, r, s) {
        const [minQ, maxQ, minR, maxR, minS, maxS] = [...this.bounds];
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
        const cell = this.screenToCell(px, py);
        const [q, r, s] = cell;

        if (!this.checkBounds(q, r)) return false;

        let newState;
        if (drawMode && eraseMode) {
            newState = 11;
        } else if (drawMode) {
            newState = 1;
        } else if (eraseMode) {
            newState = 0;
        }

        this.changeCell(q, r, s, newState);
        this.renderGrid();
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

    selectGridLimits() {
        let [minQ, maxQ, minR, maxR, minS, maxS] =
            this.chunked
                ? this.grid_mesh.get_cell_extremes()
                : this.bounds;

        // Clamp lower bounds
        minQ = Math.min(minQ, -10);
        minR = Math.min(minR, -10);

        // Clamp upper bounds
        maxS = Math.max(maxS, 9);
        maxR = Math.max(maxR, 9);

        return [minQ, maxQ, minR, maxR, minS, maxS];
    }

    fitGrid() {
        const [minQ, maxQ, minR, maxR, minS, maxS] = this.selectGridLimits();
        const gridCorners = this.shapeGrid.getGridCorners(
            minQ, maxQ, minR, maxR, minS, maxS
        );

        const worldCorners = gridCorners.map(c =>
            this.shapeGrid.cellToWorld(c.q, c.r, c.s)
        );

        const xs = worldCorners.map(p => p.x);
        const ys = worldCorners.map(p => p.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const worldW = maxX - minX;
        const worldH = maxY - minY;

        const zoomX = this.width  / worldW;
        const zoomY = this.height / worldH;
        const zoom  = Math.min(zoomX, zoomY);

        this.cameraView.zoom = zoom;

        const worldCX = (minX + maxX) * 0.5;
        const worldCY = (minY + maxY) * 0.5;

        this.cameraView.camX = -worldCX * zoom;
        this.cameraView.camY =  worldCY * zoom;
    }

    renderGrid(updateCells = false) {
        // Screen → world → cell bounds
        const tl = this.screenToCell(0, 0);
        const br = this.screenToCell(this.width, this.height);
        this.renderCache.renderGrid(tl, br, updateCells);
    }

}

export { GridManager };