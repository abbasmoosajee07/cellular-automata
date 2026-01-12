import { BaseGrid } from '../base.js';

class RhomboidalGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "rhombus");
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

    cubeToTextureCoords(q, r, rhombusIndex) {
        // Convert centered coordinates to texture coordinates
        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);
        const minCol = -centerCol;
        const minRow = -centerRow;

        // Use different texture columns for different rhombus types
        const texX = (q - minCol) * 3 + rhombusIndex; // *3 for three rhombus types
        const texY = (r - minRow);
        // const texY = (this.gridRows - 1 - (r - minRow)) + rhombusIndex * this.gridRows;

        return [Math.floor(texX), Math.floor(texY)];
    }

    getFragmentShaderSource(isWebGL2 = false) {
    if (isWebGL2) {
        return `#version 300 es
            precision mediump float;

            in vec2 vTexCoord;
            out vec4 outColor;

            uniform vec2 uResolution;
            uniform vec2 uOffset;
            uniform float uScale;
            uniform float uGridCols;
            uniform float uGridRows;
            uniform float uRadius;
            uniform sampler2D uGridTexture;
            uniform vec4 uCanvasColor;   // background outside any hex
            uniform vec4 uGridColor;     // color for empty cells

            // Flat-topped hexagon to cube coordinates
            vec2 worldToHex(vec2 pos, float r) {
                float q = (sqrt(3.0)/3.0 * pos.x - 1.0/3.0 * pos.y) / r;
                float s = (2.0/3.0 * pos.y) / r;
                return vec2(q, s);
            }

            ivec3 hexRound(vec2 h) {
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
                return ivec3(int(rx), int(rz), int(-rx - rz));
            }

            // Get hex vertex for flat-topped hexagon
            vec2 getHexVertex(int i, float r) {
                float angle = 3.14159265359 / 3.0 * float(i) - 3.14159265359 / 6.0;
                return vec2(r * cos(angle), r * sin(angle));
            }

            // Point in triangle test
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

            // Determine which rhombus using the proper cube-to-hex split
            int getRhombusIndex(vec2 localPos, float radius) {
                vec2 center = vec2(0.0);

                // Get hex vertices (flat-topped)
                vec2 v0 = getHexVertex(0, radius); // Right
                vec2 v1 = getHexVertex(1, radius); // Bottom-right
                vec2 v2 = getHexVertex(2, radius); // Bottom-left
                vec2 v3 = getHexVertex(3, radius); // Left
                vec2 v4 = getHexVertex(4, radius); // Top-left
                vec2 v5 = getHexVertex(5, radius); // Top-right

                // Check which triangular sector the point is in
                if (pointInTriangle(localPos, center, v0, v1)) return 0;
                if (pointInTriangle(localPos, center, v1, v2)) return 0;
                if (pointInTriangle(localPos, center, v2, v3)) return 1;
                if (pointInTriangle(localPos, center, v3, v4)) return 1;
                if (pointInTriangle(localPos, center, v4, v5)) return 2;
                if (pointInTriangle(localPos, center, v5, v0)) return 2;

                return 0;
            }

            // Function to apply different shades based on rhombus type
            vec4 applyRhombusShade(vec4 baseColor, int rhombusType) {
                if (rhombusType == 0) {
                    // Lightest shade - multiply by 1.0 (original)
                    return baseColor;
                } else if (rhombusType == 1) {
                    // Medium shade - multiply by 0.75
                    return vec4(baseColor.rgb * 0.75, baseColor.a);
                } else {
                    // Darkest shade - multiply by 0.5
                    return vec4(baseColor.rgb * 0.5, baseColor.a);
                }
            }

            void main() {
                // Screen -> world
                vec2 worldPos = vec2(
                    (vTexCoord.x * uResolution.x - uResolution.x * 0.5 - uOffset.x) / uScale,
                    -(vTexCoord.y * uResolution.y - uResolution.y * 0.5 - uOffset.y) / uScale
                );
                vec2 axial = worldToHex(worldPos, uRadius);
                ivec3 hexCell = hexRound(axial);

                // compute hex center in world (convert ints to floats)
                float hx = float(hexCell.x);
                float hy = float(hexCell.y);
                vec2 hexCenter = vec2(
                    uRadius * sqrt(3.0) * (hx + hy * 0.5),
                    uRadius * 1.5 * hy
                );

                vec2 localPos = worldPos - hexCenter;

                // outside hex -> canvas color
                if (length(localPos) > uRadius * 1.05) {
                    outColor = uCanvasColor;
                    return;
                }

                // Determine rhombus type (still used only for addressing)
                int rhombusType = getRhombusIndex(localPos, uRadius);

                // Grid bounds expressed as floats
                float minQ = -floor(uGridCols * 0.5);
                float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                float minR = -floor(uGridRows * 0.5);
                float maxR =  ceil(uGridRows * 0.5) - 1.0;

                // Check if hex is outside grid (convert hex indices to floats)
                if (hx < minQ || hx > maxQ || hy < minR || hy > maxR) {
                    outColor = uCanvasColor;
                    return;
                }

                // texture addressing (3 rhombi per hex along X)
                float texX = ((hx - minQ) * 3.0) + float(rhombusType);
                float texY = (hy - minR);

                vec2 texCoord = vec2(texX / (uGridCols * 3.0), texY / uGridRows);

                // if texCoord outside texture area -> canvas color
                if (texCoord.x < 0.0 || texCoord.x >= 0.9999 || texCoord.y < 0.0 || texCoord.y >= 1.0) {
                    outColor = uCanvasColor;
                    return;
                }

                vec4 cellColor = texture(uGridTexture, texCoord);

                // identical color rules to hex shader:
                // empty texel -> gridColor, otherwise use texture color
                if (cellColor.a <= 0.0) {
                    outColor = uGridColor;
                } else {
                    // Apply rhombus shading to texture color
                    outColor = applyRhombusShade(cellColor, rhombusType);
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
            uniform float uRadius;
            uniform sampler2D uGridTexture;
            uniform vec4 uCanvasColor;
            uniform vec4 uGridColor;
            varying vec2 vTexCoord;

            vec2 worldToHex(vec2 pos, float r) {
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
            }

            void main() {
                vec2 worldPos = vec2(
                    (vTexCoord.x * uResolution.x - uResolution.x * 0.5 - uOffset.x) / uScale,
                    -(vTexCoord.y * uResolution.y - uResolution.y * 0.5 - uOffset.y) / uScale
                );                vec2 axial = worldToHex(worldPos, uRadius);
                vec3 hexCell = hexRound(axial);

                // compute hex center and convert components to floats
                float hx = hexCell.x;
                float hy = hexCell.y;
                vec2 hexCenter = vec2(
                    uRadius * sqrt(3.0) * (hx + hy * 0.5),
                    uRadius * 1.5 * hy
                );

                vec2 localPos = worldPos - hexCenter;

                if (length(localPos) > uRadius * 1.05) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                float rhombusType = getRhombusIndex(localPos, uRadius);

                float minQ = -floor(uGridCols * 0.5);
                float maxQ =  ceil(uGridCols * 0.5) - 1.0;

                float minR = -floor(uGridRows * 0.5);
                float maxR =  ceil(uGridRows * 0.5) - 1.0;

                if (hx < minQ || hx > maxQ || hy < minR || hy > maxR) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                float texX = (hx - minQ) * 3.0 + rhombusType;
                float texY = (hy - minR);

                vec2 texCoord = vec2(texX / (uGridCols * 3.0), texY / uGridRows);

                if (texCoord.x < 0.0 || texCoord.x >= 0.9999 || texCoord.y < 0.0 || texCoord.y >= 1.0) {
                    gl_FragColor = uCanvasColor;
                    return;
                }

                vec4 cellColor = texture2D(uGridTexture, texCoord);

                if (cellColor.a <= 0.0) {
                    // Apply rhombus shading to grid color
                    gl_FragColor = uGridColor;
                } else {
                    // Apply rhombus shading to texture color
                    gl_FragColor = applyRhombusShade(cellColor, rhombusType);
                }
            }
            `;
    }
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

    screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS) {
        let minX, maxX, minY, maxY;

        const radius = this.radius;
        // World-space corners in axial coords
        const corners = [
            { q: minQ, r: minR },
            { q: maxQ, r: minR},
            { q: maxQ, r: maxR + 2},
            { q: minQ, r: maxR + 2}
        ];

        // Convert axial → world
        const pts = corners.map(({ q, r }) => ({
            x: radius * Math.sqrt(3) * (q + r * 0.5),
            y: radius * -1.5 * r
        }));

        // Bounding box
        minX = Math.min(...pts.map(p => p.x));
        maxX = Math.max(...pts.map(p => p.x));
        minY = Math.min(...pts.map(p => p.y));
        maxY = Math.max(...pts.map(p => p.y));

        return [minX, maxX, minY, maxY];
    }

}

export { RhomboidalGrid };