
class BaseGrid {

    constructor(colorSchema, shape, gridSize) {
        this.colorSchema = colorSchema;
        this.shape = shape;
        this.rendererUsed = null;

        // Common properties
        this.radius = 30;
        this.cellSize = 50;

        this.gridCols = gridSize[0];
        this.colMult = 1;

        this.gridRows = gridSize[1];
        this.rowMult = 1;

        this.gridTexture = null;
        this.textureData = null;

        // Common WebGL buffers
        this.vertexBuffer = null;
        this.indexBuffer = null;
        console.log(`Tile Shape: ${shape}`);
    }

    addRenderer(rendererUsed) {
        this.rendererUsed = rendererUsed;
    }

    buildPalette(maxStates = 16) {
        const palette = new Float32Array(maxStates * 4);

        // Default color = grid color
        const defaultColor = this.colorSchema.grid || [1, 1, 1, 1];

        // Fill entire palette with grid color
        for (let i = 0; i < maxStates; i++) {
            palette.set(defaultColor, i * 4);
        }

        // Override numeric state entries
        for (const key in this.colorSchema) {
            // Only numeric keys represent states
            const state = Number(key);
            if (!Number.isInteger(state)) continue;
            if (state < 0 || state >= maxStates) continue;

            palette.set(this.colorSchema[key], state * 4);
        }

        return palette;
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
            paletteLoc: gl.getUniformLocation(program, "uPalette"),
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
        const g = this.colorSchema[0];
        gl.uniform4f(uniformLocations.gridColor, g[0], g[1], g[2], g[3]); // NEW

        gl.uniform4fv(uniformLocations.paletteLoc, this.buildPalette(256));
        return uniformLocations;
    }

    screenToWorld(px, py, width, height, cameraView) {
        const worldX = (px - width / 2 - cameraView.camX) / cameraView.zoom;
        const worldY = (height / 2 - py - cameraView.camY) / cameraView.zoom;
        return { x: worldX, y: worldY };
    }

    worldToScreen(world, width, height, cameraView) {
        const px = world.x * cameraView.zoom + width / 2 + cameraView.camX;
        const py = height / 2 - cameraView.camY - world.y * cameraView.zoom;
        return { x: px, y: py };
    }

    getGridGeometry(gridSize) {
        return {
            texture: this.gridTexture,
            textureWidth: this.textureWidth * this.colMult,
            textureHeight: this.textureHeight * this.rowMult,
            gridCols: gridSize[0],
            gridRows: gridSize[1],
            baseCellSize: this.cellSize || this.radius || 50,
            vertexCount: 4,
            indexCount: 6
        };
    }

    setCellState(q, r, s, state) {
        const [x, y] = this.cubeToTextureCoords(q, r, s);

        if (x < 0 || y < 0 ||
            x >= this.textureWidth ||
            y >= this.textureHeight) {
            return null;
        }

        if (this.rendererUsed === "webgl2") {
            const idx = y * this.textureWidth + x;
            this.textureData[idx] = state ?? 0;
            return { x, y, state: this.textureData[idx] };
        }

        // WebGL1 (RGBA)
        const i = (y * this.textureWidth + x) * 4;

        if (state) {
            const c = this.colorSchema[state];
            this.textureData[i]     = c[0] * 255;
            this.textureData[i + 1] = c[1] * 255;
            this.textureData[i + 2] = c[2] * 255;
            this.textureData[i + 3] = 255;
        } else {
            this.textureData.fill(0, i, i + 4);
        }

        return null;
    }

