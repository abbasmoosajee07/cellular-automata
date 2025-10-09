class BaseGrid {
    constructor(colorSchema, shape) {
        this.colorSchema = colorSchema;
        this.shape = shape;

        // Common properties
        this.zoom = 1;
        this.gridTexture = null;
        this.textureData = null;
        this.gridSize = 20;

        // Common WebGL buffers
        this.vertexBuffer = null;
        this.indexBuffer = null;
    }

    // COMPLETELY IDENTICAL METHODS
    setupGeometryBuffers(gl) {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        const vertices = new Float32Array([
            -1.0, -1.0,  // bottom left
            1.0, -1.0,   // bottom right
            1.0, 1.0,    // top right
            -1.0, 1.0    // top left
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        return {
            vertexBuffer: this.vertexBuffer,
            indexBuffer: this.indexBuffer,
            vertexCount: 4,
            indexCount: 6
        };
    }

    initGridTexture(gl, gridSize) {
        this.gridSize = gridSize;
        this.textureData = new Uint8Array(gridSize * gridSize * 4);

        // Initialize texture data to empty
        for (let i = 0; i < gridSize * gridSize * 4; i += 4) {
            this.textureData[i] = 0;     // R
            this.textureData[i + 1] = 0; // G
            this.textureData[i + 2] = 0; // B
            this.textureData[i + 3] = 0; // A (0 = transparent)
        }

        // Create WebGL texture
        this.gridTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gridSize, gridSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
    }

    updateGridTexture(gl) {
        if (!this.gridTexture) return;

        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.gridSize, this.gridSize, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
    }

    resizeGridTexture(gl, newGridSize, oldCells) {
        const oldData = this.textureData;
        const oldSize = this.gridSize;

        this.initGridTexture(gl, newGridSize);
        if (oldCells && oldData) {
            for (let y = 0; y < Math.min(oldSize, newGridSize); y++) {
                for (let x = 0; x < Math.min(oldSize, newGridSize); x++) {
                    const oldIndex = (y * oldSize + x) * 4;
                    if (oldData[oldIndex + 3] > 0) {
                        this.setCellState(gl, x, y, true);
                    }
                }
            }
        }
    }

    setCellState(gl, x, y, state) {
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
            const index = (y * this.gridSize + x) * 4;

            if (state) {
                const color = this.colorSchema[state] || [1, 1, 1, 1];
                this.textureData[index] = color[0] * 255;
                this.textureData[index + 1] = color[1] * 255;
                this.textureData[index + 2] = color[2] * 255;
                this.textureData[index + 3] = 255;
            } else {
                this.textureData[index] = 0;
                this.textureData[index + 1] = 0;
                this.textureData[index + 2] = 0;
                this.textureData[index + 3] = 0;
            }

            // Update single pixel in texture
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            const pixelData = new Uint8Array([
                this.textureData[index],
                this.textureData[index + 1],
                this.textureData[index + 2],
                this.textureData[index + 3]
            ]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            
            return true;
        }
        return false;
    }

    screenToWorld(px, py, width, height, cameraView) {
        const worldX = (px - width / 2 - cameraView.camX) / cameraView.zoom;
        const worldY = (height / 2 - py - cameraView.camY) / cameraView.zoom;
        return { x: worldX, y: worldY };
    }

    getGridGeometry() {
        return {
            texture: this.gridTexture,
            gridSize: this.gridSize,
            baseCellSize: this.baseCellSize || this.radius || this.sideLength,
            vertexCount: 4,
            indexCount: 6
        };
    }

    clearGrid(gl) {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.setCellState(gl, x, y, false);
            }
        }
    }

    fillRandom(rgba, density = 0.3) {
        const r = Math.floor(rgba[0] * 255);
        const g = Math.floor(rgba[1] * 255);
        const b = Math.floor(rgba[2] * 255);
        const a = Math.floor(rgba[3] * 255);

        this.clearGrid(this.gl);

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (Math.random() < density) {
                    const idx = (y * this.gridSize + x) * 4;
                    this.textureData[idx] = r;
                    this.textureData[idx + 1] = g;
                    this.textureData[idx + 2] = b;
                    this.textureData[idx + 3] = a;
                }
            }
        }
        if (this.gl) this.updateGridTexture(this.gl);
    }

    clear() {
        for (let i = 0; i < this.textureData.length; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }
        if (this.gl) this.updateGridTexture(this.gl);
    }

    // Abstract methods that must be implemented by subclasses
    getVertexShaderSource() {
        throw new Error("Method 'getVertexShaderSource()' must be implemented.");
    }

    getFragmentShaderSource() {
        throw new Error("Method 'getFragmentShaderSource()' must be implemented.");
    }

    worldToCell(world) {
        throw new Error("Method 'worldToCell()' must be implemented.");
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        throw new Error("Method 'setupUniforms()' must be implemented.");
    }

    calculateBounds(bounds) {
        throw new Error("Method 'calculateBounds()' must be implemented.");
    }

    drawCanvasCells(ctx, cells) {
        throw new Error("Method 'drawCanvasCells()' must be implemented.(Used as back up to WebGL Renderer)");
    }
}

export {BaseGrid};