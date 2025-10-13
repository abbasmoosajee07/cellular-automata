import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    /**
     * @param {Array} colorSchema - same shape as BaseGrid.colorSchema (indexed states -> rgba)
     * @param {number} logicalGridSize - number of triangle columns/rows (logical). The actual GPU texture will be logicalGridSize*4 in width.
     * @param {number} radius - triangle radius in world units
     */
    constructor(colorSchema, logicalGridSize = 20, radius = 30) {
        super(colorSchema, "triangular");
        this.logicalGridSize = logicalGridSize;
        this.radius = radius;
        this.baseCellSize = 60;
        this.sideLength = this.baseCellSize;
        this.height = this.sideLength * Math.sqrt(3) / 2; // Equilateral triangle height
        // cells: Map<q, Map<r, [s0, s1, s2, s3, s4, s5]>>
        // where sN is 0/false or a state index or boolean
        // For triangles, we store 6 states per cell (for the 6 triangles in a subdivided hex)
        this.cells = new Map();

        // Colors used by shader (vec4s) - 6 colors for 6 triangles
        this.triangleColors = [
            [1.0, 0.0, 0.0, 1.0],   // triangle 0 - red
            [0.0, 1.0, 0.0, 1.0],   // triangle 1 - green  
            [0.0, 0.0, 1.0, 1.0],   // triangle 2 - blue
            [1.0, 1.0, 0.0, 1.0],   // triangle 3 - yellow
            [1.0, 0.0, 1.0, 1.0],   // triangle 4 - magenta
            [0.0, 1.0, 1.0, 1.0]    // triangle 5 - cyan
        ];

        this.rendererUsed = "webgl";
    }

    /**
     * Call once you have a GL context to initialize underlying BaseGrid texture at 6x width.
     */
    initForGL(gl, logicalGridSize = this.logicalGridSize) {
        this.logicalGridSize = logicalGridSize;
        // Create a square texture with width = logicalGridSize * 6 (so we have six texels per hex horizontally)
        const texSize = this.logicalGridSize * 6;
        super.initGridTexture(gl, texSize);
        this.gl = gl;
    }

    // STORAGE helpers
    _ensureCell(q, r) {
        if (!this.cells.has(q)) this.cells.set(q, new Map());
        const col = this.cells.get(q);
        if (!col.has(r)) col.set(r, [0, 0, 0, 0, 0, 0]); // default all triangles off
        return col.get(r);
    }

    /**
     * Set a single triangle state
     */
    setTriangleState(gl, q, r, triangleIndex, state) {
        const arr = this._ensureCell(q, r);
        arr[triangleIndex] = state ? 1 : 0;

        // compute texture pixel coords
        const gx = Math.floor(q + this.logicalGridSize / 2);
        const gy = Math.floor(r + this.logicalGridSize / 2);

        const texWidth = this.gridSize;
        const texX = gx * 6 + triangleIndex; // six texels per hex horizontally
        const texY = gy;

        // bounds check
        if (texX < 0 || texX >= texWidth || texY < 0 || texY >= texWidth) {
            return false;
        }

        // write into textureData
        const index = (texY * texWidth + texX) * 4;

        if (state) {
            const color = this.colorSchema[state] || [1, 1, 1, 1];
            this.textureData[index + 0] = Math.floor(color[0] * 255);
            this.textureData[index + 1] = Math.floor(color[1] * 255);
            this.textureData[index + 2] = Math.floor(color[2] * 255);
            this.textureData[index + 3] = 255;
        } else {
            this.textureData[index + 0] = 0;
            this.textureData[index + 1] = 0;
            this.textureData[index + 2] = 0;
            this.textureData[index + 3] = 0;
        }

        // update GPU texture
        if (gl) {
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

    getTriangleState(q, r, triangleIndex) {
        if (!this.cells.has(q)) return 0;
        const col = this.cells.get(q);
        if (!col.has(r)) return 0;
        const arr = col.get(r);
        return arr[triangleIndex] || 0;
    }

    // convenience: set the whole hex's six triangles at once
    setHexStates(gl, q, r, arr6) {
        const arr = this._ensureCell(q, r);
        for (let i = 0; i < 6; i++) {
            arr[i] = arr6[i] ? 1 : 0;
        }
        for (let i = 0; i < 6; i++) this.setTriangleState(gl, q, r, i, arr[i]);
    }

    // Mapping world -> triangle cell (same as before)
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

        const gridX = rx + rz * 0.5 + this.gridSize / 2;
        const gridY = rz + this.gridSize / 2;

        if (this.rendererUsed === "canvas2d") {
            return [rx, rz];
        } else {
            return [Math.floor(gridX), Math.floor(gridY)];
        }
    }

    screenToWorld(px, py, width, height, cameraView) {
        const worldX = (px -  width / 1 - cameraView.camX) / cameraView.zoom;
        const worldY = (height / 2 - py - cameraView.camY) / cameraView.zoom;
        return { x: worldX, y: worldY };
    }
    // JS equivalent of GLSL point-in-triangle for 6 triangles
    getTriangleIndex(localX, localY, radius) {
        const p = { x: localX, y: localY };
        
        // Compute hex vertices
        const verts = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6;
            verts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        }

        const pointInTri = (p, a, b, c) => {
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

        const center = { x: 0, y: 0 };
        
        // Check each of the 6 triangles (center to adjacent vertices)
        for (let i = 0; i < 6; i++) {
            const nextI = (i + 1) % 6;
            if (pointInTri(p, center, verts[i], verts[nextI])) {
                return i;
            }
        }
        return 0;
    }

    // Shader sources
    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
in vec2 aPosition;
out vec2 vTexCoord;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTexCoord = aPosition * 0.5 + 0.5;
}`;
        } else {
            return `
