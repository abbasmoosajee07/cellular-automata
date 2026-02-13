import { BaseGrid } from '../base.js';

class SquareGrid extends BaseGrid {
    constructor(colorSchema, gridSize) {
        super(colorSchema, "square", gridSize);
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

    glsl_worldToCell_WebGL2() {
        return `
            ivec2 worldToCell(vec2 worldPos) {
                return ivec2(
                    round(worldPos.x / uBaseCellSize),
                    round(-worldPos.y / uBaseCellSize)
                );
            }`;
    }

    glsl_worldToCell_WebGL1() {
        return `
            vec2 worldToCell(vec2 worldPos) {
                return floor(vec2(
                    worldPos.x / uBaseCellSize,
                    -worldPos.y / uBaseCellSize
                ) + 0.5);
            }`;
    }

    chunked_WebGL2() {
        return `${this.glsl_webgl2_header()}

            // Chunk-specific uniforms
            uniform ivec2 uChunkOrigin;
            uniform int   uChunkSize;

            ${this.glsl_screenToWorld()}
            ${this.glsl_worldToCell_WebGL2()}
            ${this.glsl_colorFromState()}

            void main() {
                vec2  worldPos = screenToWorld(vTexCoord);
                ivec2 cell     = worldToCell(worldPos);

                // Global cell → chunk-local cell
                ivec2 local = cell - uChunkOrigin;

                // Outside this chunk → transparent
                if (local.x < 0 || local.y < 0 ||
                    local.x >= uChunkSize || local.y >= uChunkSize) {
                    discard;
                }

                uint state = texelFetch(uGridTexture, local, 0).r;
                outColor = colorFromState(state);
            }`;
    }

    direct_WebGL2() {
        return `${this.glsl_webgl2_header()}

            // Grid-dimension uniforms (not needed by chunked variant)
            uniform float uGridCols;
            uniform float uGridRows;

            ${this.glsl_screenToWorld()}
            ${this.glsl_worldToCell_WebGL2()}
            ${this.glsl_colorFromState()}

            void main() {
                vec2  worldPos = screenToWorld(vTexCoord);
                ivec2 cell     = worldToCell(worldPos);

                // Centered grid bounds
                ${this.glsl_gridbounds_WebGL2()};

                if (cell.x < minQ || cell.x > maxQ ||
                    cell.y < minR || cell.y > maxR) {
                    outColor = uCanvasColor;
                    return;
                }

                // Offset cell into texture space and fetch state
                ivec2 texel = ivec2(cell.x - minQ, cell.y - minR);
                uint  state = texelFetch(uGridTexture, texel, 0).r;
                outColor = colorFromState(state);
            }`;
    }

    chunked_WebGL1() {
        return `${this.glsl_webgl1_header()}

            // Chunk-specific uniforms
            uniform vec2  uChunkOrigin;
            uniform float uChunkSize;

            ${this.glsl_screenToWorld()}
            ${this.glsl_worldToCell_WebGL1()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                vec2 cell     = worldToCell(worldPos);

                // Global cell → chunk-local cell
                vec2 local = cell - uChunkOrigin;

                // Outside this chunk → transparent
                if (local.x < 0.0 || local.x >= uChunkSize ||
                    local.y < 0.0 || local.y >= uChunkSize) {
                    discard;
                }

                // Normalised UV within the chunk texture
                vec2 texCoord = (local + 0.5) / uChunkSize;

                vec4 cellColor = texture2D(uGridTexture, texCoord);
                gl_FragColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
            }`;
    }

    direct_WebGL1() {
        return `${this.glsl_webgl1_header()}

            uniform float uGridCols;
            uniform float uGridRows;

            ${this.glsl_screenToWorld()}
            ${this.glsl_worldToCell_WebGL1()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                vec2 cell     = worldToCell(worldPos);

                // Centered grid bounds
                ${this.glsl_gridbounds_WebGL1()}

                if (cell.x < minQ || cell.x > maxQ ||
                    cell.y < minR || cell.y > maxR) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                // Normalised UV for RGBA texture lookup
                vec2 texCoord = vec2(
                    (cell.x - minQ + 0.5) / uGridCols,
                    (cell.y - minR + 0.5) / uGridRows
                );

                vec4 cellColor = texture2D(uGridTexture, texCoord);
                gl_FragColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
            }`;
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