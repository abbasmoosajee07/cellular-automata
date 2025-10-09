import { BaseGrid } from './base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.sideLength = 60;
        this.height = this.sideLength * Math.sqrt(3) / 2;
        this.baseCellSize = this.sideLength;
        this.usesTriIndex = false;

        this.bindMethods();
    }

    bindMethods() {
        const methods = ['pickTriangle'];
        methods.forEach(method => {
            if (this[method]) this[method] = this[method].bind(this);
        });
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
                }
            `;
        } else {
            return `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
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

                bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
                    vec2 v0 = b - a;
                    vec2 v1 = c - a;
                    vec2 v2 = p - a;

                    float d00 = dot(v0, v0);
                    float d01 = dot(v0, v1);
                    float d11 = dot(v1, v1);
                    float d20 = dot(v2, v0);
                    float d21 = dot(v2, v1);

                    float denom = d00 * d11 - d01 * d01;
                    float v = (d11 * d20 - d01 * d21) / denom;
                    float w = (d00 * d21 - d01 * d20) / denom;
                    float u = 1.0 - v - w;

                    return (u >= -0.001 && v >= -0.001 && w >= -0.001);
                }

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    worldPos += vec2(0.0001, 0.0001);

                    float s = uSideLength;
                    float h = uHeight;

                    float row = floor(worldPos.y / h);
                    float col = floor((worldPos.x - mod(row, 2.0) * s * 0.5) / s);

                    float localX = worldPos.x - col * s - mod(row, 2.0) * s * 0.5;
                    float localY = worldPos.y - row * h;

                    bool isUpTriangle = mod(row + col, 2.0) == 0.0;
                    vec2 p = vec2(localX, localY);
                    bool inTriangle;

                    if (isUpTriangle) {
                        vec2 a = vec2(0.0, 0.0);
                        vec2 b = vec2(s, 0.0);
                        vec2 c = vec2(s * 0.5, h);
                        inTriangle = pointInTriangle(p, a, b, c);
                    } else {
                        vec2 a = vec2(0.0, h);
                        vec2 b = vec2(s, h);
                        vec2 c = vec2(s * 0.5, 0.0);
                        inTriangle = pointInTriangle(p, a, b, c);
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        outColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2((col + 0.5) / uGridSize, (row + 0.5) / uGridSize);
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

                bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
                    vec2 v0 = b - a;
                    vec2 v1 = c - a;
                    vec2 v2 = p - a;

                    float d00 = dot(v0, v0);
                    float d01 = dot(v0, v1);
                    float d11 = dot(v1, v1);
                    float d20 = dot(v2, v0);
                    float d21 = dot(v2, v1);

                    float denom = d00 * d11 - d01 * d01;
                    float v = (d11 * d20 - d01 * d21) / denom;
                    float w = (d00 * d21 - d01 * d20) / denom;
                    float u = 1.0 - v - w;

                    return (u >= -0.001 && v >= -0.001 && w >= -0.001);
                }

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    worldPos += vec2(0.0001, 0.0001);

                    float s = uSideLength;
                    float h = uHeight;

                    float row = floor(worldPos.y / h);
                    float col = floor((worldPos.x - mod(row, 2.0) * s * 0.5) / s);

                    float localX = worldPos.x - col * s - mod(row, 2.0) * s * 0.5;
                    float localY = worldPos.y - row * h;

                    bool isUpTriangle = mod(row + col, 2.0) == 0.0;
                    vec2 p = vec2(localX, localY);
                    bool inTriangle;

                    if (isUpTriangle) {
                        vec2 a = vec2(0.0, 0.0);
                        vec2 b = vec2(s, 0.0);
                        vec2 c = vec2(s * 0.5, h);
                        inTriangle = pointInTriangle(p, a, b, c);
                    } else {
                        vec2 a = vec2(0.0, h);
                        vec2 b = vec2(s, h);
                        vec2 c = vec2(s * 0.5, 0.0);
                        inTriangle = pointInTriangle(p, a, b, c);
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        gl_FragColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2((col + 0.5) / uGridSize, (row + 0.5) / uGridSize);
                    vec4 cellValue = texture2D(uGridTexture, texCoord);
                    gl_FragColor = (cellValue.a > 0.1) ? uDrawColor : uBgColor;
                }
            `;
        }
    }

    worldToCell(world) {
        const s = this.sideLength;
        const h = this.height;

        const row = Math.floor(world.y / h);
        const col = Math.floor((world.x - (row % 2) * s * 0.5) / s);

        const localX = world.x - col * s - (row % 2) * s * 0.5;
        const localY = world.y - row * h;

        const isUpTriangle = (row + col) % 2 === 0;
        let inTriangle = false;

        if (isUpTriangle) {
            inTriangle = this.pointInTriangle(
                { x: localX, y: localY },
                { x: 0, y: 0 },
                { x: s, y: 0 },
                { x: s * 0.5, y: h }
            );
        } else {
            inTriangle = this.pointInTriangle(
                { x: localX, y: localY },
                { x: 0, y: h },
                { x: s, y: h },
                { x: s * 0.5, y: 0 }
            );
        }

        if (!inTriangle || row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return [-1, -1];
        }

        return [col, row];
    }

    pointInTriangle(p, a, b, c) {
        const v0 = { x: b.x - a.x, y: b.y - a.y };
        const v1 = { x: c.x - a.x, y: c.y - a.y };
        const v2 = { x: p.x - a.x, y: p.y - a.y };

        const d00 = v0.x * v0.x + v0.y * v0.y;
        const d01 = v0.x * v1.x + v0.y * v1.y;
        const d11 = v1.x * v1.x + v1.y * v1.y;
        const d20 = v2.x * v0.x + v2.y * v0.y;
        const d21 = v2.x * v1.x + v2.y * v1.y;

        const denom = d00 * d11 - d01 * d01;
        const v = (d11 * d20 - d01 * d21) / denom;
        const w = (d00 * d21 - d01 * d20) / denom;
        const u = 1 - v - w;

        return (u >= -0.001 && v >= -0.001 && w >= -0.001);
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

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, -cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.sideLength, geometry.baseCellSize);
        gl.uniform1f(uniformLocations.height, geometry.baseCellSize * Math.sqrt(3) / 2);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        return uniformLocations;
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

    pickTriangle(x, y) {
        const world = this.screenToWorld(x, y, window.innerWidth, window.innerHeight, { camX: 0, camY: 0, zoom: 1 });
        const cell = this.worldToCell(world);
        if (cell[0] !== -1 && cell[1] !== -1) {
            return { col: cell[0], row: cell[1] };
        }
        return null;
    }

    drawCanvasCells(ctx, cells) {
        const cellSize = this.baseCellSize || 60;
        const height = cellSize * Math.sqrt(3) / 2;

        for (const [col, colMap] of cells) {
            for (const [row, state] of colMap) {
                if (state) {
                    const x = col * (cellSize / 2);
                    const y = row * height;
                    const orientation = (col + row) % 2;
                    this.drawEquilateralTriangle(ctx, x, y, cellSize, orientation);
                }
            }
        }
    }

    drawEquilateralTriangle(ctx, x, y, size, orientation) {
        const height = size * Math.sqrt(3) / 2;
        ctx.beginPath();
        if (orientation === 0) {
            ctx.moveTo(x, y + height);
            ctx.lineTo(x + size / 2, y);
            ctx.lineTo(x + size, y + height);
        } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size / 2, y + height);
            ctx.lineTo(x + size, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

export { TriangleGrid };