attribute vec2 aPosition;
varying vec2 vTexCoord;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTexCoord = aPosition * 0.5 + 0.5;
}`;
        }
    }

    getFragmentShaderSource(isWebGL2 = false) {
        const header = isWebGL2
            ? `#version 300 es
precision mediump float;
in vec2 vTexCoord;
out vec4 outColor;`
            : `precision mediump float;
varying vec2 vTexCoord;`;

        const body = `
uniform vec2 uResolution;
uniform vec2 uOffset;
uniform float uScale;
uniform float uGridSize;
uniform float uRadius;
uniform vec4 uDrawColor;
uniform vec4 uBgColor;
uniform sampler2D uGridTexture;
uniform vec4 uTriangleColors[6];

vec2 worldToHex(vec2 pos, float r) {
    float q = (sqrt(3.0)/3.0 * pos.x - 1.0/3.0 * pos.y) / r;
    float s = (2.0/3.0 * pos.y) / r;
    return vec2(q, s);
}

ivec2 hexRound(vec2 h) {
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
    return ivec2(int(rx), int(rz));
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

int getTriangleIndex(vec2 localPos, float radius) {
    vec2 c = vec2(0.0);
    
    for (int i = 0; i < 6; i++) {
        int nextI = (i + 1) % 6;
        vec2 v0 = getHexVertex(i, radius);
        vec2 v1 = getHexVertex(nextI, radius);
        if (pointInTriangle(localPos, c, v0, v1)) {
            return i;
        }
    }
    return 0;
}

void main() {
    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
    vec2 axial = worldToHex(worldPos, uRadius);
    ivec2 cell = hexRound(axial);

    vec2 hexCenter = vec2(
        uRadius * sqrt(3.0) * (float(cell.x) + float(cell.y) * 0.5),
        uRadius * 1.5 * float(cell.y)
    );

    vec2 localPos = worldPos - hexCenter;
    if (length(localPos) > uRadius * 1.05) {
        ${isWebGL2 ? "outColor = uBgColor;" : "gl_FragColor = uBgColor;"}
        return;
    }

    int triangleIndex = getTriangleIndex(localPos, uRadius);

    float gridWidth = uGridSize;
    float texX = (float(cell.x) + float(cell.y) * 0.5) * 6.0 + float(triangleIndex);
    float texY = float(cell.y);
    vec2 texCoord = (vec2(texX + gridWidth * 0.5, texY + uGridSize * 0.5)) / gridWidth;

    if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
        ${isWebGL2 ? "outColor = uBgColor;" : "gl_FragColor = uBgColor;"}
        return;
    }

    vec4 cellValue = ${isWebGL2 ? "texture(uGridTexture, texCoord)" : "texture2D(uGridTexture, texCoord)"};

    if (cellValue.a > 0.5) {
        ${isWebGL2 ? "outColor = uTriangleColors[triangleIndex];" : "gl_FragColor = uTriangleColors[triangleIndex];"}
    } else {
        ${isWebGL2 ? "outColor = uBgColor;" : "gl_FragColor = uBgColor;"}
    }
}
`;
        return header + '\n' + body;
    }

    // Canvas drawing fallback
    worldToCell1(world) {
        const s = this.sideLength;
        const h = this.height;

        // Match Canvas2D coordinate system
        const row = Math.floor(world.y / h);
        const col = Math.floor(world.x / s);
        
        // Determine triangle orientation: (col + row) % 2
        const isUpTriangle = (col + row) % 2 === 0;

        // Local coordinates within the cell
        const localX = world.x - col * s;
        const localY = world.y - row * h;

        // Equilateral triangle detection
        let inTriangle = false;
        const halfWidth = s * 0.5;
        
        if (isUpTriangle) {
            // Upward pointing equilateral triangle
            inTriangle = localY >= 0 && localY <= h && 
                        localX >= 0 && localX <= s &&
                        localY <= (h / halfWidth) * (halfWidth - Math.abs(localX - halfWidth));
        } else {
            // Downward pointing equilateral triangle  
            inTriangle = localY >= 0 && localY <= h && 
                        localX >= 0 && localX <= s &&
                        localY >= h - (h / halfWidth) * (halfWidth - Math.abs(localX - halfWidth));
        }

        if (!inTriangle || row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return [-1, -1];
        }

        return [col, row];
    }

    drawCanvasCells(ctx, cells) {
        const cellSize = this.baseCellSize || 60;
        const height = cellSize * Math.sqrt(3) / 2;

        for (const [col, colMap] of cells) {
            for (const [row, state] of colMap) {
                if (state) {
                    const x = col * cellSize / 2;
                    const y = row * height;
                    const orientation = (col + row) % 2;
                    this.drawEquilateralTriangle(ctx, x, -y, cellSize, orientation);
                }
            }
        }
    }

    drawEquilateralTriangle(ctx, x, y, size, orientation) {
        const height = size * Math.sqrt(3) / 2;
        const halfWidth = size * 0.5;
        
        ctx.beginPath();
        if (orientation === 0) {
            // Upward pointing triangle
            ctx.moveTo(x, y + height);
            ctx.lineTo(x + halfWidth, y);
            ctx.lineTo(x + size, y + height);
        } else {
            // Downward pointing triangle
            ctx.moveTo(x, y);
            ctx.lineTo(x + halfWidth, y + height);
            ctx.lineTo(x + size, y);
        }
        ctx.closePath();
        ctx.fill();
    }


    // Build texture from entire nested Map
    rebuildTextureFromCells(gl) {
        const texWidth = this.gridSize;
        const texSize = texWidth;
        
        // reset textureData
        for (let i = 0; i < this.textureData.length; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }

        for (const [q, colMap] of this.cells) {
            for (const [r, arrState] of colMap) {
                const gx = Math.floor(q + this.logicalGridSize / 2);
                const gy = Math.floor(r + this.logicalGridSize / 2);
                if (gx < 0 || gx >= this.logicalGridSize || gy < 0 || gy >= this.logicalGridSize) continue;

                for (let i = 0; i < 6; i++) {
                    const texX = gx * 6 + i;
                    const texY = gy;
                    const idx = (texY * texSize + texX) * 4;
                    if (arrState && arrState[i]) {
                        const color = this.colorSchema[arrState[i]] || [1, 1, 1, 1];
                        this.textureData[idx] = Math.floor(color[0] * 255);
                        this.textureData[idx + 1] = Math.floor(color[1] * 255);
                        this.textureData[idx + 2] = Math.floor(color[2] * 255);
                        this.textureData[idx + 3] = 255;
                    } else {
                        this.textureData[idx] = 0;
                        this.textureData[idx + 1] = 0;
                        this.textureData[idx + 2] = 0;
                        this.textureData[idx + 3] = 0;
                    }
                }
            }
        }

        // Upload whole texture
        if (gl) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texSize, texSize, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    // Uniform setup for shader
    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, "uResolution"),
            offset: gl.getUniformLocation(program, "uOffset"),
            scale: gl.getUniformLocation(program, "uScale"),
            gridSize: gl.getUniformLocation(program, "uGridSize"),
            radius: gl.getUniformLocation(program, "uRadius"),
            drawColor: gl.getUniformLocation(program, "uDrawColor"),
            bgColor: gl.getUniformLocation(program, "uBgColor"),
            gridTexture: gl.getUniformLocation(program, "uGridTexture"),
            triangleColors: gl.getUniformLocation(program, "uTriangleColors")
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.radius, this.radius);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        // flatten triangle colors into Float32Array(24) - 6 triangles * 4 components
        const triangleColorsFlat = new Float32Array(24);
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                triangleColorsFlat[i * 4 + j] = this.triangleColors[i][j];
            }
        }
        gl.uniform4fv(uniformLocations.triangleColors, triangleColorsFlat);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geometry.texture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        return uniformLocations;
    }

    // bounds & helpers
    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.radius * 2;
        const minCol = Math.floor(minX / size) - 1;
        const maxCol = Math.ceil(maxX / size) + 1;
        const minRow = Math.floor(minY / size) - 1;
        const maxRow = Math.ceil(maxY / size) + 1;
        return [minCol, maxCol, minRow, maxRow];
    }
}



export { TriangleGrid };
