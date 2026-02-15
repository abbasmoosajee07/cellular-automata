
class WebGLRenderer {
    constructor(canvas, shapeGrid, { forceWebGL1 = false } = {}) {
        this.canvas = canvas;
        this.shapeGrid = shapeGrid;

        this.gl = this.initWebGL(forceWebGL1);
        if (!this.gl) throw new Error("WebGL not supported");

        // Renderer capability detection
        this.isWebGL2 = !forceWebGL1 && this.gl instanceof WebGL2RenderingContext;
        const rendererUsed = this.isWebGL2 ? "webgl2" : "webgl";
        console.log("Renderer Used:", rendererUsed)

        this.cachedGeometry = null;
        this.shapeGrid.addRenderer(rendererUsed);
    }

    setupRenderStrategy(strategy) {
        this.chunked = (strategy === "chunked");
        this.initShaders();
        this.initBuffers();
        this.updateCanvasSize();
        if (!this.chunked) {
            this.shapeGrid.initGridTexture(this.gl);
        }
    }

    initWebGL(forceWebGL1) {
        let gl = null;

        // Default: try WebGL2 first
        if (!forceWebGL1) {
            gl = this.canvas.getContext('webgl2');
        }

        // Fallback or forced WebGL1
        if (!gl) {
            gl = this.canvas.getContext('webgl') ||
                this.canvas.getContext('experimental-webgl');

            if (gl) {
                console.warn(forceWebGL1
                    ? "Forced WebGL1" : "Falling back to WebGL1"
                );
            }
        }

        if (!gl) {
            console.error("WebGL not supported");
            return null;
        }

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        return gl;
    }

    initShaders() {
        const gl = this.gl;

        // Ask grid for appropriate shader sources
        const vsSource = this.shapeGrid.getVertexShaderSource(this.isWebGL2);
        const fsSource = this.shapeGrid.getFragmentShaderSource(this.isWebGL2, this.chunked);

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program failed to link:', gl.getProgramInfoLog(this.program));
        }

        this.attribLocations = {
            position: gl.getAttribLocation(this.program, 'aPosition'),
            triIndex: gl.getAttribLocation(this.program, 'aTriIndex')
        };
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffers() {
        const gl = this.gl;
        const buffers = this.shapeGrid.setupGeometryBuffers(gl);

        this.vertexBuffer = buffers.vertexBuffer;
        this.indexBuffer = buffers.indexBuffer;
        this.indexCount = buffers.indexCount;
        this.usesTriIndex = buffers.usesTriIndex || false;
        this.stride = buffers.stride || 8;
        this.positionOffset = buffers.positionOffset || 0;
        this.triIndexOffset = buffers.triIndexOffset || 0;

        // Optional: use VAO if available
        if (this.isWebGL2 && gl.createVertexArray) {
            this.vao = gl.createVertexArray();
            gl.bindVertexArray(this.vao);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.enableVertexAttribArray(this.attribLocations.position);
            gl.vertexAttribPointer(this.attribLocations.position, 2, gl.FLOAT, false, this.stride, this.positionOffset);

            if (this.attribLocations.triIndex >= 0 && this.usesTriIndex) {
                gl.enableVertexAttribArray(this.attribLocations.triIndex);
                gl.vertexAttribPointer(this.attribLocations.triIndex, 1, gl.FLOAT, false, this.stride, this.triIndexOffset);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bindVertexArray(null);
        }
    }

    updateCanvasSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;

        const gl = this.gl;
        gl.viewport(0, 0, width, height);
    }

    uploadGeometry(geometry) {
        this.cachedGeometry = geometry;
    }

