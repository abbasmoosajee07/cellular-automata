import { BaseGrid } from '../base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.cellSize = 50;
    }

    worldToCell(world) {
        const col = Math.floor(+world.x / this.cellSize + 0.5);
        const row = Math.floor(-world.y / this.cellSize - 0.5);

        return [col, row, 0];
    }

    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);

        const texX = q - minQ;
        const texY = (this.gridRows - 1) - (r - minR);

        return [Math.floor(texX), Math.floor(texY)];
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
                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  ceil(uGridRows * 0.5) - 1.0;

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
                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  ceil(uGridRows * 0.5) - 1.0;

                    // Outside grid → background color
                    if (cellCoord.x < minQ || cellCoord.x > maxQ ||
                        cellCoord.y < minR || cellCoord.y > maxR) {

                        gl_FragColor = uCanvasColor;
                        return;
                    }

                    // Convert cell to texture lookup
                    // vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                    vec2 texCoord = (cellCoord - vec2(minQ, minR) + 0.5)
                                    / vec2(uGridCols, uGridRows);

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
            -w / 2 - this.cellSize/2,
            -h / 2 - this.cellSize/2,
            w,
            h,
        );
    }

    drawShapeCell(ctx, q, r, s, state) {
        const cellSize = this.cellSize;
        const worldX = q * cellSize;
        const worldY = r * cellSize;

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

    screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS) {
        let minX, maxX, minY, maxY;
        const fitFactor = 1.1;

        // Simple linear mapping
        const size = this.cellSize;

        minX = minQ * size;
        maxX = maxQ * size;

        minY = minR * size;
        maxY = maxR * size;
        minY *= fitFactor;
        maxY *= fitFactor;
        return [minX, maxX, minY, maxY];

    }
}

export { SquareGrid };