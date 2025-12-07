
class BaseGrid {

    constructor(colorSchema, shape) {
        this.colorSchema = colorSchema;
        this.shape = shape;

        // Common properties
        this.radius = 30;
        this.cellSize = 50;

        this.gridCols = 20;
        this.gridRows = 20;
        this.rowMult = 1;
        this.colMult = 1;

        this.gridTexture = null;
        this.textureData = null;

        // Common WebGL buffers
        this.vertexBuffer = null;
        this.indexBuffer = null;
    }

    setupGeometryBuffers(gl) {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        const vertices = new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            1.0, 1.0,
            -1.0, 1.0
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

    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
            precision highp float;
            in vec2 aPosition;
            out vec2 vTexCoord;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
                vTexCoord = aPosition * 0.5 + 0.5;
            }`;
        } else {
            return `
            attribute vec2 aPosition;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
                vTexCoord = aPosition * 0.5 + 0.5;
            }`;
        }
    }

    setupUniforms(gl, program, cameraView, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, "uResolution"),
            offset: gl.getUniformLocation(program, "uOffset"),
            scale: gl.getUniformLocation(program, "uScale"),
            gridCols: gl.getUniformLocation(program, "uGridCols"),
            gridRows: gl.getUniformLocation(program, "uGridRows"),
            radius: gl.getUniformLocation(program, "uRadius"),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            gridTexture: gl.getUniformLocation(program, "uGridTexture"),
            gridColor: gl.getUniformLocation(program, "uGridColor"),
            canvasColor: gl.getUniformLocation(program, "uCanvasColor"),
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.radius, this.radius);
        gl.uniform1f(uniformLocations.baseCellSize, this.cellSize);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        const c = this.colorSchema.canvas;
        gl.uniform4f(uniformLocations.canvasColor, c[0], c[1], c[2], c[3]); // OK
        const g = this.colorSchema.grid;
        gl.uniform4f(uniformLocations.gridColor, g[0], g[1], g[2], g[3]); // NEW

        return uniformLocations;
    }

    screenToWorld(px, py, width, height, cameraView) {
        const worldX = (px - width / 2 - cameraView.camX) / cameraView.zoom;
        const worldY = (height / 2 - py - cameraView.camY) / cameraView.zoom;
        return { x: worldX, y: worldY };
    }

    setCellState(q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX < 0 || texX >= this.textureWidth ||
            texY < 0 || texY >= this.textureHeight) return;

        const index = (texY * this.textureWidth + texX) * 4;

        if (state) {
            const c = this.colorSchema[state];
            this.textureData[index]     = c[0] * 255;
            this.textureData[index + 1] = c[1] * 255;
            this.textureData[index + 2] = c[2] * 255;
            this.textureData[index + 3] = 255;
        } else {
            this.textureData[index]     = 0;
            this.textureData[index + 1] = 0;
            this.textureData[index + 2] = 0;
            this.textureData[index + 3] = 0;
        }
    }

    getGridGeometry(gridCols, gridRows, gl) {
        return {
            texture: this.gridTexture,
            textureWidth: this.textureWidth * this.colMult,
            textureHeight: this.textureHeight * this.rowMult,
            gridCols: gridCols,
            gridRows: gridRows,
            baseCellSize: this.cellSize || this.radius || 50,
            vertexCount: 4,
            indexCount: 6
        };
    }

    initGridTexture(gl, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;

        this.textureWidth = gridCols * this.colMult;
        this.textureHeight = gridRows * this.rowMult;
        this.textureData = new Uint8Array(this.textureWidth * this.textureHeight * 4);

        // Initialize with transparent
        for (let i = 0; i < this.textureWidth * this.textureHeight * 4; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }

        this.gridTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureWidth, this.textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
    }

    resizeGridTexture(gl, newCols, newRows, oldCells) {
        this.initGridTexture(gl, newCols, newRows);

        if (oldCells) {
        const arr = oldCells.each_live_cell();
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];
            this.setCellState(gl, q, r, s, state);
            };
        }
    }

    clearGrid(gl) {
        if (this.textureData) {
            this.textureData.fill(0);
        }

        if (gl && this.gridTexture) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                            this.textureWidth,
                            this.textureHeight,
                            gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    // Abstract methods
    worldToCell(world) {
        throw new Error("Method 'worldToCell(world)' must be implemented.");
    }

    calculateBounds(bounds) {
        throw new Error("Method 'calculateBounds(bounds)' must be implemented.");
    }

    cubeToTextureCoords(q, r, s) {
        throw new Error("Method 'cubeToTextureCoords(q, r, s)' must be implemented.");
    }

    getFragmentShaderSource() {
        throw new Error("Method 'getFragmentShaderSource()' must be implemented.");
    }

    drawGridShape(ctx) {
        throw new Error("Method 'drawGridShape(ctx)' must be implemented.");
    }

    drawShapeCell(ctx, q, r, s, state) {
        throw new Error("Method 'drawShapeCell(ctx, q, r, s, state)' must be implemented.");
    }

    screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS) {
        throw new Error("Method 'screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS)' must be implemented.");
    }

}

export {BaseGrid};