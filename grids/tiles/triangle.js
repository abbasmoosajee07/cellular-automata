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
        return `${this.glsl_webgl2_header()}

            // Chunk-specific uniforms
            uniform ivec2 uChunkOrigin; // chunk origin in cell space
            uniform int   uChunkSize;   // chunk width/height

            ${this.glsl_screenToWorld()}
            ${this.glsl_colorFromState()}

            void main() {
                vec2  worldPos = screenToWorld(vTexCoord);
                float size = uBaseCellSize;

                // World → square cell
                float fq = floor(worldPos.x / size);
                float fr = floor(-worldPos.y / size);

                int q = int(fq);
                int r = int(fr);

                // Global → chunk-local cell
                ivec2 local = ivec2(q, r) - uChunkOrigin;

                // Outside chunk → transparent
                if (local.x < 0 || local.x >= uChunkSize ||
                    local.y < 0 || local.y >= uChunkSize) {
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

                // Fetch integer state to get Color
                uint state = texelFetch(uGridTexture, ivec2(texX, texY), 0).r;
                outColor = colorFromState(state);
            }`;
    }

    direct_WebGL2 () {
        return `${this.glsl_webgl2_header()}

            // Grid-dimension uniforms
            uniform float uGridCols;
            uniform float uGridRows;

            ${this.glsl_screenToWorld()}
            ${this.glsl_colorFromState()}

            void main() {
                vec2  worldPos = screenToWorld(vTexCoord);
                float size = uBaseCellSize;

                // World → triangle cell
                float q = floor(worldPos.x / size);
                float r = floor(-worldPos.y / size);

                float localX = (worldPos.x / size) + (-q);
                float localY = (-worldPos.y / size) + (-r);

                int s = (localY < localX) ? 1 : 0;

                // Grid bounds
                ${this.glsl_gridbounds_WebGL2()};

                if (int(q) < minQ || int(q) > maxQ ||
                    int(r) < minR || int(r) > maxR) {
                    outColor = uCanvasColor;
                    return;
                }

                // cubeToTextureCoords (triangle)
                int texX = int(q) - minQ;
                int texY = (int(uGridRows) - 1 - (int(r) - minR))
                        + s * int(uGridRows);

                // Fetch integer state to get Color
                uint state = texelFetch(uGridTexture, ivec2(texX, texY), 0).r;
                outColor = colorFromState(state);
        }`;
    }

    chunked_WebGL1() {
        return `${this.glsl_webgl1_header()}

            uniform vec2  uChunkOrigin;
            uniform float uChunkSize;

            ${this.glsl_screenToWorld()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                float size = uBaseCellSize;

                // World → square cell (mirrors WebGL2: floor, not round)
                float fq = floor( worldPos.x / size);
                float fr = floor(-worldPos.y / size);

                // Chunk-local cell coords
                float localQ = fq - uChunkOrigin.x;
                float localR = fr - uChunkOrigin.y;

                // Outside this chunk → transparent
                if (localQ < 0.0 || localQ >= uChunkSize ||
                    localR < 0.0 || localR >= uChunkSize) {
                    discard;
                }

                // Sub-cell position → triangle selector
                float localX = ( worldPos.x / size) - fq;
                float localY = (-worldPos.y / size) - fr;
                float s = (localY < localX) ? 1.0 : 0.0;

                // Chunk texture UV — matches WebGL2: texel.y = local.y + s * chunkSize
                float texX = localQ;
                float texY = localR + s * uChunkSize;

                vec2 uv = vec2(
                    (texX + 0.5) / uChunkSize,
                    (texY + 0.5) / (uChunkSize * 2.0)
                );

                vec4 cellColor = texture2D(uGridTexture, uv);
                gl_FragColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
            }`;
    }

    direct_WebGL1 () {
        return `${this.glsl_webgl1_header()}

            uniform float uGridCols;
            uniform float uGridRows;

            ${this.glsl_screenToWorld()}

            void main() {

                vec2 worldPos = screenToWorld(vTexCoord);
                float size = uBaseCellSize;

                float q = floor(worldPos.x / size);
                float r = floor(-worldPos.y / size);

                float localX = (worldPos.x / size) - q;
                float localY = (-worldPos.y / size) - r;
                float s = (localY < localX) ? 1.0 : 0.0;

                ${this.glsl_gridbounds_WebGL1()}

                if (q < minQ || q > maxQ || r < minR || r > maxR) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                float texX = q - minQ;
                float texY = (uGridRows - 1.0 - (r - minR)) + s * uGridRows;

                vec2 texCoord = vec2(
                    (texX + 0.5) / uGridCols,
                    (texY + 0.5) / (uGridRows * 2.0)
                );

                vec4 cellColor = texture2D(uGridTexture, texCoord);
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
