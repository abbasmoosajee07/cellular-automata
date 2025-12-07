import { BaseGrid } from '../base.js';

class HexagonGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "hexagon");
        this.radius = 30;
        this.rowMult = 1;
        this.colMult = 1;
    }

    worldToCell(worldPos) {
        const q = (Math.sqrt(3) / 3 * worldPos.x - 1 / 3 * worldPos.y) / this.radius;
        const r = (2 / 3 * worldPos.y) / this.radius;
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

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const radius = this.radius;
        const hexWidth = radius * Math.sqrt(3);
        const hexHeight = radius * 1.5;

        const minCol = Math.floor(minX / hexWidth) - 2;
        const maxCol = Math.ceil(maxX / hexWidth) + 2;
        const minRow = Math.floor(minY / hexHeight) - 2;
        const maxRow = Math.ceil(maxY / hexHeight) + 2;

        return [minCol, maxCol, minRow, maxRow];
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

    getFragmentShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision mediump float;

                in vec2 vTexCoord;
                out vec4 outColor;

                uniform vec2  uResolution;
                uniform vec2  uOffset;
                uniform float uScale;
                uniform float uGridCols;
                uniform float uGridRows;
                uniform float uRadius;

                uniform sampler2D uGridTexture;
                uniform vec4 uCanvasColor;   // background outside any hex
                uniform vec4 uGridColor;     // color for empty cells

                // Convert world → cube coordinates
                vec3 worldToCube(vec2 worldPos, float size) {
                    float q = (sqrt(3.0)/3.0 * worldPos.x - worldPos.y / 3.0) / size;
                    float r = (2.0/3.0 * worldPos.y) / size;
                    return vec3(q, r, -q - r);
                }

                // Round cube coordinates
                vec3 cubeRound(vec3 cube) {
                    float x = cube.x;
                    float y = cube.y;
                    float z = cube.z;

                    float rx = round(x);
                    float ry = round(y);
                    float rz = round(z);

                    float dx = abs(rx - x);
                    float dy = abs(ry - y);
                    float dz = abs(rz - z);

                    if (dx > dy && dx > dz)
                        rx = -ry - rz;
                    else if (dy > dz)
                        ry = -rx - rz;
                    else
                        rz = -rx - ry;

                    return vec3(rx, ry, rz);
                }

                // Cube → world space center
                vec2 cubeToWorld(vec3 cube, float size) {
                    float q = cube.x;
                    float r = cube.y;
                    float x = size * (sqrt(3.0)*q + sqrt(3.0)/2.0 * r);
                    float y = size * (3.0/2.0 * r);
                    return vec2(x, y);
                }

                // Inside-hex test
                bool pointInHex(vec2 local, float size) {
                    vec2 p = vec2(
                        local.x / (sqrt(3.0)*size),
                        local.y / (1.5*size)
                    );

                    vec2 axial = vec2(p.x - p.y*0.5, p.y);
                    vec2 r = round(axial);
                    vec2 d = abs(axial - r);

                    return max(d.x, d.y) <= 0.5;
                }

                void main() {

                    // screen → world
                    vec2 worldPos = (vTexCoord * uResolution - uResolution*0.5 - uOffset) / uScale;

                    // world → cube
                    vec3 cube = worldToCube(worldPos, uRadius);
                    vec3 hex = cubeRound(cube);

                    // cube → world center
                    vec2 center = cubeToWorld(hex, uRadius);
                    vec2 local = worldPos - center;

                    // not inside any hex → canvas background
                    if (!pointInHex(local, uRadius)) {
                        outColor = uCanvasColor;
                        return;
                    }

                    // grid bounds
                    float minQ = -uGridCols * 0.5;
                    float maxQ =  uGridCols * 0.5 - 1.0;
                    float minR = -uGridRows * 0.5;
                    float maxR =  uGridRows * 0.5 - 1.0;

                    // out of grid → canvas color
                    if (hex.x < minQ || hex.x > maxQ ||
                        hex.y < minR || hex.y > maxR) {

                        outColor = uCanvasColor;
                        return;
                    }

                    // cube q,r → texture coords
                    vec2 texCoord = vec2(
                        (hex.x - minQ) / uGridCols,
                        (hex.y - minR) / uGridRows
                    );

                    vec4 cellColor = texture(uGridTexture, texCoord);

                    // empty texel → gridColor
                    if (cellColor.a <= 0.0)
                        outColor = uGridColor;
                    else
                        outColor = cellColor;
                }
                `;
        } else {
            return `
                preciprecision mediump float;
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
                    float q = (sqrt(3.0)/3.0 * worldPos.x - worldPos.y/3.0) / size;
                    float r = (2.0/3.0 * worldPos.y) / size;
                    return vec3(q, r, -q - r);
                }

                vec3 cubeRound(vec3 cube) {
                    float rx = round(cube.x);
                    float ry = round(cube.y);
                    float rz = round(cube.z);

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
                    vec2 p = vec2(local.x/(sqrt(3.0)*size), local.y/(1.5*size));
                    vec2 axial = vec2(p.x - p.y*0.5, p.y);
                    vec2 r = round(axial);
                    vec2 d = abs(axial - r);
                    return max(d.x, d.y) <= 0.5;
                }

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution*0.5 - uOffset) / uScale;

                    vec3 cube = worldToCube(worldPos, uRadius);
                    vec3 hex = cubeRound(cube);

                    vec2 center = cubeToWorld(hex, uRadius);
                    vec2 local = worldPos - center;

                    if (!pointInHex(local, uRadius)) {
                        gl_FragColor = uCanvasColor;
                        return;
                    }

                    float minQ = -uGridCols * 0.5;
                    float maxQ =  uGridCols * 0.5 - 1.0;
                    float minR = -uGridRows * 0.5;
                    float maxR =  uGridRows * 0.5 - 1.0;

                    if (hex.x < minQ || hex.x > maxQ ||
                        hex.y < minR || hex.y > maxR) {

                        gl_FragColor = uCanvasColor;
                        return;
                    }

                    vec2 texCoord = vec2(
                        (hex.x - minQ) / uGridCols,
                        (hex.y - minR) / uGridRows
                    );

                    vec4 cellColor = texture2D(uGridTexture, texCoord);

                    if (cellColor.a <= 0.0)
                        gl_FragColor = uGridColor;
                    else
                        gl_FragColor = cellColor;
                }
                `;
        }
    }

    drawGridShape(ctx) {
        const radius = this.radius;

        const halfCols = (this.gridCols * 0.5) ;
        const halfRows = (this.gridRows * 0.5);

        // Compute axial grid corners in (q, r)
        const corners = [
            { q: -halfCols - 1, r: -halfRows - 1 },
            { q:  halfCols, r: -halfRows - 1},
            { q:  halfCols, r:  halfRows },
            { q: -halfCols - 1, r:  halfRows }
        ];

        // Convert each corner to world coords
        const pts = corners.map(c => {
            const x = radius * Math.sqrt(3) * (c.q + c.r * 0.5);
            const y = radius * -1.5 * c.r;
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
        const centerY = radius * -1.5 * r;

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

    screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS) {
        let minX, maxX, minY, maxY;

        const radius = this.radius;
        // World-space corners in axial coords
        const corners = [
            { q: minQ, r: minR },
            { q: maxQ, r: minR},
            { q: maxQ, r: maxR },
            { q: minQ , r: maxR }
        ];

        // Convert axial → world
        const pts = corners.map(({ q, r }) => ({
            x: radius * Math.sqrt(3) * (q + r * 0.5),
            y: radius * -1.5 * r
        }));

        // Bounding box
        minX = Math.min(...pts.map(p => p.x));
        maxX = Math.max(...pts.map(p => p.x));
        minY = Math.min(...pts.map(p => p.y)) * 1.2;
        maxY = Math.max(...pts.map(p => p.y)) ;

        return [minX, maxX, minY, maxY];
    }

}

export { HexagonGrid };