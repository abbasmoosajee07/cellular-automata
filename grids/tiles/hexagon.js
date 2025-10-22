import { BaseGrid } from '../base.js';

class HexagonGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "hexagon");
        this.radius = 30;
        this.rowMult = 1;
        this.colMult = 1;
    }

    initGridTexture(gl, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;

        this.textureWidth = (gridCols + 4) * this.colMult;
        this.textureHeight = (gridRows + 4) * this.rowMult;
        this.textureData = new Uint8Array(this.textureWidth * this.textureHeight * 4);

        for (let i = 0; i < this.textureWidth * this.textureHeight * 4; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }

        this.gridTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textureWidth, this.textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
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
        const texX = q + centerCol + 2;
        const texY = r + centerRow + 2;

        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX >= 0 && texX < this.textureWidth && texY >= 0 && texY < this.textureHeight) {
            const index = (texY * this.textureWidth + texX) * 4;

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
                gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 
                                new Uint8Array(this.textureData.subarray(index, index + 4)));
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

                // Convert world position to cube coordinates
                vec3 worldToCube(vec2 worldPos, float size) {
                    float q = (sqrt(3.0) / 3.0 * worldPos.x - 1.0 / 3.0 * worldPos.y) / size;
                    float r = (2.0 / 3.0 * worldPos.y) / size;
                    return vec3(q, r, -q - r);
                }

                // Round to nearest hex coordinates
                vec3 cubeRound(vec3 cube) {
                    float x = cube.x;
                    float y = cube.z;  // Note: y is the third coordinate
                    float z = cube.y;  // z is the second coordinate
                    
                    float rx = round(x);
                    float ry = round(y);
                    float rz = round(z);
                    
                    float x_diff = abs(rx - x);
                    float y_diff = abs(ry - y);
                    float z_diff = abs(rz - z);
                    
                    if (x_diff > y_diff && x_diff > z_diff) {
                        rx = -ry - rz;
                    } else if (y_diff > z_diff) {
                        ry = -rx - rz;
                    } else {
                        rz = -rx - ry;
                    }
                    
                    return vec3(rx, rz, ry); // Return as (q, r, s)
                }

                // Get hexagon center position from cube coordinates
                vec2 cubeToWorld(vec3 cube, float size) {
                    float q = cube.x;
                    float r = cube.y;
                    float x = size * (sqrt(3.0) * q + sqrt(3.0) / 2.0 * r);
                    float y = size * (3.0 / 2.0 * r);
                    return vec2(x, y);
                }

                // Check if point is inside hexagon
                bool pointInHexagon(vec2 localPos, float size) {
                    // Transform to hex space
                    vec2 p = vec2(
                        localPos.x / (sqrt(3.0) * size),
                        localPos.y / (1.5 * size)
                    );
                    
                    // Convert to axial coordinates and check bounds
                    vec2 axial = vec2(p.x - p.y * 0.5, p.y);
                    vec2 rounded = round(axial);
                    vec2 diff = abs(axial - rounded);
                    
                    return max(diff.x, diff.y) <= 0.5;
                }

                void main() {
                    // Convert to world coordinates
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    // Convert to cube coordinates
                    vec3 cube = worldToCube(worldPos, uRadius);
                    vec3 hexCoord = cubeRound(cube);
                    
                    // Verify cube coordinates sum to zero (with tolerance)
                    float sum = hexCoord.x + hexCoord.y + hexCoord.z;
                    if (abs(sum) > 0.001) {
                        // Force correction if rounding introduced error
                        hexCoord.x = round(cube.x);
                        hexCoord.z = round(cube.z);
                        hexCoord.y = -hexCoord.x - hexCoord.z;
                    }
                    
                    // Get hexagon center
                    vec2 hexCenter = cubeToWorld(hexCoord, uRadius);
                    vec2 localPos = worldPos - hexCenter;
                    
                    // Check if within hexagon
                    if (!pointInHexagon(localPos, uRadius * 0.95)) {
                        outColor = vec4(0.0);
                        return;
                    }

                    // Convert to texture coordinates
                    float centerCol = uGridCols * 0.5;
                    float centerRow = uGridRows * 0.5;
                    float texX = hexCoord.x + centerCol + 2.0;
                    float texY = hexCoord.y + centerRow + 2.0;

                    // Normalize texture coordinates
                    vec2 texCoord = vec2(texX / (uGridCols + 4.0), texY / (uGridRows + 4.0));

                    if (texCoord.x >= 0.0 && texCoord.x <= 1.0 && texCoord.y >= 0.0 && texCoord.y <= 1.0) {
                        vec4 cellColor = texture(uGridTexture, texCoord);
                        outColor = cellColor;
                    } else {
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

                vec3 worldToCube(vec2 worldPos, float size) {
                    float q = (sqrt(3.0) / 3.0 * worldPos.x - 1.0 / 3.0 * worldPos.y) / size;
                    float r = (2.0 / 3.0 * worldPos.y) / size;
                    return vec3(q, r, -q - r);
                }

                vec3 cubeRound(vec3 cube) {
                    float x = cube.x;
                    float y = cube.z;
                    float z = cube.y;
                    
                    float rx = round(x);
                    float ry = round(y);
                    float rz = round(z);
                    
                    float x_diff = abs(rx - x);
                    float y_diff = abs(ry - y);
                    float z_diff = abs(rz - z);
                    
                    if (x_diff > y_diff && x_diff > z_diff) {
                        rx = -ry - rz;
                    } else if (y_diff > z_diff) {
                        ry = -rx - rz;
                    } else {
                        rz = -rx - ry;
                    }
                    
                    return vec3(rx, rz, ry);
                }

                vec2 cubeToWorld(vec3 cube, float size) {
                    float q = cube.x;
                    float r = cube.y;
                    float x = size * (sqrt(3.0) * q + sqrt(3.0) / 2.0 * r);
                    float y = size * (3.0 / 2.0 * r);
                    return vec2(x, y);
                }

                bool pointInHexagon(vec2 localPos, float size) {
                    vec2 p = vec2(
                        localPos.x / (sqrt(3.0) * size),
                        localPos.y / (1.5 * size)
                    );
                    
                    vec2 axial = vec2(p.x - p.y * 0.5, p.y);
                    vec2 rounded = round(axial);
                    vec2 diff = abs(axial - rounded);
                    
                    return max(diff.x, diff.y) <= 0.5;
                }

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    vec3 cube = worldToCube(worldPos, uRadius);
                    vec3 hexCoord = cubeRound(cube);
                    
                    float sum = hexCoord.x + hexCoord.y + hexCoord.z;
                    if (abs(sum) > 0.001) {
                        hexCoord.x = round(cube.x);
                        hexCoord.z = round(cube.z);
                        hexCoord.y = -hexCoord.x - hexCoord.z;
                    }
                    
                    vec2 hexCenter = cubeToWorld(hexCoord, uRadius);
                    vec2 localPos = worldPos - hexCenter;
                    
                    if (!pointInHexagon(localPos, uRadius * 0.95)) {
                        gl_FragColor = vec4(0.0);
                        return;
                    }

                    float centerCol = uGridCols * 0.5;
                    float centerRow = uGridRows * 0.5;
                    float texX = hexCoord.x + centerCol + 2.0;
                    float texY = hexCoord.y + centerRow + 2.0;
                    
                    vec2 texCoord = vec2(texX / (uGridCols + 4.0), texY / (uGridRows + 4.0));

                    if (texCoord.x >= 0.0 && texCoord.x <= 1.0 && texCoord.y >= 0.0 && texCoord.y <= 1.0) {
                        vec4 cellColor = texture2D(uGridTexture, texCoord);
                        gl_FragColor = cellColor;
                    } else {
                        gl_FragColor = vec4(0.0);
                    }
                }`;
        }
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
}

export { HexagonGrid };