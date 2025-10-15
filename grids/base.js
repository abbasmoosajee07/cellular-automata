
class BaseGrid {
    constructor(colorSchema, shape) {
        this.colorSchema = colorSchema;
        this.shape = shape;
        this.rendererUsed = "webgl";

        // Common properties
        this.zoom = 1;
        this.gridCols = 20;
        this.gridRows = 20;
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

    initGridTexture(gl, width, height) {
        this.textureWidth = width;
        this.textureHeight = height;
        this.textureData = new Uint8Array(width * height * 4);

        for (let i = 0; i < width * height * 4; i += 4) {
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
    }

    cubeToTextureCoords(q, r, s) {
        // Convert cube coordinates to texture coordinates
        // Center (0,0,0) maps to center of texture
        const x = q + this.textureWidth / 2;
        const y = r + this.textureHeight / 2;
        return [Math.floor(x), Math.floor(y)];
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

    clearGrid(gl) {
        for (let y = 0; y < this.textureHeight; y++) {
            for (let x = 0; x < this.textureWidth; x++) {
                const index = (y * this.textureWidth + x) * 4;
                this.textureData[index] = 0;
                this.textureData[index + 1] = 0;
                this.textureData[index + 2] = 0;
                this.textureData[index + 3] = 0;
            }
        }
        if (gl && this.gridTexture) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.textureWidth, this.textureHeight, 
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

    getCellIndexFromWorld(world, q, r, s) {
        return 1;
    }

    // Abstract methods
    getVertexShaderSource() {
        throw new Error("Method 'getVertexShaderSource()' must be implemented.");
    }

    getFragmentShaderSource() {
        throw new Error("Method 'getFragmentShaderSource()' must be implemented.");
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
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