import {  GridManager  } from '../grids/gridManager.js';

class AutomataSimulator{
    docIDs = [
        "gridCanvas", "drawTiles", "eraseTiles", "size", "shape",
        "resetView", "pinLoc",
    ]

    constructor(){
        this.initElements();
        this.gridManager = new GridManager(this.shape, this.gridCanvas);
        this.savedView = this.gridManager.cameraView;
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
        this.gridManager.size = parseInt(this.size.value);
        this.gridManager.toggleAt(
            px, py,
            this.drawTiles.checked,
            this.eraseTiles.checked
        );
        this.gridManager.drawGrid();
        // console.log(this.gridManager.cells);
    }

    setupEventListeners() {
        this.size.addEventListener('input', () => {
            this.gridManager.size = parseInt(this.size.value);
            this.gridManager.drawGrid();
        });

        this.shape.addEventListener('change', () => {
            const old_cells = this.gridManager.cells;
            this.gridManager = new GridManager(this.shape, this.gridCanvas, old_cells);
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
                this.gridManager.cameraView["camX"] += e.clientX - lastX;
                this.gridManager.cameraView["camY"] += e.clientY - lastY;
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
            this.gridManager.cameraView["zoom"] *= e.deltaY > 0 ? 0.9 : 1.1;
            this.gridManager.drawGrid();
        }, { passive: false });
    }

}

export {AutomataSimulator};