    uploadTexture() {
        const gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.shapeGrid.gridTexture);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, 0,
            this.shapeGrid.textureWidth,
            this.shapeGrid.textureHeight,
            this.isWebGL2 ? gl.RED_INTEGER : gl.RGBA,
            gl.UNSIGNED_BYTE,
            this.shapeGrid.textureData
        );
    }

    uploadCell(x, y, state) {
        const gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.shapeGrid.gridTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        const data = new Uint8Array([state]);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            x, y,
            1, 1,
            gl.RED_INTEGER,
            gl.UNSIGNED_BYTE,
            data
        );
    }

    clearAll() {
        this.shapeGrid.clearGrid(this.gl);
    }

    renderCell(cameraView, q, r, s, state) {
        const info = this.shapeGrid.setCellState(q, r, s, state);
        if (this.isWebGL2) {
            this.uploadCell(info.x, info.y, info.state);
        } else {
            this.uploadTexture();
        }
    }

    syncCellsToTexture(cells) {
        const arr = cells.each_live_cell();
        this.shapeGrid.textureData.fill(0);
        for (let i = 0; i < arr.length; i += 4) {
            const q = arr[i];
            const r = arr[i + 1];
            const s = arr[i + 2];
            const state = arr[i + 3];

            this.shapeGrid.setCellState(q, r, s, state);
        }
        this.uploadTexture();
    }

    directGridRender(cameraView, cells, updateCells) {
        if (updateCells) {
            this.syncCellsToTexture(cells);
        }
        this.updateView(cameraView);
    }

    chunkedGridRender(cameraView, cells, updateCells) {
        if (updateCells) {
            this.syncCellsToTexture(cells);
        }
        this.updateView(cameraView);
    }

    updateView(cameraView) {
        const gl = this.gl;
        const gridGeometry = this.cachedGeometry;

        if (!gridGeometry || !gridGeometry.texture) {
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        if (this.vao) {
            gl.bindVertexArray(this.vao);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.enableVertexAttribArray(this.attribLocations.position);
            gl.vertexAttribPointer(
                this.attribLocations.position, 2, gl.FLOAT, false, this.stride, this.positionOffset
            );

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        }

        const uniformLocations = this.shapeGrid.setupUniforms(
            gl, this.program, cameraView, this.width, this.height
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gridGeometry.texture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

        if (this.vao) {
            gl.bindVertexArray(null);
        }
    }

    drawChunk(cameraView, texture, cx, cy, chunkSize) {
        const gl = this.gl;

        gl.useProgram(this.program);

        if (this.vao) {
            // WebGL2: VAO already has buffers + attrib pointers recorded
            gl.bindVertexArray(this.vao);
        } else {
            // WebGL1: must bind buffers and set attrib pointers every draw call
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.enableVertexAttribArray(this.attribLocations.position);
            gl.vertexAttribPointer(
                this.attribLocations.position, 2, gl.FLOAT, false, this.stride, this.positionOffset
            );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        }

        const uniforms = this.shapeGrid.setupUniforms(
            gl, this.program, cameraView, this.width, this.height
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uniforms.gridTexture, 0);

        // WebGL2 chunk shader uses ivec2/int uniforms; WebGL1 shader uses vec2/float.
        if (this.isWebGL2) {
            gl.uniform2i(
                gl.getUniformLocation(this.program, "uChunkOrigin"),
                cx * chunkSize,
                cy * chunkSize
            );
            gl.uniform1i(
                gl.getUniformLocation(this.program, "uChunkSize"),
                chunkSize
            );
        } else {
            gl.uniform2f(
                gl.getUniformLocation(this.program, "uChunkOrigin"),
                cx * chunkSize,
                cy * chunkSize
            );
            gl.uniform1f(
                gl.getUniformLocation(this.program, "uChunkSize"),
                chunkSize
            );
        }

        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

        if (this.vao) gl.bindVertexArray(null);
    }

    resetView(cameraView) {
        const gl = this.gl;

        gl.useProgram(this.program);

        if (this.vao) gl.bindVertexArray(this.vao);

        // const uniforms = this.shapeGrid.setupUniforms(
        //     gl, this.program, cameraView, this.width, this.height
        // );

        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, texture);
        // gl.uniform1i(uniforms.gridTexture, 0);

        // gl.uniform2i(
        //     gl.getUniformLocation(this.program, "uChunkOrigin"),
        //     cx * chunkSize,
        //     cy * chunkSize
        // );

        // gl.uniform1i(
        //     gl.getUniformLocation(this.program, "uChunkSize"),
        //     chunkSize
        // );

        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

        if (this.vao) gl.bindVertexArray(null);
    }

}

export { WebGLRenderer };