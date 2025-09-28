import {  GridManager  } from '../grids/gridManager.js';

class AutomataSimulator{
    docIDs = [
        "gridCanvas", "drawTiles", "eraseTiles", "size", "shape"
    ]

    constructor(){
        this.initElements();

        // Get the canvas element and its 2D drawing context
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.gridManager = new GridManager(this.shape, this.gridCanvas);
        this.setupEventListeners();
        this.setupCanvasControls();
        this.redraw()
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
            px, 
            py, 
            this.drawTiles.checked, 
            this.eraseTiles.checked
        );
        this.redraw();
    }

    setupEventListeners() {
        this.size.addEventListener('input', () => this.redraw());
        this.shape.addEventListener('change', () => {
                const old_cells = this.gridManager.cells;
                this.gridManager = new GridManager(this.shape, this.gridCanvas, old_cells);
                this.redraw()
            }
        );

        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
            this.redraw();
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
                this.gridManager.camX += e.clientX - lastX;
                this.gridManager.camY += e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                this.redraw();
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
            this.gridManager.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
            this.redraw();
        }, { passive: false });
    }


    // Redraw function that reads current control values
    redraw() {
        const gridSize = parseInt(this.size.value) || 10;
        this.gridManager.drawGrid(gridSize);
        console.log(this.gridManager.cells);

    }
}

export {AutomataSimulator};