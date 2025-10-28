import {  GridManager  } from '../grids/gridManager.js';
import init, { WasmCellManager  } from "../pkg/cell_manager.js";

class SimulatorController{
    docIDs = [
        "gridCanvas", "menuPanel", "menuToggle", "reMap",
        "drawTiles", "eraseTiles", "clearGrid", "randomFill",
        "rowInput", "colInput", "resetView", "pinLoc",
        "neighborTiles",
    ]

    shapeStates = {"hex": 1, "square": 1, "rhombus": 3, "triangle": 2};

    async initSim(useWebgl = true) {
        this.useWebgl = useWebgl;
        this.gridSize = [20, 20];
        this.selectNeighbor();
        await init(); // <-- wait for WASM to finish loading

        this.initElements();
        await this.setupGrid(); // make initGrid async as well
        this.setupGridControls();
        this.setupEventListeners();
        this.setupCanvasControls();
        this.setupMenuControls();
        // this.randomCells();
        this.gridManager.changeCell(0,0,0,1);
        this.gridManager.drawGrid();
    }

    selectNeighbor() {
        // Neighborhood definitions
        const neighborhoodTypes = {
        vonNeumann: {
            label: "Von Neumann (4)",
            desc: "Each cell interacts with its four orthogonal neighbors (N, S, E, W).",
        },
        moore: {
            label: "Moore (8)",
            desc: "Includes all eight surrounding cells (orthogonal + diagonal). Used in Conway’s Life.",
        },
        hex: {
            label: "Hexagonal (6)",
            desc: "Six neighbors arranged like a hex grid — no diagonal or corner conflicts.",
        },
        margolus: {
            label: "Margolus",
            desc: "Uses alternating 2×2 block neighborhoods that shift every generation.",
        },
        extended: {
            label: "Extended Moore (radius 2)",
            desc: "Covers all cells within a square of radius 2 (total of 24 neighbors).",
        },
        circular: {
            label: "Circular (radius r)",
            desc: "All cells within a circular radius r of the center cell influence it.",
        },
        custom: {
            label: "Custom / Weighted",
            desc: "Manually define which cells are neighbors or assign weights to them.",
        },
        };

        // Elements
        const neighborSelect = document.getElementById("neighbor-type");
        const neighborDesc = document.getElementById("neighbor-desc");

        // Populate dropdown
        Object.entries(neighborhoodTypes).forEach(([value, { label }]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        neighborSelect.appendChild(option);
        });

        // Default selection
        neighborSelect.value = "moore";
        neighborDesc.textContent = neighborhoodTypes["moore"].desc;

        // Update description when changed
        neighborSelect.addEventListener("change", (e) => {
        const selected = e.target.value;
        neighborDesc.textContent = neighborhoodTypes[selected]?.desc || "";
        });

        this.neighborsType = "moore";

    }

    initElements() {
        for (const id of this.docIDs) {
            this[id] = document.getElementById(id);
        }
    }

