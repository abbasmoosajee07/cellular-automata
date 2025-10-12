import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.sideLength = 60;
        this.height = this.sideLength * Math.sqrt(3) / 2; // Equilateral triangle height
    }

    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision highp float;
                in vec2 aPosition;
                out vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    // Flip Y so top of screen = top of canvas
                    vTexCoord = vec2(aPosition.x * 0.5 + 0.5, 1.0 - (aPosition.y * 0.5 + 0.5));
                }
            `;
        } else {
            return `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    // Flip Y so top of screen = top of canvas
                    vTexCoord = vec2(aPosition.x * 0.5 + 0.5, 1.0 - (aPosition.y * 0.5 + 0.5));
                }
            `;
        }
    }

    getFragmentShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision mediump float;

                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    // Convert to world coordinates (Y upward)
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    float s = uSideLength;
                    float h = uHeight;

                    float row = floor(worldPos.y / h);
                    float col = floor(worldPos.x / s);

                    bool isUpTriangle = mod(float(col) + float(row), 2.0) == 0.0;

                    float localX = worldPos.x - col * s;
                    float localY = worldPos.y - row * h;

                    float halfWidth = s * 0.5;
                    bool inTriangle = false;

                    if (isUpTriangle) {
                        inTriangle = localY >= 0.0 && localY <= h &&
                                    localX >= 0.0 && localX <= s &&
                                    localY <= (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    } else {
                        inTriangle = localY >= 0.0 && localY <= h &&
                                    localX >= 0.0 && localX <= s &&
                                    localY >= h - (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        outColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2(col + 0.5, row + 0.5) / vec2(uGridSize, uGridSize);
                    vec4 cellValue = texture(uGridTexture, texCoord);

                    outColor = (cellValue.a > 0.1) ? uDrawColor : uBgColor;
                }
            `;
        } else {
            return `
                precision mediump float;

                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                varying vec2 vTexCoord;

                void main() {
                    // Convert to world coordinates (Y upward)
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    float s = uSideLength;
                    float h = uHeight;

                    float row = floor(worldPos.y / h);
                    float col = floor(worldPos.x / s);

                    bool isUpTriangle = mod(float(col) + float(row), 2.0) == 0.0;

                    float localX = worldPos.x - col * s;
                    float localY = worldPos.y - row * h;

                    float halfWidth = s * 0.5;
                    bool inTriangle = false;

                    if (isUpTriangle) {
                        inTriangle = localY >= 0.0 && localY <= h &&
                                    localX >= 0.0 && localX <= s &&
                                    localY <= (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    } else {
                        inTriangle = localY >= 0.0 && localY <= h &&
                                    localX >= 0.0 && localX <= s &&
                                    localY >= h - (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        gl_FragColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2(col + 0.5, row + 0.5) / vec2(uGridSize, uGridSize);
                    vec4 cellValue = texture2D(uGridTexture, texCoord);

                    gl_FragColor = (cellValue.a > 0.1) ? uDrawColor : uBgColor;
                }
            `;
        }
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridSize: gl.getUniformLocation(program, 'uGridSize'),
            sideLength: gl.getUniformLocation(program, 'uSideLength'),
            height: gl.getUniformLocation(program, 'uHeight'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        // ✅ Flip Y offset to match Canvas coordinate system
        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.sideLength, this.sideLength);
        gl.uniform1f(uniformLocations.height, this.height);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
    }

    worldToCell(world) {
        const s = this.sideLength;
        const h = this.height;

        // ✅ Flip Y to match WebGL coordinate space
        
        const y = -world.y;

        const row = Math.floor(y / h);
        const col = Math.floor(world.x / s);

        const isUpTriangle = (col + row) % 2 === 0;
        const localX = world.x - col * s;
        const localY = y - row * h;

        const halfWidth = s * 0.5;
        let inTriangle = false;

        if (isUpTriangle) {
            inTriangle = localY >= 0 && localY <= h &&
                        localX >= 0 && localX <= s &&
                        localY <= (h / halfWidth) * (halfWidth - Math.abs(localX - halfWidth));
        } else {
            inTriangle = localY >= 0 && localY <= h &&
                        localX >= 0 && localX <= s &&
                        localY >= h - (h / halfWidth) * (halfWidth - Math.abs(localX - halfWidth));
        }

        if (!inTriangle || row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return [-1, -1];
        }

        return [col, row];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const s = this.sideLength;
        const h = this.height;

        const minCol = Math.floor(minX / s) - 1;
        const maxCol = Math.ceil(maxX / s) + 1;
        const minRow = Math.floor(minY / h) - 1;
        const maxRow = Math.ceil(maxY / h) + 1;

        return [minCol, maxCol, minRow, maxRow];
    }

    drawCanvasCells(ctx, cells) {
        const side = this.sideLength || 60;
        const height = this.height || (side * Math.sqrt(3) / 2);

        for (const [col, colMap] of cells) {
            for (const [row, state] of colMap) {
                if (!state) continue;

                // ✅ Center origin and flip Y-axis to match WebGL
                const worldX = col * side;
                const worldY = -row * height; // invert Y so up is positive

                const orientation = (col + row) % 2 === 0 ? 0 : 1;

                this.drawEquilateralTriangle(ctx, worldX, worldY, side, height, orientation);
            }
        }
    }

    drawEquilateralTriangle(ctx, x, y, side, height, orientation) {
        const halfWidth = side * 0.5;

        ctx.beginPath();

        if (orientation === 0) {
            // 🔺 Upward triangle (flat base at bottom)
            ctx.moveTo(x, y);
            ctx.lineTo(x + halfWidth, y + height);
            ctx.lineTo(x - halfWidth, y + height);
        } else {
            // 🔻 Downward triangle (flat base at top)
            ctx.moveTo(x, y);
            ctx.lineTo(x + halfWidth, y - height);
            ctx.lineTo(x - halfWidth, y - height);
        }

        ctx.closePath();
        ctx.fill();
    }

}

export { TriangleGrid };
