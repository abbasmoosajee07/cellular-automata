import { BaseGrid } from './base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.radius = 30;
        this.baseCellSize = 60;
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
            // WebGL1 fallback
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
                uniform float uBaseCellSize;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    float halfGridWorld = uGridSize * uBaseCellSize * 0.5;
                    vec2 gridPos = floor((worldPos + halfGridWorld) / uBaseCellSize);

                    if (gridPos.x >= 0.0 && gridPos.x < uGridSize && gridPos.y >= 0.0 && gridPos.y < uGridSize) {
                        vec2 texCoord = gridPos / uGridSize;
                        vec4 cellValue = texture(uGridTexture, texCoord);

                        if (cellValue.a > 0.5) {
                            outColor = uDrawColor;
                        } else {
                            outColor = uBgColor;
                        }
                    } else {
                        outColor = uBgColor;
                    }
                }
            `;
        } else {
            // WebGL1 fallback
            return `
                precision mediump float;
                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridSize;
                uniform float uBaseCellSize;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    float halfGridWorld = uGridSize * uBaseCellSize * 0.5;
                    vec2 gridPos = floor((worldPos + halfGridWorld) / uBaseCellSize);

                    if (gridPos.x >= 0.0 && gridPos.x < uGridSize && gridPos.y >= 0.0 && gridPos.y < uGridSize) {
                        vec2 texCoord = gridPos / uGridSize;
                        vec4 cellValue = texture2D(uGridTexture, texCoord);

                        if (cellValue.a > 0.5) {
                            gl_FragColor = uDrawColor;
                        } else {
                            gl_FragColor = uBgColor;
                        }
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    worldToCell(world) {
        const size = this.baseCellSize;
        const halfGridSize = (this.gridSize * size) / 2;
        const cellX = Math.floor((world.x + halfGridSize) / size);
        const cellY = Math.floor((world.y + halfGridSize) / size);
        return [cellX, cellY];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        const minCol = Math.floor(minX / size) - 1;
        const maxCol = Math.ceil(maxX / size) + 1;
        const minRow = Math.floor(minY / size) - 1;
        const maxRow = Math.ceil(maxY / size) + 1;

        return [minCol, maxCol, minRow, maxRow];
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridSize: gl.getUniformLocation(program, 'uGridSize'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, -cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.baseCellSize, geometry.baseCellSize);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
    }

    drawCanvasCells(ctx, cells) {
        const cellSize = this.baseCellSize || 60;
        const halfGridSize = (this.gridSize * cellSize) / 2;

        for (const [col, colMap] of cells) {
            for (const [row, state] of colMap) {
                if (state) {
                    const worldX = col * cellSize - halfGridSize;
                    const worldY = row * cellSize - halfGridSize;
                    ctx.fillRect(worldX, worldY, cellSize, cellSize);
                }
            }
        }
    }
}

export { SquareGrid };