    delElements() {
        this.docIDs.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                const newElem = elem.cloneNode(true);
                elem.parentNode.replaceChild(newElem, elem);
            }
        });
    }

    setupMenuControls() {
        const panel = this.menuPanel;

        this.menuToggle.addEventListener('click', () => {
        panel.classList.toggle('open');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // deactivate all
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sidenav-panels .panel').forEach(p => p.classList.remove('active'));

            // activate chosen
            btn.classList.add('active');
            document.getElementById(btn.dataset.panel).classList.add('active');
        });
        });
    }

    async setupGrid({ preserveState = false } = {}) {
        const shape = this.selectedShape || "square";
        const shapeStates = this.shapeStates[shape];
        const [cols, rows] = this.gridSize;

        const oldGrid = this.gridManager || null;

        // If we preserve, reuse old cells; otherwise make new
        const cellManager = preserveState && oldGrid
            ? oldGrid.cells
            : new WasmCellManager(cols, rows, shapeStates);

        // Always create a new GridManager — safer for WebGL + camera reinit
        this.gridManager = new GridManager(
            shape,
            this.gridCanvas,
            cellManager,
            this.useWebgl
        );

        // Restore camera and view if requested
        if (preserveState && oldGrid) {
            Object.assign(this.gridManager.cameraView, oldGrid.cameraView);
            this.gridManager.setBoundaryType(this.boundsType);
            this.gridManager.neighborType = this.neighborsType;
        }

        // Sync grid sizes and texture
        this.gridManager.gridCols = parseInt(this.colInput.value);
        this.gridManager.gridRows = parseInt(this.rowInput.value);
        this.gridManager.resizeGrid(cols, rows, shapeStates);
        this.gridManager.syncCellsToTexture();

        this.cells = this.gridManager.cells;
        this.savedView = { ...this.gridManager.cameraView };

        this.gridManager.drawGrid();
    }

    setupGridControls() {
        // --- Grid size controls ---
        this.rowInput.addEventListener('input', () => {
            this.gridSize[1] = parseInt(this.rowInput.value) || 20; // rows
        });

        this.colInput.addEventListener('input', () => {
            this.gridSize[0] = parseInt(this.colInput.value) || 20; // cols
        });

        // --- Shape selection ---
        document.querySelectorAll('input[name="shape"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) { this.selectedShape = radio.value; }
            });
        });

        // --- Boundary behavior ---
        document.querySelectorAll('input[name="bounds"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) { this.boundsType = radio.value; }
            });
        });

        // --- Rebuild / Remap Grid Button ---
        this.reMap.addEventListener('click', () => {
            this.setupGrid({ preserveState: true });
        });
    }

    setupEventListeners() {
        this.resetView.addEventListener('click', () => {
            this.gridManager.cameraView = { ...this.savedView };
            this.gridManager.drawGrid();
        });

        this.pinLoc.addEventListener('click', () => {
            this.savedView = { ...this.gridManager.cameraView };
        });

        this.clearGrid.addEventListener('click', () => {
            // use existing API so texture and internal state both cleared
            this.gridManager.clearAll();
            this.gridManager.drawGrid();
        });

        this.randomFill.addEventListener('click', () => this.randomCells());

        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
            this.gridManager.drawGrid();
        });

        this.neighborTiles.addEventListener('click', () => {this.fillNeighbors()});
    }

    setupCanvasControls() {
        let painting = false;
        let draggingCam = false;
        let lastX = 0, lastY = 0;
        let lastTouchDistance = null;
        const MIN_ZOOM = 10;
        const MAX_ZOOM = 0.0001;

        const getPointer = (e) => {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY, touches: e.touches.length };
            }
            this.updateStatusBar(e.clientX, e.clientY);
            return { x: e.clientX, y: e.clientY, touches: 1 };
        };

        const handleDown = (pointer) => {
            if (pointer.touches === 1) {
                if (this.drawTiles.checked || this.eraseTiles.checked) {
                    painting = true;
                    this.toggleAt(pointer.x, pointer.y);
                } else {
                    draggingCam = true;
                }
                lastX = pointer.x;
                lastY = pointer.y;
            } else if (pointer.touches === 2) {
                painting = false;
                draggingCam = false;
                lastTouchDistance = null;
            }
        };

        const handleMove = (e) => {
            if (e.touches && e.touches.length === 2) {
                // Pinch zoom
                const [t1, t2] = e.touches;
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                if (lastTouchDistance) {
                    const zoomFactor = dist / lastTouchDistance;
                    const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
                    this.gridManager.cameraView.zoom = Math.max(MAX_ZOOM, Math.min(MIN_ZOOM, newZoom));
                    this.gridManager.drawGrid();
                }
                lastTouchDistance = dist;
                return;
            }

            const pointer = getPointer(e);
            if (painting) {
                this.toggleAt(pointer.x, pointer.y);
            }
            if (draggingCam) {
                this.gridManager.cameraView.camX += pointer.x - lastX;
                this.gridManager.cameraView.camY -= pointer.y - lastY;
                lastX = pointer.x;
                lastY = pointer.y;
                this.gridManager.drawGrid();
            }
        };

        const handleUp = () => {
            painting = false;
            draggingCam = false;
            lastTouchDistance = null;
        };

        // Mouse
        this.gridCanvas.addEventListener('mousedown', (e) => handleDown(getPointer(e)));
        this.gridCanvas.addEventListener('mousemove', handleMove);
        this.gridCanvas.addEventListener('mouseup', handleUp);
        this.gridCanvas.addEventListener('mouseleave', handleUp);

        // Touch
        this.gridCanvas.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            handleDown(getPointer(e)); 
        }, { passive: false });

        this.gridCanvas.addEventListener('touchmove', (e) => { 
            e.preventDefault(); 
            handleMove(e); 
        }, { passive: false });
        this.gridCanvas.addEventListener('touchend', handleUp);
        this.gridCanvas.addEventListener('touchcancel', handleUp);

        // Context menu disable
        this.gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Wheel zoom
        this.gridCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
            this.gridManager.cameraView.zoom = Math.max(MAX_ZOOM, Math.min(MIN_ZOOM, newZoom));
            this.updateStatusBar(this.gridManager.cameraView.camX, this.gridManager.cameraView.camY);
            this.gridManager.drawGrid();
        }, { passive: false });

        // Prevent elastic scrolling
        this.gridCanvas.style.touchAction = 'none';
    }

    toggleAt(px, py) {
        this.gridManager.toggleAt(
            px, py,
            this.drawTiles.checked,
            this.eraseTiles.checked,
            this.gridManager.infiniteGrid,
        );
        this.gridManager.drawGrid();
        // console.log(this.gridManager.cells);
    }

    updateStatusBar(px, py) {
        document.getElementById("status-gen").textContent = 0;

        document.getElementById("status-popl").textContent = 0;

        document.getElementById("status-zoom").textContent = this.gridManager.cameraView.zoom.toFixed(3) + "x";
        const [q, r, s] = this.gridManager.screenToCell(px, py)
        document.getElementById("status-camera").textContent = `${q},${r},${s}`;
    }

    randomCells() {
        this.gridManager.cells.random_cells();
        this.gridManager.syncCellsToTexture();
        this.gridManager.drawGrid();
    }

    fillNeighbors() {
        this.gridManager.cells.floodfill();
        this.gridManager.syncCellsToTexture();
        this.gridManager.drawGrid();
    }
}

export { SimulatorController };
