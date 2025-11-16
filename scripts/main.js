import {switchThemes} from './utils.js'
import {  GridManager  } from '../grids/gridManager.js';
import init, { WasmCellManager  } from "../pkg/cell_manager.js";

class SimulatorController{
    docIDs = [
        "gridCanvas", "menuPanel", "menuToggle", "reMap",
        "drawTiles", "eraseTiles", "clearGrid", "randomFill", "rangeInput",
        "rowInput", "colInput", "resetView", "pinLoc", "neighborTiles",
        "status_gen", "status_popl", "status_zoom", "status_camera",
    ];

    shapeProps = {
        square: [1, ["vonNeumann", "cross", "checkerboard", "moore", "star"]],
        hexagon: [1, ["hexagonal", "tripod", "asterix"]],
        rhombus: [3, ["Qbert"]],
        triangle: [2, ["vonNeumann", "biohazard", "inner", "vertices", "moore"]],
    };

    async initSim(useWebgl = true) {
        this.useWebgl = useWebgl;
        this.gridSize = [20, 20];
        this.selectedShape = "square";
        this.selectNeighbor();
        this.selectTopology();
        await init(); // <-- wait for WASM to finish loading

        this.initElements();
        await this.setupGrid(); // make initGrid async as well
        this.setupGridControls();
        this.setupEventListeners();
        this.setupCanvasControls();
        this.setupMenuControls();
        // this.randomCells();
        this.gridManager.changeCell(0,0,0,1);
        this.gridManager.changeCell(9,9,0,1);
        this.gridManager.changeCell(-10,-10,0,1);
        this.gridManager.drawGrid();
        switchThemes();
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
        const activeState = this.shapeProps[shape][0] || 1;
        const [cols, rows] = this.gridSize;
        const oldGrid = this.gridManager || null;

        // If we preserve, reuse old cells; otherwise make new
        const cellManager = preserveState && oldGrid
            ? oldGrid.cells
            : new WasmCellManager(cols, rows, activeState);

        if (preserveState == true) {
            console.log("switch_neighbors:", this.neighborhoodType, this.rangeValue||1, this.topologyType)
            this.cells.change_grid_properties(shape, this.neighborhoodType, this.rangeValue||1, this.topologyType);
        }


        // Always create a new GridManager — safer for WebGL + camera reinit
        this.gridManager = new GridManager(
            shape, this.gridCanvas, cellManager, this.useWebgl
        );

        // Restore camera and view if requested
        if (preserveState && oldGrid) {
            Object.assign(this.gridManager.cameraView, oldGrid.cameraView);
            this.gridManager.setBoundaryType(this.boundsType);
            this.gridManager.neighborType = this.topologyType;
        }

        // Sync grid sizes and texture
        this.gridManager.gridCols = parseInt(this.colInput.value);
        this.gridManager.gridRows = parseInt(this.rowInput.value);
        this.gridManager.resizeGrid(cols, rows, activeState);
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

        this.rangeInput.addEventListener('input', () => {
            this.rangeValue = parseInt(this.rangeInput.value) || 1; // cols
        });

        // --- Shape selection ---
        document.querySelectorAll('input[name="shape"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) { this.selectedShape = radio.value; }
                this.selectNeighbor();

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
            this.gridManager.clearAll();
            this.gridManager.syncCellsToTexture();
            this.gridManager.drawGrid();
        });

