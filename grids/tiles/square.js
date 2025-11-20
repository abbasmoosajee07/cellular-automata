import { BaseGrid } from '../base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.cellSize = 50;
    }

    worldToCell(world) {
        const col = Math.round(world.x / (this.cellSize));
        const row = Math.round(world.y / (this.cellSize));
        return [col, row, 0];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.cellSize;

        // Calculate visible cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
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

                uniform vec2  uResolution;
                uniform vec2  uOffset;
                uniform float uScale;
                uniform float uGridCols;
                uniform float uGridRows;
                uniform float uBaseCellSize;

                uniform sampler2D uGridTexture;
                uniform vec4 uCanvasColor;
                uniform vec4 uGridColor;

                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {

                    // convert screen → world
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    // world → cell index
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);

                    // grid bounds centered around 0
                    float minQ = -uGridCols * 0.5;
                    float maxQ =  uGridCols * 0.5 - 1.0;
                    float minR = -uGridRows * 0.5;
                    float maxR =  uGridRows * 0.5 - 1.0;

                    // check inside grid
                    if (cellCoord.x < minQ || cellCoord.x > maxQ ||
                        cellCoord.y < minR || cellCoord.y > maxR) {

                        outColor = uCanvasColor;
                        return;
                    }

                    // convert cell → texture uv
                    vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                    vec4 cellColor = texture(uGridTexture, texCoord);

                    // if cell empty → use grid color
                    if (cellColor.a <= 0.0) {
                        outColor = uGridColor;
                    } else {
                        outColor = cellColor;
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
                uniform vec4 uCanvasColor;
                uniform vec4 uGridColor;     // NEW! color used when texel is empty

                varying vec2 vTexCoord;

                void main() {

                    // World → grid conversion
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    // Snap to cell grid
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);

                    // Grid bounds centered on (0,0)
                    float minQ = -uGridCols * 0.5;
                    float maxQ =  uGridCols * 0.5 - 1.0;
                    float minR = -uGridRows * 0.5;
                    float maxR =  uGridRows * 0.5 - 1.0;

                    // Outside grid → background color
                    if (cellCoord.x < minQ || cellCoord.x > maxQ ||
                        cellCoord.y < minR || cellCoord.y > maxR) {

                        gl_FragColor = uCanvasColor;
                        return;
                    }

                    // Convert cell to texture lookup
                    vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);

                    // Read texture
                    vec4 cellColor = texture2D(uGridTexture, texCoord);

                    // If alpha == 0 → empty cell → use grid color instead
                    if (cellColor.a <= 0.0) {
                        gl_FragColor = uGridColor;
                    } else {
                        gl_FragColor = cellColor;
                    }
                }
            `;
        }
    }

    drawGridShape(ctx) {
        const w = this.gridCols * this.cellSize;
        const h = this.gridRows * this.cellSize;

        ctx.fillRect(
            -w / 2 - this.cellSize / 2,
            -h / 2 + this.cellSize / 2,
            w,
            h,
        );
    }

    drawShapeCell(ctx, q, r, s, state) {
        const cellSize = this.cellSize;
        const worldX = q * cellSize;
        const worldY = -r * cellSize;

        const drawColor = this.colorSchema[state] || [1, 1, 1, 1];
        ctx.fillStyle = `rgba(
            ${Math.round(drawColor[0] * 255)},
            ${Math.round(drawColor[1] * 255)},
            ${Math.round(drawColor[2] * 255)},
            ${drawColor[3]}
        )`;

        ctx.fillRect(
            worldX - cellSize / 2,
            worldY - cellSize / 2,
            cellSize,
            cellSize
        );
    }
}

export { SquareGrid };