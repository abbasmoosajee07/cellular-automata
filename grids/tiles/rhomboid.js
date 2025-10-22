import { BaseGrid } from '../base.js';

class RhomboidalGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "rhombus");
        this.radius = 60;
        this.rowMult = 1;
        this.colMult = 3;
    }

    worldToCell(worldPos) {
        const q = (Math.sqrt(3) / 3 * worldPos.x - 1 / 3 * worldPos.y) / this.radius;
        const s = (2 / 3 * worldPos.y) / this.radius;

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
        const localY = worldPos.y - hexCenterY;

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

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const radius = this.radius;
        const hexWidth = radius * Math.sqrt(3);
        const hexHeight = radius * 2;

        const minCol = Math.floor(minX / hexWidth) - 1;
        const maxCol = Math.ceil(maxX / hexWidth) + 1;
        const minRow = Math.floor(minY / hexHeight) - 1;
        const maxRow = Math.ceil(maxY / hexHeight) + 1;

        return [minCol, maxCol, minRow, maxRow];
    }

    cubeToTextureCoords(q, r, rhombusIndex) {
        // Convert centered coordinates to texture coordinates
        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);
        const minCol = -centerCol - 1;
        const minRow = -centerRow - 1;

        // Use different texture columns for different rhombus types
        const texX = (q - minCol) * 3 + rhombusIndex; // *3 for three rhombus types
        const texY = (r - minRow);

        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, rhombusIndex, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, rhombusIndex);
        const textureWidth = (this.gridCols + 2) * this.colMult; // +2 for boundaries
        const textureHeight = (this.gridRows + 2); // +2 for boundaries

        if (texX >= 0 && texX < textureWidth && texY >= 0 && texY < textureHeight) {
            const index = (texY * textureWidth + texX) * 4;

            if (state) {
                const color = this.colorSchema[state] || [1, 1, 1, 1];
                this.textureData[index] = color[0] * 255;
                this.textureData[index + 1] = color[1] * 255;
                this.textureData[index + 2] = color[2] * 255;
                this.textureData[index + 3] = 255;
            } else {
                this.textureData[index] = 0;
                this.textureData[index + 1] = 0;
                this.textureData[index + 2] = 0;
                this.textureData[index + 3] = 0;
            }

            if (gl && this.gridTexture) {
                gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
                const pixelData = new Uint8Array([
                    this.textureData[index],
                    this.textureData[index + 1],
                    this.textureData[index + 2],
                    this.textureData[index + 3]
                ]);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            }
            
            return true;
        }
        return false;
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
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    vec2 axial = worldToHex(worldPos, uRadius);
                    ivec3 hexCell = hexRound(axial);

                    // Get local position within the hexagon
                    vec2 hexCenter = vec2(
                        uRadius * sqrt(3.0) * (float(hexCell.x) + float(hexCell.y) * 0.5),
                        uRadius * 1.5 * float(hexCell.y)
                    );
                    vec2 localPos = worldPos - hexCenter;

                    // Skip if outside hexagon
                    if (length(localPos) > uRadius * 1.0) {
                        outColor = vec4(0.0);
                        return;
                    }

                    // Determine rhombus type
                    int rhombusType = getRhombusIndex(localPos, uRadius);

                    // Convert to texture coordinates - account for boundaries
                    float minQ = -float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5 - 1.0;
                    
                    float texX = (float(hexCell.x) - minQ) * 3.0 + float(rhombusType);
                    float texY = (float(hexCell.y) - minR);
                    
                    // Normalize texture coordinates with boundary accounting
                    float texCoordX = texX / ((float(uGridCols) + 2.0) * 3.0);
                    float texCoordY = texY / (float(uGridRows) + 2.0);

                    if (texCoordX >= 0.0 && texCoordX < 1.0 && texCoordY >= 0.0 && texCoordY < 1.0) {
                        vec4 cellColor = texture(uGridTexture, vec2(texCoordX, texCoordY));
                        // Apply shade multiplier based on rhombus type and use texture color
                        outColor = applyRhombusShade(cellColor, rhombusType);
                    } else {
                        // Outside grid bounds - use transparent
                        outColor = vec4(0.0);
                    }
                }`;
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
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    vec2 axial = worldToHex(worldPos, uRadius);
                    vec3 hexCell = hexRound(axial);

                    vec2 hexCenter = vec2(
                        uRadius * sqrt(3.0) * (hexCell.x + hexCell.y * 0.5),
                        uRadius * 1.5 * hexCell.y
                    );
                    vec2 localPos = worldPos - hexCenter;

                    if (length(localPos) > uRadius * 1.05) {
                        gl_FragColor = vec4(0.0);
                        return;
                    }

                    float rhombusType = getRhombusIndex(localPos, uRadius);

                    float minQ = -float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5 - 1.0;
                    
                    float texX = (hexCell.x - minQ) * 3.0 + rhombusType;
                    float texY = (hexCell.y - minR);
                    
                    vec2 texCoord = vec2(texX / ((float(uGridCols) + 2.0) * 3.0), texY / (float(uGridRows) + 2.0));

                    if (texCoord.x >= 0.0 && texCoord.x < 1.0 && texCoord.y >= 0.0 && texCoord.y < 1.0) {
                        vec4 cellColor = texture2D(uGridTexture, texCoord);
                        // Apply shade multiplier based on rhombus type and use texture color
                        gl_FragColor = applyRhombusShade(cellColor, rhombusType);
                    } else {
                        // Outside grid bounds - use transparent
                        gl_FragColor = vec4(0.0);
                    }
                }`;
        }
    }

    drawShapeCell(ctx, q, r, s, state) {
        const radius = this.radius || 30;

        const centerX = radius * Math.sqrt(3) * (q + r * 0.5);
        const centerY = radius * r * -1.5;
        // Use color schema based on state value
        const drawColor = this.colorSchema[state] ||  [1, 1, 1, 1];

        this.drawAdjacentRhombus(ctx, centerX, centerY, radius, s, drawColor);
    }

    drawAdjacentRhombus(ctx, centerX, centerY, radius, rhombusType, fillColor) {
        const shadeMultipliers = [1.0, 0.8, 0.6];
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
                ctx.lineTo(vertices[4].x, vertices[4].y); // Top-left vertex
                ctx.lineTo(vertices[5].x, vertices[5].y); // Top vertex
                ctx.lineTo(vertices[0].x, vertices[0].y); // Top-right vertex
                break;
            case 2:
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
        }
        ctx.closePath();
        ctx.fill();
    }
}

export { RhomboidalGrid };