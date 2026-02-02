import { BaseGrid } from '../base.js';

class HexagonGrid extends BaseGrid {
    constructor(colorSchema, gridSize) {
        super(colorSchema, "hexagon", gridSize);
        this.radius = 30;
        this.rowMult = 1;
        this.colMult = 1;
    }

    worldToCell(worldPos) {
        const q = (Math.sqrt(3) / 3 * worldPos.x - 1 / 3 * -worldPos.y) / this.radius;
        const r = (2 / 3 * -worldPos.y) / this.radius;
        const s = -q - r;

        let rx = Math.round(q);
        let ry = Math.round(r);
        let rz = Math.round(s);

        const dx = Math.abs(rx - q);
        const dy = Math.abs(ry - r);
        const dz = Math.abs(rz - s);

        if (dx > dy && dx > dz) {
            rx = -ry - rz;
        } else if (dy > dz) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        // Return all three cube coordinates
        return [rx, ry, 0];
    }

    cellToWorld(q, r, s) {
        const x = this.radius * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = this.radius * (-3 / 2 * r);
        return { x, y };
    }

    getGridCorners(minQ, maxQ, minR, maxR, minS, maxS) {
        const gridCorners = [
            { q: minQ - 2, r: minR - 1, s: 0 },
            { q: maxQ + 1, r: minR - 1, s: 0 },
            { q: maxQ + 1, r: maxR + 2, s: 0 },
            { q: minQ - 2, r: maxR + 2, s: 0 },
        ];
        return gridCorners;
    }

    cubeToTextureCoords(q, r, s) {
        // Verify cube coordinates sum to zero
        if (Math.abs(q + r + s) > 0.001) {
            // console.warn(`Invalid cube coordinates: (${q}, ${r}, ${s}) sum to ${q + r + s}`);
            // Auto-correct by calculating s from q and r
            s = -q - r;
        }

        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);

        // Use q and r for texture coordinates (s is redundant since s = -q - r)
        const texX = q + centerCol;
        const texY = r + centerRow;

