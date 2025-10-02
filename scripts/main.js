import {  GridManager  } from '../grids/gridManager.js';

class AutomataSimulator{
    docIDs = [
        "gridCanvas", "menuPanel", "menuToggle", "drawTiles", "eraseTiles",
        "rowInput", "colInput", "resetView", "pinLoc", "clearGrid", "randomFill",
    ]

    constructor(){
        this.initElements();
        this.initGrid();
        this.setupGridControls()
        this.setupEventListeners();
        this.setupCanvasControls();
        this.setupMenuControls();
        this.gridManager.drawGrid();
        this.gridManager.buildNeighborsMap();
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

    initGrid() {
        this.gridManager = new GridManager("square", this.gridCanvas);
        this.savedView = { ...this.gridManager.cameraView };
        this.gridManager.gridRows = parseInt(this.rowInput.value);
        this.gridManager.gridCols = parseInt(this.colInput.value);
        this.gridManager.changeCell(0, 0, 1);
    }

    setupGridControls() {
        // Store references to all shape radio buttons
        this.shapeRadios = document.querySelectorAll('input[name="shape"]');
        this.shapeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    const selectedShape = radio.value;
                    const old_grid = this.gridManager

                    this.gridManager = new GridManager(selectedShape, this.gridCanvas, old_grid.cells);
                    this.gridManager.cameraView = { ...old_grid.cameraView };
                    this.gridManager.gridRows = old_grid.gridRows;
                    this.gridManager.gridCols = old_grid.gridCols;
                    this.gridManager.infiniteGrid = old_grid.infiniteGrid;
                    this.gridManager.drawGrid();
                }
            });
        });

        this.rowInput.addEventListener('input', () => {
            this.gridManager.gridRows = parseInt(this.rowInput.value);
            this.gridManager.drawGrid();
        });

        this.colInput.addEventListener('input', () => {
            this.gridManager.gridCols = parseInt(this.colInput.value);
            this.gridManager.drawGrid();
        });

        // Store references to all neighbors radio buttons
        this.neighborsRadio = document.querySelectorAll('input[name="neighbors"]');
        // Add event listener to each radio button
        this.neighborsRadio.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                };
            });
        });

        // Store references to all boundary radio buttons
        this.boundsRadio = document.querySelectorAll('input[name="bounds"]');
        this.boundsRadio.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.gridManager.setBoundaryType(radio.value);
                    this.gridManager.drawGrid();
                }
            });
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
            this.gridManager.cells = new Map();
            this.gridManager.drawGrid();
        });

        this.randomFill.addEventListener('click', () => this.gridManager.randomCells());

        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
            this.gridManager.drawGrid();
        });
    }

    setupCanvasControls() {
        let painting = false;
        let draggingCam = false;
        let lastX = 0, lastY = 0;
        let lastTouchDistance = null;

        const getPointer = (e) => {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY, touches: e.touches.length };
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
            if (e.touches && e.touches.length === 2) {
                // Pinch zoom
                const [t1, t2] = e.touches;
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                if (lastTouchDistance) {
                    const zoomFactor = dist / lastTouchDistance;
                    const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
                    this.gridManager.cameraView.zoom = Math.max(0.01, Math.min(10, newZoom));
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
                this.gridManager.cameraView.camY += pointer.y - lastY;
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
        this.gridCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown(getPointer(e)); });
        this.gridCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); });
        this.gridCanvas.addEventListener('touchend', handleUp);
        this.gridCanvas.addEventListener('touchcancel', handleUp);

        // Context menu disable
        this.gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Wheel zoom
        this.gridCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
            this.gridManager.cameraView.zoom = Math.max(0.01, Math.min(10, newZoom));
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

}

export { AutomataSimulator };
