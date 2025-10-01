import {  GridManager  } from '../grids/gridManager.js';

class AutomataSimulator{
    docIDs = [
        "gridCanvas", "drawTiles", "eraseTiles", "shape",
        "infiniteGrid", "finiteGridControls", "rowInput", "colInput",
        "resetView", "pinLoc", "clearGrid", "randomFill",
    ]

    constructor(){
        this.initElements();
        this.gridManager = new GridManager(this.shape, this.gridCanvas, new Map());
        this.savedView = { ...this.gridManager.cameraView };
        this.setupEventListeners();
        this.setupCanvasControls();
        this.menuControls();
        this.gridManager.drawGrid();
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

    menuControls() {
        const toggleBtn = document.getElementById('togglePanel');
        const panel = document.getElementById('menu');

        toggleBtn.addEventListener('click', () => {
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

    toggleAt(px, py) {
        this.gridManager.toggleAt(
            px, py,
            this.drawTiles.checked,
            this.eraseTiles.checked,
            this.infiniteGrid.checked,
        );
        this.gridManager.drawGrid();
        // console.log(this.gridManager.cells);
    }

    setupEventListeners() {
        this.rowInput.addEventListener('input', () => {
            this.gridManager.gridRows = parseInt(this.rowInput.value);
            this.gridManager.drawGrid();
        });

        this.colInput.addEventListener('input', () => {
            this.gridManager.gridCols = parseInt(this.colInput.value);
            this.gridManager.drawGrid();
        });

        this.infiniteGrid.addEventListener('change', () => {
            if (infiniteGrid.checked) {
                this.finiteGridControls.style.display = "none"; // hide rows+cols
            } else {
                this.finiteGridControls.style.display = "block"; // show rows+cols
            }
            this.gridManager.infiniteGrid = this.infiniteGrid.checked;
            this.gridManager.drawGrid();
        });

        this.shape.addEventListener('change', () => {
            const old_cells = this.gridManager.cells;
            const old_view = { ...this.gridManager.cameraView }
            this.gridManager = new GridManager(this.shape, this.gridCanvas, old_cells);
            this.gridManager.cameraView = { ...old_view };
            this.gridManager.gridRows = parseInt(this.rowInput.value);
            this.gridManager.gridCols = parseInt(this.colInput.value);
            this.gridManager.infiniteGrid = this.infiniteGrid.checked;
            this.gridManager.drawGrid();
        });


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

}

export { AutomataSimulator };