        return [Math.floor(texX), Math.floor(texY)];
    }

    chunked_WebGL2 () {
        return `#version 300 es
            precision highp float;
            precision highp usampler2D;

            in vec2 vTexCoord;
            out vec4 outColor;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uRadius;

            // Chunk parameters (HEX SPACE)
            uniform ivec2 uChunkOrigin; // (q, r)
            uniform int   uChunkSize;   // hex width/height

            // INTEGER grid texture
            uniform usampler2D uGridTexture;

            uniform vec4 uCanvasColor;   // background
            uniform vec4 uGridColor;     // empty cell color
            uniform vec4 uPalette[256];  // state → color

            // --- Hex math -------------------------------------------------------

            vec3 worldToCube(vec2 worldPos, float size) {
                float q = (sqrt(3.0)/3.0 * worldPos.x - -worldPos.y / 3.0) / size;
                float r = (2.0/3.0 * -worldPos.y) / size;
                return vec3(q, r, -q - r);
            }

            vec3 cubeRound(vec3 cube) {
                vec3 r = round(cube);
                vec3 d = abs(r - cube);

                if (d.x > d.y && d.x > d.z)
                    r.x = -r.y - r.z;
                else if (d.y > d.z)
                    r.y = -r.x - r.z;
                else
                    r.z = -r.x - r.y;

                return r;
            }

            vec2 cubeToWorld(vec3 cube, float size) {
                float x = size * (sqrt(3.0) * cube.x + sqrt(3.0)/2.0 * cube.y);
                float y = size * (3.0/2.0 * cube.y);
                return vec2(x, y);
            }

            bool pointInHex(vec2 local, float size) {
                vec2 p = vec2(
                    local.x / (sqrt(3.0) * size),
                    local.y / (1.5 * size)
                );

                vec2 axial = vec2(p.x - p.y * 0.5, p.y);
                vec2 r = round(axial);
                vec2 d = abs(axial - r);

                return max(d.x, d.y) <= 0.5;
            }

            vec4 colorFromState(uint state) {
                return (state < 256u) ? uPalette[int(state)] : uPalette[0];
            }

            void main() {

                // Screen → World
                vec2 worldPos =
                    (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                // World → Hex
                vec3 cube = worldToCube(worldPos, uRadius);
                vec3 hex  = cubeRound(cube);

                int q = int(hex.x);
                int r = int(hex.y);

                // Global → chunk-local hex
                ivec2 local = ivec2(q, r) - uChunkOrigin;

                // Outside this chunk → transparent
                if (local.x < 0 || local.y < 0 ||
                    local.x >= uChunkSize || local.y >= uChunkSize) {
                    discard;
                }

                // Hex center & local position
                vec2 center = cubeToWorld(hex, uRadius);
                vec2 localPos = worldPos - center;

                // Outside hex shape
                if (!pointInHex(localPos, uRadius)) {
                    outColor = uCanvasColor;
                    return;
                }

                // Chunk texture coordinates
                ivec2 texel = ivec2(local.x, local.y);

                // Fetch state
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

            in vec2 vTexCoord;
            out vec4 outColor;

            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uGridCols;
            uniform float uGridRows;
            uniform float uRadius;

            // INTEGER grid texture
            uniform usampler2D uGridTexture;

            uniform vec4 uCanvasColor;   // background
            uniform vec4 uGridColor;     // empty cell color
            uniform vec4 uPalette[256];  // state → color

            // World → Cube
            vec3 worldToCube(vec2 worldPos, float size) {
                float q = (sqrt(3.0)/3.0 * worldPos.x - -worldPos.y / 3.0) / size;
                float r = (2.0/3.0 * -worldPos.y) / size;
                return vec3(q, r, -q - r);
            }

            // Cube rounding
            vec3 cubeRound(vec3 cube) {
                vec3 r = round(cube);

                vec3 d = abs(r - cube);

                if (d.x > d.y && d.x > d.z)
                    r.x = -r.y - r.z;
                else if (d.y > d.z)
                    r.y = -r.x - r.z;
                else
                    r.z = -r.x - r.y;

                return r;
            }

            // Cube → World center
            vec2 cubeToWorld(vec3 cube, float size) {
                float x = size * (sqrt(3.0) * cube.x + sqrt(3.0)/2.0 * cube.y);
                float y = size * (3.0/2.0 * cube.y);
                return vec2(x, y);
            }

            // Inside-hex test
            bool pointInHex(vec2 local, float size) {
                vec2 p = vec2(
                    local.x / (sqrt(3.0) * size),
                    local.y / (1.5 * size)
                );

                vec2 axial = vec2(p.x - p.y * 0.5, p.y);
                vec2 r = round(axial);
                vec2 d = abs(axial - r);

                return max(d.x, d.y) <= 0.5;
            }

            // State → Color
            vec4 colorFromState(uint state) {
                return uPalette[int(state)];
            }

            void main() {

                // Screen → World
                vec2 worldPos =
                    (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                // World → Hex cell
                vec3 cube = worldToCube(worldPos, uRadius);
                vec3 hex  = cubeRound(cube);

                vec2 center = cubeToWorld(hex, uRadius);
                vec2 local  = worldPos - center;

                // Outside any hex
                if (!pointInHex(local, uRadius)) {
                    outColor = uCanvasColor;
                    return;
                }

                // Grid bounds
                int minQ = -int(floor(uGridCols * 0.5));
                int maxQ =  int(ceil (uGridCols * 0.5)) - 1;
                int minR = -int(floor(uGridRows * 0.5));
                int maxR =  int(ceil (uGridRows * 0.5)) - 1;

                int q = int(hex.x);
                int r = int(hex.y);

                if (q < minQ || q > maxQ || r < minR || r > maxR) {
                    outColor = uCanvasColor;
                    return;
                }

                // Cube → texture coords
                ivec2 texel = ivec2(
                    q - minQ,
                    r - minR
                );

                // Fetch integer state
                uint state = texelFetch(uGridTexture, texel, 0).r;

                // Output color
                outColor = (state == 0u)
                    ? uGridColor
                    : colorFromState(state);
            }`
    }

    direct_WebGL1 () {
        return `precision mediump float;
            uniform vec2  uResolution;
            uniform vec2  uOffset;
            uniform float uScale;
            uniform float uGridCols;
            uniform float uGridRows;
            uniform float uRadius;

            uniform sampler2D uGridTexture;
            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;

            varying vec2 vTexCoord;

            vec3 worldToCube(vec2 worldPos, float size) {
                float q = (sqrt(3.0)/3.0 * worldPos.x - -worldPos.y/3.0) / size;
                float r = (2.0/3.0 * -worldPos.y) / size;
                return vec3(q, r, -q - r);
            }

            vec3 cubeRound(vec3 cube) {
                float rx = floor(cube.x + 0.5);
                float ry = floor(cube.y + 0.5);
                float rz = floor(cube.z + 0.5);

                float dx = abs(rx - cube.x);
                float dy = abs(ry - cube.y);
                float dz = abs(rz - cube.z);

                if (dx > dy && dx > dz)
                    rx = -ry - rz;
                else if (dy > dz)
                    ry = -rx - rz;
                else
                    rz = -rx - ry;

                return vec3(rx, ry, rz);
            }

            vec2 cubeToWorld(vec3 cube, float size) {
                float q = cube.x;
                float r = cube.y;
                float x = size * (sqrt(3.0)*q + sqrt(3.0)/2.0*r);
                float y = size * (3.0/2.0*r);
                return vec2(x, y);
            }

            bool pointInHex(vec2 local, float size) {
                vec2 p = vec2(
                    local.x / (sqrt(3.0)*size),
                    local.y / (1.5*size)
                );

                vec2 axial = vec2(p.x - p.y * 0.5, p.y);
                vec2 r = floor(axial + 0.5);
                vec2 d = abs(axial - r);

                return max(d.x, d.y) <= 0.5;
            }

            void main() {

                vec2 worldPos =
                    (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                vec3 cube = worldToCube(worldPos, uRadius);
                vec3 hex  = cubeRound(cube);

                vec2 center = cubeToWorld(hex, uRadius);
                vec2 local  = worldPos - center;

                if (!pointInHex(local, uRadius)) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                float minQ = -floor(uGridCols * 0.5);
                float maxQ =  ceil(uGridCols * 0.5) - 1.0;
                float minR = -floor(uGridRows * 0.5);
                float maxR =  ceil(uGridRows * 0.5) - 1.0;

                if (hex.x < minQ || hex.x > maxQ ||
                    hex.y < minR || hex.y > maxR) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                vec2 texCoord = vec2(
                    (hex.x - minQ + 0.5) / uGridCols,
                    (hex.y - minR + 0.5) / uGridRows
                );

                vec4 cellColor = texture2D(uGridTexture, texCoord);

                gl_FragColor = (cellColor.a <= 0.0) ? uGridColor : cellColor;
            }`
    }

    drawGridShape(ctx) {
        const radius = this.radius;

        const halfCols = this.gridCols * 0.5;
        const halfRows = this.gridRows * 0.5;

        // Even/odd centering correction
        const xOffset = (this.gridCols % 2 !== 0)
            ? (Math.sqrt(3) * radius) / 2
            : 0;

        const yOffset = (this.gridRows % 2 !== 0)
            ? (1.5 * radius) / 2
            : 0;

        // Compute axial grid corners
        const corners = [
            { q: -halfCols - 1, r: -halfRows - 1 },
            { q:  halfCols,     r: -halfRows - 1 },
            { q:  halfCols,     r:  halfRows     },
            { q: -halfCols - 1, r:  halfRows     }
        ];

        const pts = corners.map(c => {
            const x = radius * Math.sqrt(3) * (c.q + c.r * 0.5) + xOffset;
            const y = radius * 1.5 * c.r + yOffset;
            return { x, y };
        });

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
        ctx.fill();
    }

    drawShapeCell(ctx, q, r, s, state) {
        const radius = this.radius || 30;

        // Calculate hexagon center using cube coordinates
        const centerX = radius * Math.sqrt(3) * (q + r * 0.5);
        const centerY = radius * 1.5 * r;

        const drawColor = this.colorSchema[state] || [1, 1, 1, 1];
        ctx.fillStyle = `rgba(
            ${Math.round(drawColor[0] * 255)},
            ${Math.round(drawColor[1] * 255)},
            ${Math.round(drawColor[2] * 255)},
            ${drawColor[3]}
        )`;
        this.drawHexagon(ctx, centerX, centerY, radius);

    }

    drawHexagon(ctx, centerX, centerY, radius) {
        ctx.beginPath();
        // Draw flat-topped hexagon
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6; // -30° offset for flat-topped
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

}

export { HexagonGrid };