import {  GridManager  } from '../grids/gridManager.js';
import {  SharePatterns  } from '../scripts/SharePatterns.js';
import init, { WasmInterface  } from "../pkg/cellular_automata.js";

class SimulatorController{
    docIDs = [
        "gridCanvas", "menuPanel", "menuToggle", "reMap", "autoFit", "simCtrl",
        "drawTiles", "eraseTiles", "clearGrid", "randomFill", "rangeInput",
        "rowInput", "colInput", "resetView", "pinLoc", "neighborTiles",
        "status_zoom", "status_camera", "status_pop", "status_gen",
        "updateSim", "loadSim",
    ];

    shapeProps = {
        square: ["moore", "vonNeumann", "cross", "checkerboard", "star"],
        hexagon: ["hexagonal", "tripod", "asterix"],
        rhombus: ["Qbert"],
        triangle: ["vonNeumann", "biohazard", "inner", "vertices", "moore"],
    };

    GRID_LIMITS = [-2147483648, 2147483647];

    async initSim(useWebgl = true) {
        this.useWebgl = useWebgl;
        this.gridSize = [null, null, null];
        this.selectedShape = "square";
        this.selectNeighbor();
        this.selectTopology();
        await init(); // <-- wait for WASM to finish loading

        this.initElements();
        this.patternSharer = new SharePatterns(this);
        await this.patternSharer.ready;

        await this.fromPattern({
            patternData: this.patternSharer.getPreview(),
        });

        this.setupGridControls();
        this.setupEventListeners();
        this.setupCanvasControls();
        this.setupMenuControls();

        this.gridManager.renderGrid();
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

    _buildGrid({shape, wasm_engine, savedView = null}) {
        this.wasm_engine = wasm_engine;
        this.grid_config = JSON.parse(wasm_engine.config_string());
        this.storage_pattern = JSON.parse(wasm_engine.storage_string());
        this.gridSize = [Number(this.grid_config.width), Number(this.grid_config.height), Number(this.grid_config.depth)]

        this.gridManager = new GridManager(
            shape, this.gridSize,
            wasm_engine, this.grid_config,
            this.gridCanvas, this.useWebgl,
        );

        if (savedView) {
            Object.assign(this.gridManager.cameraView, savedView);
        } else {
            this.gridManager.fitGrid();
        }

        this.savedView = { ...this.gridManager.cameraView };
        this.gridManager.renderGrid(true);

        // console.log(this.grid_config);
        // console.log(this.storage_pattern);
    }

    async fromPattern({ patternData = ""} = {}) {
        // Parse pattern + config
        const patternName = this.patternSharer.getPatternName();
        const wasm_engine = WasmInterface.from_pattern(patternName, patternData);
        const gridConfig = JSON.parse(wasm_engine.config_string());

        // Apply config → simulator state
        this.setShape(gridConfig.shape);
        this.selectNeighbor(gridConfig.neighbor_type);
        this.selectTopology(gridConfig.topology_type);

        this.rangeValue = Number(gridConfig.range);
        this.rangeInput.value = this.rangeValue;

        this.gridSize = [Number(gridConfig.width), Number(gridConfig.height), Number(gridConfig.depth)]
        this.colInput.value = this.gridSize[0];
        this.rowInput.value = this.gridSize[1];

        // Build grid
        const shape = this.selectedShape ?? "square";
        this._buildGrid({shape, wasm_engine});
        this.updateAutomataStatus();
    }

    async setupGrid({ preserveState = false } = {}) {
        const shape = this.selectedShape;
        const oldGrid = this.gridManager || null;
        const [cols, rows, _] = this.gridSize;

        let wasm_engine, savedView;

        if (preserveState && oldGrid) {
            wasm_engine = this.wasm_engine;
            savedView = oldGrid.cameraView;

            this.rangeValue ??= 1;
            wasm_engine.resize(cols, rows);
            wasm_engine.change_grid_properties(
                this.selectedShape,
                this.neighborhoodType,
                this.rangeValue,
                this.topologyType
            );
        } else {
            wasm_engine = new WasmInterface(shape, cols, rows);
        }
        this._buildGrid({shape, wasm_engine, savedView});
    }

    setupGridControls() {
        // --- Grid size controls ---
        this.colInput.addEventListener('input', () => {
            this.gridSize[0] = parseInt(this.colInput.value) || 20; // cols
        });

        this.rowInput.addEventListener('input', () => {
            this.gridSize[1] = parseInt(this.rowInput.value) || 20; // rows
        });

        this.rangeInput.addEventListener('input', () => {
            this.rangeValue = parseInt(this.rangeInput.value) || 1; // cols
        });

        // --- Shape selection ---
        document.querySelectorAll('input[name="shape"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.setShape(radio.value);
                }
            });
        });

        // --- Rebuild / Remap Grid Button ---
        this.reMap.addEventListener('click', () => {
            this.setupGrid({ preserveState: true });
        });

        this.updateSim.addEventListener('click', () => {
            const previewText = this.wasm_engine.update_preview();
            this.patternSharer.updatePreview(previewText);
        });

        this.loadSim.addEventListener('click', () => {
            const patternText = this.patternSharer.getPreview();
            this.fromPattern({
                patternData: patternText,
                preserveState: false
            });
            this.gridManager.renderGrid();
        });
    }

    setupEventListeners() {
        this.autoFit.addEventListener('click', () => {
            this.gridManager.fitGrid();
            this.gridManager.renderGrid();
        });

        this.resetView.addEventListener('click', () => {
            this.gridManager.cameraView = { ...this.savedView };
            this.gridManager.renderGrid();
        });

        this.pinLoc.addEventListener('click', () => {
            this.savedView = { ...this.gridManager.cameraView };
            this.gridManager.renderGrid();
        });

        this.clearGrid.addEventListener('click', () => {
            this.gridManager.clearAll();
            this.gridManager.renderGrid();
        });

        this.randomFill.addEventListener('click', () => this.randomCells());
        this.simCtrl.addEventListener('click', () => this.simulate_step());

        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
            this.gridManager.renderGrid();
        });

        this.neighborTiles.addEventListener('click', () => {this.fillNeighbors()});
    }

    setShape(value) {
        this.selectedShape = value;
        // sync radio buttons
        document.querySelectorAll('input[name="shape"]').forEach(radio => {
            radio.checked = (radio.value === value);
        });
        const shape_desc = document.getElementById("shape-desc");
        shape_desc.textContent = `Euclidean Tiling: ${value}`;
        this.selectNeighbor();
    }

    selectTopology(preffered = null) {
        const TOPOLOGY = {
            selectId: 'topology-type',
            descId: 'topology-desc',
            defaultValue:  preffered || 'finite',
            types: {
                // INFINTE GRID REMOVED UNTILL CHUNKED RNDRING IMPLEMENTED
                infinite: {
                    label: "Infinite plane",
                    desc: "Infinitely expands grid in all directions."
                },
                finite: {
                    label: "Finite plane",
                    desc: "Cells outside of the plane are always considered to be dead"
                },
                torus: {
                    label: "Torus",
                    desc: "'rolling' the cylinder and connecting the opposite circles marked '2'."
                },
                cylinder: {
                    label: "Cylinder",
                    desc: "'rolling' the plane and connecting the opposite sides marked '1'."
                },
                klein: {
                    label: "Klein bottle",
                    desc: "'rolling' the cylinder, 'twisting' it in the fourth dimension and connecting the opposite circles marked '2' and '5'; note that the '5' becomes a '2' after twisting."
                },
                cross_surface: {
                    label: "Cross-surface",
                    desc: "like the Klein bottle, but 'twisting' the opposite sides while creating the cylinder and then 'twisting' the opposite circles when creating the cross-surface."
                },
                sphere: {
                    label: "Sphere",
                    desc: "joining adjacent sides, rather than opposite sides as is done for the torus. (For optimum results Rows == Cols)"
                },
            }
        };

        this.setupDropdown(TOPOLOGY, 'topologyType');
    }

    selectNeighbor(preferred = null) {
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

        const usedNeighborhoods = this.shapeProps[this.selectedShape] || [];
        // Filter only relevant types for this shape
        const filteredTypes = Object.fromEntries(
            usedNeighborhoods
                .filter(name => ALL_NEIGHBOR_TYPES[name])
                .map(name => [name, ALL_NEIGHBOR_TYPES[name]])
        );

        const defaultValue =
            preferred && filteredTypes[preferred]
                ? preferred
                : usedNeighborhoods[0] || "moore";

        const NEIGHBORHOOD = {
            selectId: "neighbor-type",
            descId: "neighbor-desc",
            defaultValue,
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
        const MAX_ZOOM = 1E+2;
        const MIN_ZOOM = 1E-4;

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
                    this.updateAutomataStatus();
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
                    this.gridManager.cameraView.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
                    this.updateCameraStatus(t1.clientX, t1.clientY);
                    this.gridManager.renderGrid();
                }
                lastTouchDistance = dist;
                return;
            }

            // --- ALWAYS UPDATE POINTER + STATUS BAR ---
            const pointer = getPointer(e);
            this.updateCameraStatus(pointer.x, pointer.y);

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
                this.gridManager.renderGrid();
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
            this.gridManager.cameraView.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
            this.updateCameraStatus(e.clientX, e.clientY);
            this.gridManager.renderGrid();
        }, { passive: false });

        // Prevent elastic scrolling on mobile
        this.gridCanvas.style.touchAction = 'none';
    }

    updateCameraStatus(px, py) {
        const zoom = this.gridManager.cameraView.zoom;
        const ratio = zoom >= 1
            ? `${zoom.toFixed(0)}:1`
            : `1:${(1 / zoom).toFixed(0)}`;
        this.status_zoom.textContent = ratio;
        const [q, r, s] = this.gridManager.screenToCell(px, py)
        this.status_camera.textContent = `(${q},${r},${s})`;
    }

    updateAutomataStatus(raw_info = null) {
        const info = raw_info
            ? JSON.parse(raw_info)
            : JSON.parse(this.wasm_engine.automata_string());
        this.status_pop.textContent = info.live;
        this.status_gen.textContent = info.gen_no;
        console.log(info);
    }

    toggleAt(px, py) {
        this.gridManager.toggleAt(
            px, py,
            this.drawTiles.checked,
            this.eraseTiles.checked,
        );
    }

    randomCells() {
        // Start timer for entire step
        const stepStartTime = performance.now();

        // Step 1: Run Game of Life simulation
        const simStartTime = performance.now();
        const props = this.wasm_engine.random_cells();
        const simEndTime = performance.now();
        const simulationTime = simEndTime - simStartTime;

        // Step 2: Clear and render
        const renderStartTime = performance.now();
        this.gridManager.renderGrid(true);
        const renderEndTime = performance.now();
        const renderTime = renderEndTime - renderStartTime;
        
        // Total time
        const stepEndTime = performance.now();
        const totalTime = stepEndTime - stepStartTime;
        
        console.log(`Random Fill: ${simulationTime.toFixed(2)}ms | ` +
                    `Render: ${renderTime.toFixed(2)}ms | ` +
                    `Total: ${totalTime.toFixed(2)}ms`);
        this.updateAutomataStatus(props);
    }

    simulate_step() {
        // Start timer for entire step
        const stepStartTime = performance.now();

        // Step 1: Run Game of Life simulation
        const simStartTime = performance.now();
        const props = this.wasm_engine.step_game_of_life();
        const simEndTime = performance.now();
        const simulationTime = simEndTime - simStartTime;

        // Step 2: Render
        const renderStartTime = performance.now();
        this.gridManager.renderGrid(true);

        const renderEndTime = performance.now();
        const renderTime = renderEndTime - renderStartTime;
        
        // Total time
        const stepEndTime = performance.now();
        const totalTime = stepEndTime - stepStartTime;
        
        console.log(`Simulation: ${simulationTime.toFixed(2)}ms | ` +
                    `Render: ${renderTime.toFixed(2)}ms | ` +
                    `Total: ${totalTime.toFixed(2)}ms`);
        this.updateAutomataStatus(props);
    }

    fillNeighbors() {
        const props = this.wasm_engine.floodfill();
        this.updateAutomataStatus(props);
        this.gridManager.renderGrid(true);
    }
}

export { SimulatorController };
