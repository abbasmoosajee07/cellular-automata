import { BaseGrid } from '../base.js';

class RhomboidalGrid extends BaseGrid {
    constructor(colorSchema, gridSize) {
        super(colorSchema, "rhombus", gridSize);
        this.radius = 60;
        this.rowMult = 1;
        this.colMult = 3;
    }

    worldToCell(worldPos) {
        const q = (Math.sqrt(3) / 3 * worldPos.x - 1 / 3 * -worldPos.y) / this.radius;
        const s = (2 / 3 * -worldPos.y) / this.radius;

        const x = q;
        const z = s;
        const y = -x - z;

        let rx = Math.floor(x + 0.5);
        let ry = Math.floor(y + 0.5);
        let rz = Math.floor(z + 0.5);

        const dx = Math.abs(rx - x);
        const dy = Math.abs(ry - y);
        const dz = Math.abs(rz - z);

        if (dx > dy && dx > dz) rx = -ry - rz;
        else if (dy > dz) ry = -rx - rz;
        else rz = -rx - ry;

        // Get local position for rhombus determination
        const hexCenterX = this.radius * Math.sqrt(3) * (rx + rz * 0.5);
        const hexCenterY = this.radius * 1.5 * rz;

        const localX = worldPos.x - hexCenterX;
        const localY = -worldPos.y - hexCenterY;

        // Use the same triangle test as in shader
        const getRhombusIndex = (localX, localY, radius) => {
            const center = { x: 0, y: 0 };

            // Calculate hex vertices
            const vertices = [];
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i - Math.PI / 6;
                vertices.push({
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle)
                });
            }

            const pointInTriangle = (p, a, b, c) => {
                const v0 = { x: c.x - a.x, y: c.y - a.y };
                const v1 = { x: b.x - a.x, y: b.y - a.y };
                const v2 = { x: p.x - a.x, y: p.y - a.y };
                const dot00 = v0.x * v0.x + v0.y * v0.y;
                const dot01 = v0.x * v1.x + v0.y * v1.y;
                const dot02 = v0.x * v2.x + v0.y * v2.y;
                const dot11 = v1.x * v1.x + v1.y * v1.y;
                const dot12 = v1.x * v2.x + v1.y * v2.y;
                const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
                const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
                const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
                return (u >= 0 && v >= 0 && u + v <= 1);
            };

            const p = { x: localX, y: localY };
            if (pointInTriangle(p, center, vertices[0], vertices[1])) return 0;
            if (pointInTriangle(p, center, vertices[1], vertices[2])) return 0;
            if (pointInTriangle(p, center, vertices[2], vertices[3])) return 1;
            if (pointInTriangle(p, center, vertices[3], vertices[4])) return 1;
            if (pointInTriangle(p, center, vertices[4], vertices[5])) return 2;
            if (pointInTriangle(p, center, vertices[5], vertices[0])) return 2;