    initGridTexture(gl) {
        this.textureWidth  = this.gridCols * this.colMult;
        this.textureHeight = this.gridRows * this.rowMult;

        const isWebGL2 = this.rendererUsed === "webgl2";

        this.textureData = new Uint8Array(
            isWebGL2
                ? this.textureWidth * this.textureHeight
                : this.textureWidth * this.textureHeight * 4
        );

        this.gridTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        if (isWebGL2) {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.R8UI,
                this.textureWidth,
                this.textureHeight,
                0,
                gl.RED_INTEGER,
                gl.UNSIGNED_BYTE,
                this.textureData
            );
        } else {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                this.textureWidth,
                this.textureHeight,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.textureData
            );
        }
    }

    getFragmentShaderSource(isWebGL2 = false, isChunked = false) {
        const key = `${isWebGL2 ? 'gl2' : 'gl1'}_${isChunked ? 'chunked' : 'direct'}`;

        const shaderMap = {
            gl2_chunked: () => this.chunked_WebGL2(),
            gl2_direct:  () => this.direct_WebGL2(),
            gl1_chunked: () => this.chunked_WebGL1(),
            gl1_direct:  () => this.direct_WebGL1(),
        };

        // // Debug Console Print
        // const fragShaders = shaderMap[key]().split('\n')
        //             .map(line => line.trimStart())
        //             .join('\n');
        // console.log(fragShaders);

        return shaderMap[key]();
    }

    clearGrid(gl) {
        if (!this.textureData || !this.gridTexture) return;

        this.textureData.fill(0);

        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        if (this.rendererUsed === "webgl2") {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0, 0,
                this.textureWidth,
                this.textureHeight,
                gl.RED_INTEGER,
                gl.UNSIGNED_BYTE,
                this.textureData
            );
        } else {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0, 0,
                this.textureWidth,
                this.textureHeight,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.textureData
            );
        }
    }

    transformChunkData(data, chunkSize) {
        return new Uint8Array(data)
    }

    glsl_webgl2_header() {
        return `#version 300 es
            precision highp float;
            precision highp usampler2D;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uRadius;
            uniform float uBaseCellSize;

            uniform usampler2D uGridTexture;
            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;

            uniform vec4 uPalette[256];

            in vec2 vTexCoord;
            out vec4 outColor;`;
    }

    glsl_webgl1_header() {
        return `precision mediump float;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uRadius;
            uniform float uBaseCellSize;

            uniform sampler2D uGridTexture;
            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;

            varying vec2 vTexCoord;`;
    }

    glsl_colorFromState() {
        return `
            vec4 colorFromState(uint state) {
                return (state < 256u) ? uPalette[state] : uPalette[0];
            }`;
    }

    glsl_screenToWorld() {
        return `
            vec2 screenToWorld(vec2 texCoord) {
                return (texCoord * uResolution
                        - uResolution * 0.5
                        - uOffset) / uScale;
            }`;
    }

    glsl_gridbounds_WebGL2() {
        return `
            int minQ = -int(floor(uGridCols * 0.5));
            int maxQ =  int(ceil (uGridCols * 0.5)) - 1;
            int minR = -int(floor(uGridRows * 0.5));
            int maxR =  int(ceil (uGridRows * 0.5)) - 1;
        `;
    }

    glsl_gridbounds_WebGL1() {
        return `
            float minQ = -floor(uGridCols * 0.5);
            float maxQ =  ceil(uGridCols * 0.5) - 1.0;

            float minR = -floor(uGridRows * 0.5);
            float maxR =  ceil(uGridRows * 0.5) - 1.0;
        `;
    }

    // Abstract Shape specific methods
    worldToCell(world) {
        throw new Error("Method 'worldToCell(world)' must be implemented.");
    }

    cellToWorld(q, r, s) {
        throw new Error("Method 'cellToWorld(q, r, s)' must be implemented.");
    }

    getGridCorners(minQ, maxQ, minR, maxR, minS, maxS) {
        throw new Error("Method 'getGridCorners(minQ, maxQ, minR, maxR, minS, maxS)' must be implemented.");
    }

    cubeToTextureCoords(q, r, s) {
        throw new Error("Method 'cubeToTextureCoords(q, r, s)' must be implemented.");
    }

    chunked_WebGL2 () {
        throw new Error("Chunked WebGL2 Fragment shaders must be implemented");
        return ``
    }
    chunked_WebGL1 () {
        throw new Error("Chunked WebGL1 Fragment shaders must be implemented");
        return ``
    }
    direct_WebGL2 () {
        throw new Error("Direct WebGL2 Fragment shaders must be implemented");
        return ``
    }

    direct_WebGL1 () {
        throw new Error("Direct WebGL2 Fragment shaders must be implemented");
        return ``
    }

    drawGridShape(ctx) {
        throw new Error("Method 'drawGridShape(ctx)' must be implemented.");
    }

    drawShapeCell(ctx, q, r, s, state) {
        throw new Error("Method 'drawShapeCell(ctx, q, r, s, state)' must be implemented.");
    }

}

export {BaseGrid};