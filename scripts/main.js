import {  GridManager  } from '../grids/gridManager.js';

class AutomataSimulator{
    docIDs = [
        "gridCanvas", "drawTiles", "eraseTiles", "shape", "rowInput", "colInput",
        "resetView", "pinLoc", "clearGrid", "randomFill", "infiniteGrid", "finiteGridControls",
    ]

    constructor(){
        this.initElements();
        this.gridManager = new GridManager(this.shape, this.gridCanvas);
        this.savedView = { ...this.gridManager.cameraView };
        this.setupEventListeners();
        this.setupCanvasControls();
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
            this.gridManager = new GridManager(this.shape, this.gridCanvas, old_cells);
            this.gridManager.cameraView = { ...this.savedView };
            this.gridManager.infiniteGrid = this.infiniteGrid.checked;
            this.gridManager.drawGrid();
        });

        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
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
    }

    setupCanvasControls() {
        let painting = false;
        let draggingCam = false;
        let lastX = 0, lastY = 0;

        this.gridCanvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                if (this.drawTiles.checked || this.eraseTiles.checked) {
                    painting = true;
                    this.toggleAt(e.clientX, e.clientY);
                } else {
                    draggingCam = true;
                }
            } else if (e.button === 1 || e.button === 2) {
                draggingCam = true;
            }
            lastX = e.clientX;
            lastY = e.clientY;
        });

        this.gridCanvas.addEventListener('mousemove', (e) => {
            if (painting) {
                this.toggleAt(e.clientX, e.clientY);
            }
            if (draggingCam) {
                this.gridManager.cameraView.camX += e.clientX - lastX;
                this.gridManager.cameraView.camY += e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                this.gridManager.drawGrid();
            }
        });

        this.gridCanvas.addEventListener('mouseup', () => {
            painting = false;
            draggingCam = false;
        });

        this.gridCanvas.addEventListener('mouseleave', () => {
            painting = false;
            draggingCam = false;
        });

        this.gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.gridCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            // Calculate new zoom with limits
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
            
            // Apply zoom limits (0.1 to 1000)
            this.gridManager.cameraView.zoom = Math.max(0.01, Math.min(10, newZoom));
                this.gridManager.drawGrid();
        }, { passive: false });
    }
setupCanvasControls() {
    let painting = false;
    let draggingCam = false;
    let lastX = 0, lastY = 0;

    // Mouse events
    this.gridCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (this.drawTiles.checked || this.eraseTiles.checked) {
                painting = true;
                this.toggleAt(e.clientX, e.clientY);
            } else {
                draggingCam = true;
            }
        } else if (e.button === 1 || e.button === 2) {
            draggingCam = true;
        }
        lastX = e.clientX;
        lastY = e.clientY;
    });

    this.gridCanvas.addEventListener('mousemove', (e) => {
        if (painting) {
            this.toggleAt(e.clientX, e.clientY);
        }
        if (draggingCam) {
            this.gridManager.cameraView.camX += e.clientX - lastX;
            this.gridManager.cameraView.camY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            this.gridManager.drawGrid();
        }
    });

    this.gridCanvas.addEventListener('mouseup', () => {
        painting = false;
        draggingCam = false;
    });

    this.gridCanvas.addEventListener('mouseleave', () => {
        painting = false;
        draggingCam = false;
    });

    this.gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.gridCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
        this.gridManager.cameraView.zoom = Math.max(0.01, Math.min(10, newZoom));
        this.gridManager.drawGrid();
    }, { passive: false });

    // Touch events for mobile
    this.gridCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            // Single touch - painting or panning
            const touch = e.touches[0];
            if (this.drawTiles.checked || this.eraseTiles.checked) {
                painting = true;
                this.toggleAt(touch.clientX, touch.clientY);
            } else {
                draggingCam = true;
            }
            lastX = touch.clientX;
            lastY = touch.clientY;
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            draggingCam = false;
            painting = false;
        }
    });

    this.gridCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 1 && (painting || draggingCam)) {
            const touch = e.touches[0];
            
            if (painting) {
                this.toggleAt(touch.clientX, touch.clientY);
            }
            
            if (draggingCam) {
                this.gridManager.cameraView.camX += touch.clientX - lastX;
                this.gridManager.cameraView.camY += touch.clientY - lastY;
                lastX = touch.clientX;
                lastY = touch.clientY;
                this.gridManager.drawGrid();
            }
        } else if (e.touches.length === 2) {
            // Handle pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate current distance between fingers
            const currentDist = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            // Calculate previous distance (you might want to store this)
            if (this.lastTouchDistance) {
                const zoomFactor = currentDist / this.lastTouchDistance;
                const newZoom = this.gridManager.cameraView.zoom * zoomFactor;
                this.gridManager.cameraView.zoom = Math.max(0.01, Math.min(10, newZoom));
                this.gridManager.drawGrid();
            }
            
            this.lastTouchDistance = currentDist;
        }
    });

    this.gridCanvas.addEventListener('touchend', (e) => {
        painting = false;
        draggingCam = false;
        this.lastTouchDistance = null;
    });

    this.gridCanvas.addEventListener('touchcancel', (e) => {
        painting = false;
        draggingCam = false;
        this.lastTouchDistance = null;
    });

    // Prevent elastic scrolling on the canvas
    this.gridCanvas.style.touchAction = 'none';
}
}



export { AutomataSimulator };

