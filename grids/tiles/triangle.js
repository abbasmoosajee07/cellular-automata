import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema, gridSize) {
        super(colorSchema, "triangle", gridSize);
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

    cellToWorld(q, r, s) {
        const size = this.cellSize;
        let worldX = q * size;
        let worldY = -r * size;

        // Triangle-local offset (centers)
        if (s === 0) {
            // lower-left triangle
            worldX += size * 1 / 3;
            worldY -= size * 2 / 2;
        } else {
            // upper-right triangle
            worldX += size * 2 / 3;
            worldY += size * 1 / 3;
        }
        return { x: worldX, y: worldY };
    }

    getGridCorners(minQ, maxQ, minR, maxR, minS, maxS) {
        const gridCorners = [
            { q: maxQ + 1, r: maxR + 1, s: 0 },
            { q: minQ - 1, r: maxR + 1, s: 0 },
            { q: minQ - 1, r: minR - 1, s: 1 },
            { q: maxQ + 1, r: minR - 1, s: 1 },
        ];
        return gridCorners;
    }

    cubeToTextureCoords(q, r, s) {
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);

        const texX = q - minQ;
        const texY = (this.gridRows - 1 - (r - minR)) + s * this.gridRows;

        return [texX, texY];
    }

    chunked_WebGL2 () {
        return `#version 300 es
            precision highp float;
            precision highp usampler2D;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uBaseCellSize;

            // Chunk parameters (CELL SPACE)
            uniform ivec2 uChunkOrigin; // (q, r)
            uniform int   uChunkSize;   // width/height in square cells

            // INTEGER state texture (R8UI)
            uniform usampler2D uGridTexture;

            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;
            uniform vec4 uPalette[256];

            in vec2 vTexCoord;
            out vec4 outColor;

            vec4 colorFromState(uint state) {
                return (state < 256u) ? uPalette[int(state)] : uPalette[0];
            }

            void main() {

                // Screen → World
                vec2 worldPos =
                    (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                float size = uBaseCellSize;

                // World → square cell
                float fq = floor(worldPos.x / size);
                float fr = floor(-worldPos.y / size);

                int q = int(fq);
                int r = int(fr);

                // Global → chunk-local cell
                ivec2 local = ivec2(q, r) - uChunkOrigin;

                // Outside chunk → transparent
                if (local.x < 0 || local.y < 0 ||
                    local.x >= uChunkSize || local.y >= uChunkSize) {
                    discard;
                }

                // Local position inside square cell
                float localX = (worldPos.x / size) - fq;
                float localY = (-worldPos.y / size) - fr;

                // Triangle selector
                int s = (localY < localX) ? 1 : 0;

                // Chunk texture addressing
                // 2 triangles per square cell, stacked vertically
                ivec2 texel = ivec2(
                    local.x,
                    local.y + s * uChunkSize
                );

                // Fetch integer state
                uint state = texelFetch(uGridTexture, texel, 0).r;

                // Output color
                outColor = (state == 0u)
                    ? uGridColor
                    : colorFromState(state);
            }`;
    }

    direct_WebGL2 () {
        return `#version 300 es
            precision highp float;
            precision highp usampler2D;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uGridCols;
            uniform float uGridRows;
            uniform float uBaseCellSize;

            // INTEGER state texture (R8UI)
            uniform usampler2D uGridTexture;

            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;

            // Optional palette (recommended)
            uniform vec4 uPalette[256];

            in vec2 vTexCoord;
            out vec4 outColor;

            vec4 colorFromState(uint state) {
                return uPalette[int(state)];
            }

            void main() {

                // Screen → World
                vec2 worldPos =
                    (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                float size = uBaseCellSize;

                // World → triangle cell
                float q = floor(worldPos.x / size);
                float r = floor(-worldPos.y / size);

                float localX = (worldPos.x / size) + (-q);
                float localY = (-worldPos.y / size) + (-r);

                int s = (localY < localX) ? 1 : 0;

                // Grid bounds
                int minQ = -int(floor(uGridCols * 0.5));
                int maxQ =  int(ceil (uGridCols * 0.5)) - 1;

                int minR = -int(floor(uGridRows * 0.5));
                int maxR =  int(ceil (uGridRows * 0.5)) - 1;

                if (int(q) < minQ || int(q) > maxQ ||
                    int(r) < minR || int(r) > maxR) {
                    outColor = uCanvasColor;
                    return;
                }

                // cubeToTextureCoords (triangle)
                int texX = int(q) - minQ;
                int texY = (int(uGridRows) - 1 - (int(r) - minR))
                        + s * int(uGridRows);

                // Fetch integer state (NO FILTERING)
                uint state = texelFetch(
                    uGridTexture,
                    ivec2(texX, texY),
                    0
                ).r;

                // State → Color
                outColor = (state == 0u) ? uGridColor : colorFromState(state);
            }`;
    }

    direct_WebGL1 () {
        return `precision mediump float;
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
            }`
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

}

export { TriangleGrid };
