import { BaseGrid } from '../base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.baseCellSize = 60;
    }

    worldToCell(world) {
        const col = Math.round(world.x / (this.baseCellSize || 50));
        const row = Math.round(world.y / (this.baseCellSize || 50));
        return [col, row, 0];
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

    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates with 1-cell boundary offset
        const minQ = -Math.floor(this.gridCols / 2) - 1; // -1 for boundary
        const minR = -Math.floor(this.gridRows / 2) - 1; // -1 for boundary

        const texX = q - minQ;
        const texY = r - minR;

        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX >= 0 && texX < this.textureWidth  && texY >= 0 && texY < this.textureHeight ) {
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

                    // Calculate bounds including boundary (centered around 0)
                    float minQ = -float(uGridCols) * 0.5 - 1.0;  // -1 for boundary
                    float maxQ = float(uGridCols) * 0.5;
                    float minR = -float(uGridRows) * 0.5 - 1.0;  // -1 for boundary
                    float maxR = float(uGridRows) * 0.5;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {

                        // Convert to texture coordinates for the grid (with boundary offset)
                        vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols + 2.0, uGridRows + 2.0);
                        vec4 cellColor = texture(uGridTexture, texCoord);

                        outColor = cellColor;
                    } else {
                        // Outside extended bounds - use transparent
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

                    float minQ = -float(uGridCols) * 0.5 - 1.0;
                    float maxQ = float(uGridCols) * 0.5;
                    float minR = -float(uGridRows) * 0.5 - 1.0;
                    float maxR = float(uGridRows) * 0.5;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {

                        vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols + 2.0, uGridRows + 2.0);
                        vec4 cellColor = texture2D(uGridTexture, texCoord);

                        gl_FragColor = cellColor;
                    } else {
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