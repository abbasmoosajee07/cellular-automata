
class BaseGrid {
    constructor(colorSchema, shape) {
        this.colorSchema = colorSchema;
        this.shape = shape;
        this.rendererUsed = "webgl";

        // Common properties
        this.zoom = 1;
        this.cellSize = 60;
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

    initGridTexture(gl, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;

        const textureWidth = gridCols * this.colMult;
        const textureHeight = gridRows * this.rowMult;
        this.textureData = new Uint8Array(textureWidth * textureHeight * 4);

        for (let i = 0; i < textureWidth * textureHeight * 4; i += 4) {
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX >= 0 && texX < this.textureWidth && texY >= 0 && texY < this.textureHeight) {
            const index = (texY * this.textureWidth + texX) * 4;

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

            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            const pixelData = new Uint8Array([
                this.textureData[index],
                this.textureData[index + 1],
                this.textureData[index + 2],
                this.textureData[index + 3]
            ]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            
            return true;
        }
        return false;
    }

    screenToWorld(px, py, width, height, cameraView) {
        const worldX = (px - width / 2 - cameraView.camX) / cameraView.zoom;
        const worldY = (height / 2 - py - cameraView.camY) / cameraView.zoom;
        return { x: worldX, y: worldY };
    }

    getGridGeometry(bounds, cells, gridCols, gridRows, infiniteGrid, gl) {
        return {
            texture: this.gridTexture,
            textureWidth: this.textureWidth,
            textureHeight: this.textureHeight,
            gridCols: gridCols,
            gridRows: gridRows,
            baseCellSize: this.baseCellSize || this.radius || 50,
            vertexCount: 4,
            indexCount: 6
        };
    }

    resizeGridTexture(gl, newCols, newRows, oldCells) {
        this.initGridTexture(gl, newCols, newRows);

        if (oldCells) {
            for (const [key, state] of oldCells) {
                const [q, r, s] = key.split(',').map(Number);
                this.setCellState(gl, q, r, s, state);
            }
        }
    }

    clearGrid(gl) {
        // Clear texture data
        this.textureData.fill(0);

        // Update GPU texture with CORRECT dimensions
        if (gl && this.gridTexture) {
            const textureWidth = this.gridCols * this.colMult;
            const textureHeight = this.gridRows * this.rowMult;

            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                            textureWidth,    // Use multiplied width
                            textureHeight,   // Use multiplied height
                            gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    // Default implementations
    worldToCell(world) {
        // Default implementation for square grid
        const col = Math.round(world.x / (this.baseCellSize || 50));
        const row = Math.round(world.y / (this.baseCellSize || 50));
        return [col, row, 0];
    }

    // Abstract methods
    getFragmentShaderSource() {
        throw new Error("Method 'getFragmentShaderSource()' must be implemented.");
    }

    cubeToTextureCoords(q, r, s) {
        throw new Error("Method 'cubeToTextureCoords()' must be implemented.");
    }

    setupUniforms(gl, program, cameraView, geometry, width, height) {
        throw new Error("Method 'setupUniforms()' must be implemented.");
    }

    calculateBounds(bounds) {
        throw new Error("Method 'calculateBounds()' must be implemented.");
    }

    drawCanvasCells(ctx, cells) {
        throw new Error("Method 'drawCanvasCells()' must be implemented.");
    }
}


export {BaseGrid};