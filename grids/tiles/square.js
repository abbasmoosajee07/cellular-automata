import { BaseGrid } from '../base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.cellSize = 50;
    }

    worldToCell(world) {
        const q = Math.round(world.x / this.cellSize);
        const r = Math.round(-world.y / this.cellSize);

        return [q, r, 0];
    }

    cellToWorld(q, r, s) {
        const worldX = q * this.cellSize;
        const worldY = r * this.cellSize;
        return {x: worldX, y: worldY};
    }

    getGridCorners(minQ, maxQ, minR, maxR, minS, maxS) {
        const gridCorners = [
            { q: minQ - 1, r: minR - 1, s: 0 },
            { q: maxQ + 1, r: minR - 1, s: 0 },
            { q: maxQ + 1, r: maxR + 1, s: 0 },
            { q: minQ - 1, r: maxR + 1, s: 0 },
        ];
        return gridCorners;
    }

    cubeToTextureCoords(q, r, s) {
        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);
        return [q + centerCol, r + centerRow];
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

                    // screen → world (centered)
                    vec2 worldPos =
                        (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    // world → cell (CENTER-based, symmetric)
                    vec2 cell = round(vec2(
                        +worldPos.x / uBaseCellSize,
                        -worldPos.y / uBaseCellSize
                    ));

                    // Grid bounds centered on (0,0)
                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  ceil(uGridCols * 0.5) - 1.0;
                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  ceil(uGridRows * 0.5) - 1.0;

                    if (cell.x < minQ || cell.x > maxQ ||
                        cell.y < minR || cell.y > maxR) {
                        outColor = uCanvasColor;
                        return;
                    }

                    // sample CELL CENTER like hex grid
                    vec2 texCoord = vec2(
                        (cell.x - minQ + 0.5) / uGridCols,
                        (cell.y - minR + 0.5) / uGridRows
                    );

                    vec4 cellColor = texture(uGridTexture, texCoord);

                    outColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
                }
                `;
        } else {
            return `precision mediump float;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uGridCols;
            uniform float uGridRows;
            uniform float uBaseCellSize;

            uniform sampler2D uGridTexture;
            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;

            varying vec2 vTexCoord;

            void main() {

                // screen → world (centered)
                vec2 worldPos =
                    (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                // world → cell (WebGL1-safe rounding)
                vec2 cell = floor(vec2(
                    worldPos.x / uBaseCellSize,
                -worldPos.y / uBaseCellSize
                ) + 0.5);

                // grid bounds
                float minQ = -floor(uGridCols * 0.5);
                float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                float minR = -floor(uGridRows * 0.5);
                float maxR =  ceil(uGridRows * 0.5) - 1.0;

                // outside grid
                if (cell.x < minQ || cell.x > maxQ ||
                    cell.y < minR || cell.y > maxR) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                // sample cell center
                vec2 texCoord = vec2(
                    (cell.x - minQ + 0.5) / uGridCols,
                    (cell.y - minR + 0.5) / uGridRows
                );

                vec4 cellColor = texture2D(uGridTexture, texCoord);

                gl_FragColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
            }`;
        }
    }

    drawGridShape(ctx) {
        const size = this.cellSize;
        const w = this.gridCols * size;
        const h = this.gridRows * size;

        const xOffset = (this.gridCols % 2 !== 0) ? size / 2 : 0;
        const yOffset = (this.gridRows % 2 !== 0) ? size / 2 : 0;

        ctx.fillRect(
            -w / 2 + xOffset,
            -h / 2 + yOffset,
            w,
            h
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
            worldX,
            worldY,
            cellSize,
            cellSize
        );
    }

}

export { SquareGrid };