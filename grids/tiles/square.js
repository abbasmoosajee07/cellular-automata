import { BaseGrid } from '../base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.baseCellSize = 60;
    }

    worldToCell(world) {
        const size = this.baseCellSize;

        // Direct world to cell conversion - centered coordinates
        // World (0,0) maps to cell (0,0)
        const cellX = Math.round(world.x / size);
        const cellY = Math.round(world.y / size);

        // Convert to cube coordinates with s = 0
        return [cellX, cellY, 0];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    setupUniforms(gl, program, cameraView, geometry, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridCols: gl.getUniformLocation(program, 'uGridCols'),
            gridRows: gl.getUniformLocation(program, 'uGridRows'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.baseCellSize, this.baseCellSize);

        return uniformLocations;
    }

    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);

        const texX = q - minQ;
        const texY = r - minR;

        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX >= 0 && texX < this.gridCols && texY >= 0 && texY < this.gridRows) {
            const index = (texY * this.gridCols + texX) * 4;

            if (state) {
                const color = this.colorSchema[state] || [1, 1, 1, 1];
                // Store the cell color
                this.textureData[index] = color[0] * 255;
                this.textureData[index + 1] = color[1] * 255;
                this.textureData[index + 2] = color[2] * 255;
                this.textureData[index + 3] = 255; // Full opacity for active cells
            } else {
                // For inactive cells, store transparent
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

    getFragmentShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision mediump float;
                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridCols;
                uniform float uGridRows;
                uniform float uBaseCellSize;
                uniform sampler2D uGridTexture;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    // Direct world to cell conversion - centered coordinates
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);

                    // Calculate bounds (centered around 0)
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {

                        // Convert to texture coordinates for the grid
                        vec2 gridTexCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellColor = texture(uGridTexture, gridTexCoord);

                        // Always use the color from texture, regardless of alpha
                        outColor = cellColor;
                    } else {
                        // Outside grid bounds - use transparent
                        outColor = vec4(0.0);
                    }
                }
            `;
        } else {
            return `
                precision mediump float;
                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridCols;
                uniform float uGridRows;
                uniform float uBaseCellSize;
                uniform sampler2D uGridTexture;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);

                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {

                        vec2 gridTexCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellColor = texture2D(uGridTexture, gridTexCoord);

                        // Always use the color from texture
                        gl_FragColor = cellColor;
                    } else {
                        // Outside grid bounds - use transparent
                        gl_FragColor = vec4(0.0);
                    }
                }
            `;
        }
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const cellSize = this.cellSize;

        for (const [key, state] of cells) {
            if (state) {

                const [q, r, s] = key.split(',').map(Number);
                const worldX = q * this.baseCellSize;
                const worldY = r * this.baseCellSize;

                // Use color schema based on state value
                const drawColor = this.colorSchema[state] ||  [1, 1, 1, 1];
                ctx.fillStyle = `rgba(
                    ${Math.round(drawColor[0] * 255)},
                    ${Math.round(drawColor[1] * 255)},
                    ${Math.round(drawColor[2] * 255)},
                    ${drawColor[3]}
                )`;

                ctx.fillRect(
                    worldX, -worldY, cellSize, cellSize
                );
            }
        }
    }
}

export { SquareGrid };