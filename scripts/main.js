import {  GridManager  } from '../grids/gridManager.js';
import init, { WasmCellManager  } from "../pkg/cell_manager.js";

class SimulatorController{
    docIDs = [
        "gridCanvas", "menuPanel", "menuToggle", "reMap",
        "drawTiles", "eraseTiles", "clearGrid", "randomFill",
        "rowInput", "colInput", "resetView", "pinLoc",
        "neighborTiles",
    ]

    async init(useWebgl = true) {
        this.useWebgl = useWebgl;
        this.gridSize = [20, 20];

        await init(); // <-- wait for WASM to finish loading

        this.initElements();
        await this.initGrid(); // make initGrid async as well
        this.setupGridControls();
        this.setupEventListeners();
        this.setupCanvasControls();
        this.setupMenuControls();
        this.randomCells();
        this.cells = this.gridManager.cells;
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

    async initGrid() {
        this.gridManager = new GridManager(
            "square",
            this.gridCanvas,
            new WasmCellManager (20,20,5), // safe now
            this.useWebgl
        );
        this.savedView = { ...this.gridManager.cameraView };
        this.gridManager.gridRows = parseInt(this.rowInput.value);
        this.gridManager.gridCols = parseInt(this.colInput.value);
        this.cells = this.gridManager.cells;
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

        // --- Neighbor rules ---
        document.querySelectorAll('input[name="neighbors"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) { this.neighborsType = radio.value; }
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
            const oldGrid = this.gridManager;

            // Create a new grid with same state and camera
            this.gridManager = new GridManager(
                this.selectedShape,
                this.gridCanvas,
                oldGrid.cells,
                this.useWebgl
            );

            Object.assign(this.gridManager.cameraView, oldGrid.cameraView);

            this.gridManager.setBoundaryType(this.boundsType);
            this.gridManager.neighborType = this.neighborsType;
            this.gridManager.resizeGrid(this.gridSize[0], this.gridSize[1]);
            this.cells = oldGrid.cells;
            this.gridManager.drawGrid();
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
        const availCells = this.cells;
        const neighborsToActivate = [];

        // Collect neighbors of all active cells
        const arr = availCells.for_each_cell();
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];
            if (state === 1) { // expand only from alive cells
                const nbCells = this.cells.get_neighbors(q, r, s);
                for (let i = 0; i + 2 < nbCells.length; i += 3) {
                neighborsToActivate.push([nbCells[i], nbCells[i+1], nbCells[i+2]]);
                }
            }
        };

        // Apply neighbor activation
        for (const [nq, nr, ns] of neighborsToActivate) {
            this.gridManager.changeCell(nq, nr, ns, 1);
        }

        this.gridManager.drawGrid();
        // console.log(this.gridManager.cells);
    }

}

export { SimulatorController };
