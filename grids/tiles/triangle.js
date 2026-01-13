import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.cellSize = 60;
        this.height = this.cellSize * Math.sqrt(3) / 2;
        this.rowMult = 2;
        this.colMult = 1;
    }

    worldToCell(world) {
        const size = this.cellSize;

        const q = Math.floor(world.x / size);
        const r = Math.floor(-world.y / size);

        const localX = (world.x / size) - q;
        const localY = (-world.y / size) - r;

        const s = localY < localX ? 1 : 0;

        return [q, r, s];
    }

    cubeToTextureCoords(q, r, s) {
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);

        const texX = q - minQ;
        const texY = (this.gridRows - 1 - (r - minR)) + s * this.gridRows;

        return [texX, texY];
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

                    // ---- screen → world (already correct) ----
                    vec2 worldPos =
                        (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    float size = uBaseCellSize;

                    // ---- world → cell (EXACT MATCH to JS) ----
                    float q = floor(worldPos.x / size);
                    float r = floor(-worldPos.y / size);

                    float localX = (worldPos.x / size) - q;
                    float localY = (-worldPos.y / size) - r;

                    float s = (localY < localX) ? 1.0 : 0.0;

                    // ---- bounds (same as JS) ----
                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  ceil(uGridRows * 0.5) - 1.0;

                    if (q < minQ || q > maxQ || r < minR || r > maxR) {
                        outColor = uCanvasColor;
                        return;
                    }

                    // ---- cubeToTextureCoords (EXACT MATCH) ----
                    float texX = q - minQ;
                    float texY = (uGridRows - 1.0 - (r - minR)) + s * uGridRows;

                    // ---- texel → UV (CRITICAL FIX) ----
                    vec2 uv = vec2(
                        (texX + 0.5) / uGridCols,
                        (texY + 0.5) / (uGridRows * 2.0)
                    );

                    vec4 cellColor = texture(uGridTexture, uv);

                    outColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
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
                uniform vec4 uGridColor;

                varying vec2 vTexCoord;

                void main() {

                    vec2 worldPos =
                        (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    float size = uBaseCellSize;

                    float q = floor(worldPos.x / size);
                    float r = floor(-worldPos.y / size);

                    float localX = (worldPos.x / size) - q;
                    float localY = (-worldPos.y / size) - r;

                    float s = (localY < localX) ? 1.0 : 0.0;

                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  ceil(uGridRows * 0.5) - 1.0;

                    if (q < minQ || q > maxQ || r < minR || r > maxR) {
                        gl_FragColor = uCanvasColor;
                        return;
                    }

                    float texX = q - minQ;
                    float texY = (uGridRows - 1.0 - (r - minR)) + s * uGridRows;

                    vec2 uv = vec2(
                        (texX + 0.5) / uGridCols,
                        (texY + 0.5) / (uGridRows * 2.0)
                    );

                    vec4 cellColor = texture2D(uGridTexture, uv);

                    gl_FragColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
                }
            `;
        }
    }

    drawGridShape(ctx) {
        const size = this.cellSize;
        const w = this.gridCols * size;
        const h = this.gridRows * size;

        const xOffset = (this.gridCols % 2 !== 0) ? size / 2 : 0;
        const yOffset = (this.gridRows % 2 !== 0) ? size / 2 : size;

        ctx.fillRect(
            -w / 2 + xOffset,
            -h / 2 - yOffset,
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

        ctx.beginPath();

        if (s === 0) {
            // lower-left triangle
            ctx.moveTo(worldX, worldY);
            ctx.lineTo(worldX + cellSize, worldY);
            ctx.lineTo(worldX, worldY - cellSize);
        } else {
            // upper-right triangle
            ctx.moveTo(worldX + cellSize, worldY);
            ctx.lineTo(worldX + cellSize, worldY - cellSize);
            ctx.lineTo(worldX, worldY - cellSize);
        }

        ctx.closePath();
        ctx.fill();
    }

    screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS) {
        let minX, maxX, minY, maxY;

        // Simple linear mapping
        const size = this.cellSize;
        const evenRows = (this.gridRows % 2 === 0);
        const evenCols = (this.gridCols % 2 === 0);

        minX = (minQ + (evenCols ? -1 : -1)) * size;
        maxX = (maxQ + (evenCols ? 2 : 2)) * size;

        minY = (minR + (evenRows ? -1 : -2)) * size;
        maxY = (maxR + (evenRows ? 2 : 1)) * size;

        return [minX, maxX, minY, maxY];

    }
}

export { TriangleGrid };
