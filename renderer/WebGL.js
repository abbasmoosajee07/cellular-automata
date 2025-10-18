
class WebGLRenderer {
    constructor(canvas, shapeGrid) {
        this.canvas = canvas;
        this.shapeGrid = shapeGrid;
        this.gl = this.initWebGL();
        if (!this.gl) throw new Error("WebGL not supported");

        this.isWebGL2 = this.gl instanceof WebGL2RenderingContext;

        this.initShaders();
        this.initBuffers();
        this.updateCanvasSize();

        this.cachedGeometry = null;
    }

    initWebGL() {
        let gl = this.canvas.getContext('webgl2');
        if (!gl) {
            gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
            if (gl) console.warn("Falling back to WebGL1");
        }

        if (!gl) {
            console.error('WebGL not supported');
            return null;
        }

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        // --- Background fill (match canvas logic) ---
        const bgColor = this.shapeGrid.colorSchema.bg || [0.5, 0.5, 0.5, 1];
        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return gl;
    }

    initShaders() {
        const gl = this.gl;

        // Ask grid for appropriate shader sources
        const vsSource = this.shapeGrid.getVertexShaderSource(this.isWebGL2);
        const fsSource = this.shapeGrid.getFragmentShaderSource(this.isWebGL2);

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

    draw(cameraView, gridGeometry) {
        const gl = this.gl;

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
}


export { WebGLRenderer };