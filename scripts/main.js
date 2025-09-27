import {  gridManager  } from '../grids/gridManager.js';
// import { squareGrid } from '../grids/squares.js';
// import { hexagonGrid } from '../grids/hexagons.js';
// import { triangleGrid } from '../grids/triangles.js';

class AutomataSimulator{
    docIDs = [
        "gridCanvas", "drawTiles", "eraseTiles", "size", "shape"
    ]

    constructor(){
        this.initElements();

        // Get the canvas element and its 2D drawing context
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.gridManager = new gridManager(this.shape, this.gridCanvas);
        this.setupEventListeners();
        this.canvasControl();
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
        // Update grid when controls change
        this.size.addEventListener('change', this.redraw());
        this.shape.addEventListener('input', this.redraw());

        // Handle window resizing - update canvas dimensions and redraw
        window.addEventListener('resize', () => {
            width = window.innerWidth;
            height = window.innerHeight;
            this.gridCanvas.width = width;
            this.gridCanvas.height = height;
            this.redraw();
        });
    }
    // Redraw function that reads current control values
    redraw(){
        this.gridManager.drawGrid(parseInt(this.size.value), this.shape.value);
    }

    canvasControl() {
        // Grid and camera settings
        const radius = 30;  // Base size for grid elements
        let camX = 0, camY = 0;  // Camera position (panning)
        let zoom = 1;  // Zoom level
        let draggingCam = false, painting = false;  // Interaction states
        let lastX = 0, lastY = 0;  // Last mouse position for dragging

        // Mouse down: start painting or camera dragging
        this.gridCanvas.addEventListener('mousedown', e=>{
            if (e.button === 0) {  // Left click
                if (drawTiles.checked || eraseTiles.checked) {
                    painting = true; 
                    this.toggleAt(e.clientX, e.clientY);
                } else {
                    // No mode selected → pan instead of painting
                    draggingCam = true;
                }
            }
            else if (e.button === 1 || e.button === 2) {  // Middle or right click - drag camera
                draggingCam = true; 
            }
            lastX = e.clientX; 
            lastY = e.clientY;
        });

        // Mouse move: continue painting or camera dragging
        this.gridCanvas.addEventListener('mousemove', e=>{
            if (painting) this.toggleAt(e.clientX,e.clientY);
            if (draggingCam) {
                camX += e.clientX - lastX;  // Update camera position
                camY += e.clientY - lastY;
                lastX=e.clientX; lastY=e.clientY;
                this.redraw();
            }
        });

        // Mouse up/leave: stop interactions
        this.gridCanvas.addEventListener('mouseup', ()=>{painting=false; draggingCam=false;});
        this.gridCanvas.addEventListener('mouseleave', ()=>{painting=false; draggingCam=false;});

        // Prevent context menu on right click
        this.gridCanvas.addEventListener('contextmenu', e=>e.preventDefault());

        // Mouse wheel: zoom in/out
        this.gridCanvas.addEventListener('wheel', e=>{
            e.preventDefault();
            zoom *= e.deltaY>0?0.9:1.1;  // Zoom out if scrolling down, in if up
            this.redraw();
        },{passive:false});

    }
}

class HexagonGrid {
    constructor(radius = 30) {
        this.radius = radius;
        this.hexColor = "#32cd32";
        this.lineColor = "#555555";
    }

    drawCell(ctx, x, y, filled) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            const px = x + this.radius * Math.cos(angle);
            const py = y + this.radius * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (filled) {
            ctx.fillStyle = this.hexColor;
            ctx.fill();
        }
    }

    worldToCell(world) {
        const q = Math.round(world.x / (1.5 * this.radius));
        const r = Math.round((world.y - (q % 2 ? Math.sqrt(3) * this.radius / 2 : 0)) / (Math.sqrt(3) * this.radius));
        return [q, r];
    }

    drawGrid(ctx, gridSize, cells) {
        const horiz = 1.5 * this.radius;
        const vert = Math.sqrt(3) * this.radius;

        for (let row = -gridSize; row <= gridSize; row++) {
            for (let col = -gridSize; col <= gridSize; col++) {
                const x = col * horiz;
                const y = row * vert + (col % 2 ? vert / 2 : 0);
                const key = `${col},${row}`;
                const filled = cells.has(key);
                this.drawCell(ctx, x, y, filled);
            }
        }
    }
}

class GridManager {
    constructor(shape, canvas) {
        this.shape = shape;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        
        this.camX = 0;
        this.camY = 0;
        this.zoom = 1;
        
        this.cells = new Set();
        this.grid = new HexagonGrid();
        
        this.updateCanvasSize();
    }

    updateCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    screenToWorld(px, py) {
        return {
            x: (px - this.width / 2 - this.camX) / this.zoom,
            y: (py - this.height / 2 - this.camY) / this.zoom
        };
    }

    worldToCell(world) {
        return this.grid.worldToCell(world);
    }

    toggleAt(px, py, drawMode, eraseMode) {
        const world = this.screenToWorld(px, py);
        const cell = this.worldToCell(world);
        const key = `${cell[0]},${cell[1]}`;

        if (drawMode) {
            this.cells.add(key);
        } else if (eraseMode) {
            this.cells.delete(key);
        }
    }

    drawGrid(gridSize) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();
        
        // Apply camera transformations
        this.ctx.translate(this.width / 2 + this.camX, this.height / 2 + this.camY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw the grid
        this.grid.drawGrid(this.ctx, gridSize, this.cells);
        
        this.ctx.restore();
    }
}

class AutomataSimulator1 {
    constructor() {
        this.canvas = document.getElementById('gridCanvas');
        this.sizeInput = document.getElementById('size');
        this.shapeSelect = document.getElementById('shape');
        this.drawTiles = document.getElementById('drawTiles');
        this.eraseTiles = document.getElementById('eraseTiles');
        
        this.gridManager = new GridManager(this.shapeSelect, this.canvas);
        
        this.setupEventListeners();
        this.setupCanvasControls();
        this.redraw();
    }

    setupEventListeners() {
        this.sizeInput.addEventListener('input', () => this.redraw());
        this.shapeSelect.addEventListener('change', () => this.redraw());
        
        window.addEventListener('resize', () => {
            this.gridManager.updateCanvasSize();
            this.redraw();
        });
    }

    setupCanvasControls() {
        let painting = false;
        let draggingCam = false;
        let lastX = 0, lastY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
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

        this.canvas.addEventListener('mousemove', (e) => {
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

        this.canvas.addEventListener('mouseup', () => {
            painting = false;
            draggingCam = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            painting = false;
            draggingCam = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.gridManager.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
            this.redraw();
        }, { passive: false });
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

    redraw() {
        const gridSize = parseInt(this.sizeInput.value) || 10;
        this.gridManager.drawGrid(gridSize);
    }
}

export {AutomataSimulator};