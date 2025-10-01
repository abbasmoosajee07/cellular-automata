class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.initWebGL();
        if (!this.gl) {
            throw new Error("WebGL not supported");
        }

        this.initShaders();
        this.initBuffers();
        this.updateCanvasSize();
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('WebGL not supported');
            return null;
        }
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        
        return gl;
    }

    initShaders() {
        const gl = this.gl;

        const vsSource = `
            attribute vec2 aPosition;
            attribute vec4 aColor;
            uniform mat3 uTransform;
            varying vec4 vColor;
            
            void main() {
                vec2 position = (uTransform * vec3(aPosition, 1.0)).xy;
                gl_Position = vec4(position, 0.0, 1.0);
                vColor = aColor;
            }
        `;

        const fsSource = `
            precision mediump float;
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `;

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
            color: gl.getAttribLocation(this.program, 'aColor')
        };

        this.uniformLocations = {
            transform: gl.getUniformLocation(this.program, 'uTransform')
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
        
        this.vertexBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        
        this.geometry = null;
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
        const gl = this.gl;

        if (!geometry || geometry.vertexCount === 0) return;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.colors, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

        this.geometry = geometry;
    }

    draw(cameraView) {
        const gl = this.gl;
        
        if (!this.geometry || this.geometry.indexCount === 0) {
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        const transform = this.calculateTransform(cameraView);
        gl.uniformMatrix3fv(this.uniformLocations.transform, false, transform);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.attribLocations.position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.attribLocations.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(this.attribLocations.color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.attribLocations.color);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.geometry.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    calculateTransform(cameraView) {
        const zoom = cameraView.zoom;
        const camX = cameraView.camX;
        const camY = cameraView.camY;
        
        // FIXED: Proper coordinate transformation that matches mouse calculations
        const scaleX = (2 * zoom) / this.width;
        const scaleY = (-2 * zoom) / this.height; // Keep negative for proper Y direction
        
        const translateX = (2 * camX) / this.width;
        const translateY = (-2 * camY) / this.height;
        
        return new Float32Array([
            scaleX, 0, 0,
            0, scaleY, 0,
            translateX, translateY, 1
        ]);
    }
}

export { WebGLRenderer };