        this.randomFill.addEventListener('click', () => this.randomCells());

        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
            this.gridManager.drawGrid();
        });

        this.neighborTiles.addEventListener('click', () => {this.fillNeighbors()});
    }

    selectTopology() {
        const TOPOLOGY = {
            selectId: 'topology-type',
            descId: 'topology-desc',
            defaultValue: 'infinite',
            types: {
                infinite: {
                    label: "Infinite plane",
                    desc: "Infinitely expands grid in all directions."
                },
                finite: {
                    label: "Finite plane",
                    desc: "Cells outside of the plane are always considered to be dead"
                },
                cylinder: {
                    label: "Cylinder",
                    desc: "'rolling' the plane and connecting the opposite sides marked '1'."
                },
                torus: {
                    label: "Torus",
                    desc: "'rolling' the cylinder and connecting the opposite circles marked '2'."
                },
                klein_bottle: {
                    label: "Klein bottle",
                    desc: "'rolling' the cylinder, 'twisting' it in the fourth dimension and connecting the opposite circles marked '2' and '5'; note that the '5' becomes a '2' after twisting."
                },
                cross_surface: {
                    label: "Cross-surface",
                    desc: "like the Klein bottle, but 'twisting' the opposite sides while creating the cylinder and then 'twisting' the opposite circles when creating the cross-surface."
                },
                sphere: {
                    label: "Sphere",
                    desc: "joining adjacent sides, rather than opposite sides as is done for the torus."
                },
            }
        };
        this.setupDropdown(TOPOLOGY, 'topologyType');
    }

    selectNeighbor() {
        // All available neighborhood definitions
        const ALL_NEIGHBOR_TYPES = {
            vonNeumann: {
                label: "Von Neumann",
                desc: "Each cell interacts with its four orthogonal neighbors."
            },
            moore: {
                label: "Moore",
                desc: "Includes all surrounding cells, vertice and edges.(Square Moore)"
            },
            hexagonal: {
                label: "Hexagonal",
                desc: "Each cell interacts with six surrounding cells."
            },
            tripod: {
                label: "Tripod",
                desc: "Each cell interacts with three cells forming a tripod pattern."
            },
            asterix: {
                label: "Asterix",
                desc: "A dense 12-neighbor radial pattern."
            },
            cross: {
                label: "Cross",
                desc: "Orthogonal plus center — resembles a cross."
            },
            checkerboard: {
                label: "Checkerboard",
                desc: "Diagonal neighbors only, like black and white squares."
            },
            star: {
                label: "Star",
                desc: "Alternating diagonal and orthogonal neighbors forming a star."
            },
            Qbert: {
                label: "Q*bert",
                desc: "Isometric rhombus layout, all 10 Neighbors touching. (MAX Range : 1)"
            },
            biohazard: {
                label: "Biohazard",
                desc: "Triangular neighborhood with alternating diagonals. (MAX Range : 1)"
            },
            inner: {
                label: "Inner",
                desc: "Three closest neighbors forming a compact core. (MAX Range : 1)"
            },
            vertices: {
                label: "Vertices",
                desc: "Vertex-based neighborhood. (MAX Range : 1)"
            }
        };

        const usedNeighborhoods = this.shapeProps[this.selectedShape][1] || [];
        // Filter only relevant types for this shape
        const filteredTypes = Object.fromEntries(
            usedNeighborhoods
                .filter(name => ALL_NEIGHBOR_TYPES[name])
                .map(name => [name, ALL_NEIGHBOR_TYPES[name]])
        );

        const NEIGHBORHOOD = {
            selectId: "neighbor-type",
            descId: "neighbor-desc",
            defaultValue: usedNeighborhoods[0] || "moore",
            types: filteredTypes
        };
        this.setupDropdown(NEIGHBORHOOD, "neighborhoodType");
    }

    setupDropdown(config, propertyName) {
        const select = document.getElementById(config.selectId);
        const desc = document.getElementById(config.descId);

        select.innerHTML = '';

        Object.entries(config.types).forEach(([value, { label }]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.value = config.defaultValue;
        desc.textContent = config.types[config.defaultValue].desc;
        this[propertyName] = config.defaultValue;

        select.addEventListener("change", (e) => {
            const selected = e.target.value;
            desc.textContent = config.types[selected]?.desc || "";
            this[propertyName] = selected;
        });
    }

    setupCanvasControls() {
        let painting = false;
        let draggingCam = false;
        let lastX = 0, lastY = 0;
        let lastTouchDistance = null;
        const MIN_ZOOM = 10;
        const MAX_ZOOM = 0.0001;

        const getPointer = (e) => {
            if (e.touches) {
                const pointer = { 
                    x: e.touches[0].clientX, 
                    y: e.touches[0].clientY, 
                    touches: e.touches.length 
                };
                return pointer;
            }
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

            // --- TOUCH PINCH ZOOM ---
            if (e.touches && e.touches.length === 2) {
                const [t1, t2] = e.touches;
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

                if (lastTouchDistance) {
                    const zoomFactor = dist / lastTouchDistance;
                    const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
                    this.gridManager.cameraView.zoom = Math.max(MAX_ZOOM, Math.min(MIN_ZOOM, newZoom));
                    this.updateStatusBar(t1.clientX, t1.clientY);
                    this.gridManager.drawGrid();
                }
                lastTouchDistance = dist;
                return;
            }

            // --- ALWAYS UPDATE POINTER + STATUS BAR ---
            const pointer = getPointer(e);
            this.updateStatusBar(pointer.x, pointer.y);

            // --- PAINTING ---
            if (painting) {
                this.toggleAt(pointer.x, pointer.y);
            }

            // --- CAMERA DRAG ---
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

        // Disable right-click menu
        this.gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Wheel zoom
        this.gridCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
            this.gridManager.cameraView.zoom = Math.max(MAX_ZOOM, Math.min(MIN_ZOOM, newZoom));
            this.updateStatusBar(e.clientX, e.clientY);
            this.gridManager.drawGrid();
        }, { passive: false });

        // Prevent elastic scrolling on mobile
        this.gridCanvas.style.touchAction = 'none';
    }

    updateStatusBar(px, py) {
        this.status_gen.textContent = 0;
        this.status_popl.textContent = 0;
        this.status_zoom.textContent = this.gridManager.cameraView.zoom.toFixed(3) + "x";
        const [q, r, s] = this.gridManager.screenToCell(px, py)
        this.status_camera.textContent = `(${q},${r},${s})`;
    }

    toggleAt(px, py) {
        this.gridManager.toggleAt(
            px, py,
            this.drawTiles.checked,
            this.eraseTiles.checked,
            this.gridManager.infiniteGrid,
        );
        this.gridManager.drawGrid();
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