            return 0;
        };

        const rhombusType = getRhombusIndex(localX, localY, this.radius);
        return [rx, rz, rhombusType];
    }

    cellToWorld(q, r, s) {
        const R = this.radius;

        // --- Hex center (exact inverse of cube projection) ---
        const centerX = R * Math.sqrt(3) * (q + r * 0.5);
        const centerY = R * (3 / 2) * r;

        // --- Rhombus center offset ---
        const angle = Math.PI / 6 + s * (2 * Math.PI / 3);
        const offsetRadius = R * 0.5;

        const offsetX = offsetRadius * Math.cos(angle);
        const offsetY = offsetRadius * Math.sin(angle);

        return {
            x: centerX + offsetX,
            y: - (centerY + offsetY)   // keep your Y-flip convention
        };
    }

    getGridCorners(minQ, maxQ, minR, maxR, minS, maxS) {
        const gridCorners = [
            { q: minQ - 2, r: minR - 1, s: 1 },
            { q: maxQ + 1, r: minR - 1, s: 2 },
            { q: maxQ + 1, r: maxR + 2, s: 0 },
            { q: minQ - 2, r: maxR + 2, s: 2 },
        ];
        return gridCorners;
    }

    cubeToTextureCoords(q, r, rhombusIndex) {
        // Convert centered coordinates to texture coordinates
        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);
        const minCol = -centerCol;
        const minRow = -centerRow;

        // Use different texture columns for different rhombus types
        const texX = (q - minCol) * 3 + rhombusIndex; // *3 for three rhombus types
        const texY = (r - minRow);

        return [Math.floor(texX), Math.floor(texY)];
    }

    transformChunkData(data, chunkSize) {
        const depth = 3; // Always 3 for rhomboidal (the 3 rhombi per hex)
        const srcSize = chunkSize * chunkSize * depth;
        
        // Verify input size
        if (data.length !== srcSize) {
            console.warn(`Expected ${srcSize} bytes, got ${data.length}`);
        }
        
        // Create output buffer: [chunkSize*3, chunkSize]
        const output = new Uint8Array(chunkSize * depth * chunkSize);
        
        // Transform: Rust layout [q + r*chunkSize + z*chunkSize*chunkSize]
        //         → GPU layout  [(q*3+z) + r*(chunkSize*3)]
        for (let r = 0; r < chunkSize; r++) {
            for (let q = 0; q < chunkSize; q++) {
                for (let z = 0; z < depth; z++) {
                    // Read from Rust layout
                    const srcIdx = q + r * chunkSize + z * chunkSize * chunkSize;
                    const value = data[srcIdx] || 0;
                    
                    // Write to GPU layout
                    const dstX = q * depth + z;
                    const dstY = r;
                    const dstIdx = dstX + dstY * (chunkSize * depth);
                    
                    output[dstIdx] = value;
                }
            }
        }
        
        return output;
    }

    glsl_screenToWorld_rhombus() {
        return `vec2 screenToWorld(vec2 texCoord) {
            vec2 screen = texCoord * uResolution;
            vec2 centered = screen - uResolution * 0.5 - uOffset;
            return vec2(
                centered.x / uScale, -centered.y / uScale
            );
        }`;
    }

    glsl_rhombusMath_WebGL2() {
        return `vec2 worldToHex(vec2 pos, float r) {
            float q = (sqrt(3.0)/3.0 * pos.x - 1.0/3.0 * pos.y) / r;
            float s = (2.0/3.0 * pos.y) / r;
            return vec2(q, s);
        }

        ivec3 hexRound(vec2 h) {
            float x = h.x;
            float z = h.y;
            float y = -x - z;

            float rx = round(x);
            float ry = round(y);
            float rz = round(z);

            float dx = abs(rx - x);
            float dy = abs(ry - y);
            float dz = abs(rz - z);

            if (dx > dy && dx > dz)      rx = -ry - rz;
            else if (dy > dz)           ry = -rx - rz;
            else                        rz = -rx - ry;

            return ivec3(int(rx), int(rz), int(-rx - rz));
        }

        vec2 getHexVertex(int i, float r) {
            float angle = 3.14159265359 / 3.0 * float(i) - 3.14159265359 / 6.0;
            return vec2(r * cos(angle), r * sin(angle));
        }

        bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
            vec2 v0 = c - a;
            vec2 v1 = b - a;
            vec2 v2 = p - a;

            float dot00 = dot(v0, v0);
            float dot01 = dot(v0, v1);
            float dot02 = dot(v0, v2);
            float dot11 = dot(v1, v1);
            float dot12 = dot(v1, v2);

            float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
            float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
            float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

            return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
        }

        int getRhombusIndex(vec2 localPos, float r) {
            vec2 c = vec2(0.0);

            vec2 v0 = getHexVertex(0, r);
            vec2 v1 = getHexVertex(1, r);
            vec2 v2 = getHexVertex(2, r);
            vec2 v3 = getHexVertex(3, r);
            vec2 v4 = getHexVertex(4, r);
            vec2 v5 = getHexVertex(5, r);

            if (pointInTriangle(localPos, c, v0, v1)) return 0;
            if (pointInTriangle(localPos, c, v1, v2)) return 0;
            if (pointInTriangle(localPos, c, v2, v3)) return 1;
            if (pointInTriangle(localPos, c, v3, v4)) return 1;
            if (pointInTriangle(localPos, c, v4, v5)) return 2;
            if (pointInTriangle(localPos, c, v5, v0)) return 2;

            return 0;
        }
        vec4 applyRhombusShade(vec4 c, int t) {
            if (t == 0) return c;
            if (t == 1) return vec4(c.rgb * 0.75, c.a);
            return vec4(c.rgb * 0.5, c.a);
        }`;
    }

    chunked_WebGL2 () {
        return `${this.glsl_webgl2_header()}

            // Chunk-specific uniforms
            uniform ivec2 uChunkOrigin;
            uniform int   uChunkSize;

            // --------- Import Rhombus Math ---------
            ${this.glsl_screenToWorld_rhombus()}
            ${this.glsl_rhombusMath_WebGL2()}
            ${this.glsl_colorFromState()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                vec2 axial = worldToHex(worldPos, uRadius);
                ivec3 hex  = hexRound(axial);

                int q = hex.x;
                int r = hex.y;

                // Global → chunk-local hex
                ivec2 localHex = ivec2(q, r) - uChunkOrigin;

                // Outside chunk → transparent
                if (localHex.x < 0 || localHex.y < 0 ||
                    localHex.x >= uChunkSize || localHex.y >= uChunkSize) {
                    discard;
                }

                // Hex center
                vec2 center = vec2(
                    uRadius * sqrt(3.0) * (float(q) + float(r) * 0.5),
                    uRadius * 1.5 * float(r)
                );

                vec2 localPos = worldPos - center;
                int rhombus = getRhombusIndex(localPos, uRadius);

                // Chunk texture coords (3 rhombi per hex)
                ivec2 texel = ivec2(
                    localHex.x * 3 + rhombus,
                    localHex.y
                );

                uint state = texelFetch(uGridTexture, texel, 0).r;

                if (state == 0u) {
                    outColor = uGridColor;
                } else {
                    outColor = applyRhombusShade(colorFromState(state), rhombus);
                }
            }`;
    }

    direct_WebGL2 () {
        return `${this.glsl_webgl2_header()}

            // Grid-dimension uniforms
            uniform float uGridCols;
            uniform float uGridRows;

            ${this.glsl_screenToWorld_rhombus()}
            ${this.glsl_rhombusMath_WebGL2()}
            ${this.glsl_colorFromState()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                vec2 axial = worldToHex(worldPos, uRadius);
                ivec3 hex  = hexRound(axial);

                float hx = float(hex.x);
                float hy = float(hex.y);

                vec2 center = vec2(
                    uRadius * sqrt(3.0) * (hx + hy * 0.5),
                    uRadius * 1.5 * hy
                );

                vec2 localPos = worldPos - center;
                int rhombus = getRhombusIndex(localPos, uRadius);

                // Grid bounds
                ${this.glsl_gridbounds_WebGL2()}
                int q = int(hx);
                int r = int(hy);

                if (q < minQ || q > maxQ || r < minR || r > maxR) {
                    outColor = uCanvasColor;
                    return;
                }

                // Texture addressing (3 rhombi per hex)
                ivec2 texel = ivec2((q - minQ) * 3 + rhombus, (r - minR));

                // Fetch state
                uint state = texelFetch(uGridTexture, texel, 0).r;

                if (state == 0u) {
                    outColor = uGridColor;
                } else {
                    outColor = applyRhombusShade(colorFromState(state), rhombus);
                }
            }`
    }

    glsl_rhombusMath_WebGL1() {
        return `vec2 worldToHex(vec2 pos, float r) {
            float q = (sqrt(3.0)/3.0 * pos.x - 1.0/3.0 * pos.y) / r;
            float s = (2.0/3.0 * pos.y) / r;
            return vec2(q, s);
        }

        vec3 hexRound(vec2 h) {
            float x = h.x;
            float z = h.y;
            float y = -x - z;
            float rx = floor(x + 0.5);
            float ry = floor(y + 0.5);
            float rz = floor(z + 0.5);
            float dx = abs(rx - x);
            float dy = abs(ry - y);
            float dz = abs(rz - z);
            if (dx > dy && dx > dz) rx = -ry - rz;
            else if (dy > dz) ry = -rx - rz;
            else rz = -rx - ry;
            return vec3(rx, rz, -rx - rz);
        }

        vec2 getHexVertex(float i, float r) {
            float angle = 3.14159265359 / 3.0 * i - 3.14159265359 / 6.0;
            return vec2(r * cos(angle), r * sin(angle));
        }

        bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
            vec2 v0 = c - a;
            vec2 v1 = b - a;
            vec2 v2 = p - a;
            float dot00 = dot(v0, v0);
            float dot01 = dot(v0, v1);
            float dot02 = dot(v0, v2);
            float dot11 = dot(v1, v1);
            float dot12 = dot(v1, v2);
            float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
            float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
            float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
            return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
        }

        float getRhombusIndex(vec2 localPos, float radius) {
            vec2 center = vec2(0.0);

            vec2 v0 = getHexVertex(0.0, radius);
            vec2 v1 = getHexVertex(1.0, radius);
            vec2 v2 = getHexVertex(2.0, radius);
            vec2 v3 = getHexVertex(3.0, radius);
            vec2 v4 = getHexVertex(4.0, radius);
            vec2 v5 = getHexVertex(5.0, radius);

            if (pointInTriangle(localPos, center, v0, v1)) return 0.0;
            if (pointInTriangle(localPos, center, v1, v2)) return 0.0;
            if (pointInTriangle(localPos, center, v2, v3)) return 1.0;
            if (pointInTriangle(localPos, center, v3, v4)) return 1.0;
            if (pointInTriangle(localPos, center, v4, v5)) return 2.0;
            if (pointInTriangle(localPos, center, v5, v0)) return 2.0;

            return 0.0;
        }

        // Function to apply different shades based on rhombus type
        vec4 applyRhombusShade(vec4 baseColor, float rhombusType) {
            if (rhombusType == 0.0) {
                return baseColor;
            } else if (rhombusType == 1.0) {
                return vec4(baseColor.rgb * 0.75, baseColor.a);
            } else {
                return vec4(baseColor.rgb * 0.5, baseColor.a);
            }
        }`;
    }

    chunked_WebGL1() {
        return `${this.glsl_webgl1_header()}

            uniform vec2  uChunkOrigin;
            uniform float uChunkSize;

            ${this.glsl_screenToWorld_rhombus()}
            ${this.glsl_rhombusMath_WebGL1()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                vec2 axial   = worldToHex(worldPos, uRadius);
                vec3 hexCell = hexRound(axial);

                float hx = hexCell.x;
                float hy = hexCell.y;

                // Global → chunk-local
                float localQ = hx - uChunkOrigin.x;
                float localR = hy - uChunkOrigin.y;

                // Outside this chunk → transparent
                if (localQ < 0.0 || localQ >= uChunkSize ||
                    localR < 0.0 || localR >= uChunkSize) {
                    discard;
                }

                // Hex center and local offset
                vec2 center   = vec2(
                    uRadius * sqrt(3.0) * (hx + hy * 0.5),
                    uRadius * 1.5 * hy
                );

                vec2 localPos = worldPos - center;
                float rhombusType = getRhombusIndex(localPos, uRadius);

                // Chunk-local texture UV.
                float texX = localQ * 3.0 + rhombusType;
                float texY = localR;
                vec2 texCoord = vec2(
                    (texX + 0.5) / (uChunkSize * 3.0),
                    (texY + 0.5) /  uChunkSize
                );

                vec4 cellColor = texture2D(uGridTexture, texCoord);

                if (cellColor.a <= 0.0) {
                    gl_FragColor = uGridColor;
                } else {
                    gl_FragColor = applyRhombusShade(cellColor, rhombusType);
                }
            }`;
    }

    direct_WebGL1 () {
        return `${this.glsl_webgl1_header()}

            uniform float uGridCols;
            uniform float uGridRows;

            ${this.glsl_screenToWorld_rhombus()}
            ${this.glsl_rhombusMath_WebGL1()}

            void main() {
                vec2 worldPos = screenToWorld(vTexCoord);
                vec2 axial = worldToHex(worldPos, uRadius);
                vec3 hexCell = hexRound(axial);

                // compute hex center and convert components to floats
                float hx = hexCell.x;
                float hy = hexCell.y;
                vec2 hexCenter = vec2(
                    uRadius * sqrt(3.0) * (hx + hy * 0.5),
                    uRadius * 1.5 * hy
                );

                vec2 localPos = worldPos - hexCenter;
                float rhombusType = getRhombusIndex(localPos, uRadius);

                ${this.glsl_gridbounds_WebGL1()}

                if (hx < minQ || hx > maxQ || hy < minR || hy > maxR) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                float texX = (hx - minQ) * 3.0 + rhombusType;
                float texY = (hy - minR);

                vec2 texCoord = vec2(texX / (uGridCols * 3.0), texY / uGridRows);

                if (texCoord.x < 0.0 || texCoord.x >= 0.9999 ||
                    texCoord.y < 0.0 || texCoord.y >= 1.0) {
                    gl_FragColor = uCanvasColor;
                    return;
                }
                vec4 cellColor = texture2D(uGridTexture, texCoord);

                if (cellColor.a <= 0.0) {
                    gl_FragColor = uGridColor;
                } else {
                    gl_FragColor = applyRhombusShade(cellColor, rhombusType);
                }
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
        const radius = this.radius;

        const centerX = radius * Math.sqrt(3) * (q + r * 0.5);
        const centerY = radius * r * 1.5;
        // Use color schema based on state value
        const drawColor = this.colorSchema[state] ||  [1, 1, 1, 1];

        this.drawAdjacentRhombus(ctx, centerX, centerY, radius, s, drawColor);
    }

    drawAdjacentRhombus(ctx, centerX, centerY, radius, rhombusType, fillColor) {
        const shadeMultipliers = [1.0, 0.75, 0.5];
        const shade = shadeMultipliers[rhombusType] || 1.0;

        // Apply shade to color
        const r = fillColor[0] * 255;
        const g = fillColor[1] * 255;
        const b = fillColor[2] * 255;
        ctx.fillStyle = `rgb(${Math.round(r * shade)}, ${Math.round(g * shade)}, ${Math.round(b * shade)})`;

        ctx.beginPath();

        // Calculate hex vertices - EXACTLY like the shader (flat-topped, positive Y)
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6; // Flat-topped orientation
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle); // POSITIVE Y like shader
            vertices.push({x, y});
        }

        switch (rhombusType) {
            case 0:
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(vertices[0].x, vertices[0].y); // Top-right vertex
                ctx.lineTo(vertices[1].x, vertices[1].y); // Bottom-right vertex
                ctx.lineTo(vertices[2].x, vertices[2].y); // Bottom vertex
                break;
            case 1:
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(vertices[2].x, vertices[2].y); // Bottom vertex
                ctx.lineTo(vertices[3].x, vertices[3].y); // Bottom-left vertex
                ctx.lineTo(vertices[4].x, vertices[4].y); // Top-left vertex
                break;
            case 2:
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(vertices[4].x, vertices[4].y); // Top-left vertex
                ctx.lineTo(vertices[5].x, vertices[5].y); // Top vertex
                ctx.lineTo(vertices[0].x, vertices[0].y); // Top-right vertex
                break;
        }
        ctx.closePath();
        ctx.fill();
    }

}

export { RhomboidalGrid };