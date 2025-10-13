import { BaseGrid } from '../base.js';

class RhomboidalGrid extends BaseGrid {
    /**
     * @param {Array} colorSchema - same shape as BaseGrid.colorSchema (indexed states -> rgba)
     * @param {number} logicalGridSize - number of hex columns/rows (logical). The actual GPU texture will be logicalGridSize*3 in width.
     * @param {number} radius - hex radius in world units (matches HexagonGrid usage)
     */
    constructor(colorSchema, logicalGridSize = 20, radius = 30) {
        super(colorSchema, "rhomboidal");
        this.logicalGridSize = logicalGridSize; // number of hex columns/rows logically
        this.radius = radius;

        // cells: Map<q, Map<r, [s0, s1, s2]>>
        // where sN is 0/false or a state index or boolean
        this.cells = new Map();

        // Colors used by shader (vec4s)
        this.rhombusColors = [
            [1.0, 0.0, 0.0, 1.0],
            [0.0, 1.0, 0.0, 1.0],
            [0.0, 0.0, 1.0, 1.0]
        ];

        // Keep track of renderer used (canvas or webgl)
        this.rendererUsed = "webgl";
    }

    /**
     * Call once you have a GL context to initialize underlying BaseGrid texture at 3x width.
     * This will create the underlying this.gridTexture and this.textureData via BaseGrid.initGridTexture.
     */
    initForGL(gl, logicalGridSize = this.logicalGridSize) {
        this.logicalGridSize = logicalGridSize;
        // Create a square texture with width = logicalGridSize * 3 (so we have three texels per hex horizontally)
        const texSize = this.logicalGridSize * 9;
        // BaseGrid.initGridTexture expects a single gridSize and creates a gridSize x gridSize texture
        super.initGridTexture(gl, texSize);
        // After calling initGridTexture, this.gridSize === texSize and this.textureData exists (Uint8Array)
        this.gl = gl;
    }

    //  STORAGE helpers (nested Map)
    _ensureCell(q, r) {
        if (!this.cells.has(q)) this.cells.set(q, new Map());
        const col = this.cells.get(q);
        if (!col.has(r)) col.set(r, [0, 0, 0]); // default all rhombi off
        return col.get(r);
    }

    /**
     * Set a single rhombus state (0/false = off, non-zero = on or a state index).
     * Updates both nested Map and base textureData then uploads the single pixel via BaseGrid.setCellState
     */
    setRhombusState(gl, q, r, rhombusIndex, state) {
        // keep nested map structure: Map<q, Map<r, [s0,s1,s2]>>
        const arr = this._ensureCell(q, r);
        arr[rhombusIndex] = state ? 1 : 0;

        // compute texture pixel coords
        const gx = Math.floor(q + this.logicalGridSize / 2);
        const gy = Math.floor(r + this.logicalGridSize / 2);

        // actual texture width (BaseGrid stored it in this.gridSize)
        const texWidth = this.gridSize;
        const texX = gx * 3 + rhombusIndex; // three texels per hex horizontally
        const texY = gy;

        // bounds check
        if (texX < 0 || texX >= texWidth || texY < 0 || texY >= texWidth) {
            return false;
        }

        // write into this.textureData (Uint8Array of length gridSize*gridSize*4)
        const index = (texY * texWidth + texX) * 4;

        if (state) {
            // we will store "on" as the color from colorSchema[1] if present, else white
            const color = this.colorSchema[state] || [1, 1, 1, 1];
            this.textureData[index + 0] = Math.floor(color[0] * 255);
            this.textureData[index + 1] = Math.floor(color[1] * 255);
            this.textureData[index + 2] = Math.floor(color[2] * 255);
            this.textureData[index + 3] = 255;
        } else {
            // transparent = off
            this.textureData[index + 0] = 0;
            this.textureData[index + 1] = 0;
            this.textureData[index + 2] = 0;
            this.textureData[index + 3] = 0;
        }

        // update the single pixel on GPU using BaseGrid.setCellState (which also does texSubImage2D)
        // setCellState expects (gl, x, y, state), but it maps x,y to our grid coordinates — we bypass and directly update texture.
        if (gl) {
            // gl.texSubImage2D of 1x1 pixel
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

    getRhombusState(q, r, rhombusIndex) {
        if (!this.cells.has(q)) return 0;
        const col = this.cells.get(q);
        if (!col.has(r)) return 0;
        const arr = col.get(r);
        return arr[rhombusIndex] || 0;
    }

    // convenience: set the whole hex's three rhombi at once
    setHexStates(gl, q, r, arr3) {
        const arr = this._ensureCell(q, r);
        arr[0] = arr3[0] ? 1 : 0;
        arr[1] = arr3[1] ? 1 : 0;
        arr[2] = arr3[2] ? 1 : 0;
        // Update three texels for this hex
        for (let i = 0; i < 3; i++) this.setRhombusState(gl, q, r, i, arr[i]);
    }

    //  Mapping world -> rhombus cell
    worldToCell(worldPos) {
        // Same as hexagon grid
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

    // JS equivalent of GLSL point-in-triangle grouping for rhombi
    getRhombusIndex(localX, localY, radius) {
        // compute hex vertices
        const verts = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6; // flat-top
            verts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        }
        const p = { x: localX, y: localY };
        const center = { x: 0, y: 0 };

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

        if (pointInTri(p, center, verts[0], verts[1])) return 0;
        if (pointInTri(p, center, verts[1], verts[2])) return 0;
        if (pointInTri(p, center, verts[2], verts[3])) return 1;
        if (pointInTri(p, center, verts[3], verts[4])) return 1;
        if (pointInTri(p, center, verts[4], verts[5])) return 2;
        if (pointInTri(p, center, verts[5], verts[0])) return 2;
        return 0;
    }

    //  Shader sources (WebGL1/2 compatible)
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
        // Use the cross-compatible fragment from earlier — it computes rhombusIndex and samples the widened texture
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
uniform float uGridSize; // THIS should be logicalGridSize (passed as logicalGridSize*3 width)
uniform float uRadius;
uniform vec4 uDrawColor;
uniform vec4 uBgColor;
uniform sampler2D uGridTexture;
uniform vec4 uRhombusColors[3];

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

int getRhombusIndex(vec2 localPos, float radius) {
    vec2 c = vec2(0.0);
    vec2 v0 = getHexVertex(0, radius);
    vec2 v1 = getHexVertex(1, radius);
    vec2 v2 = getHexVertex(2, radius);
    vec2 v3 = getHexVertex(3, radius);
    vec2 v4 = getHexVertex(4, radius);
    vec2 v5 = getHexVertex(5, radius);

    if (pointInTriangle(localPos, c, v0, v1)) return 0;
    if (pointInTriangle(localPos, c, v1, v2)) return 0;
    if (pointInTriangle(localPos, c, v2, v3)) return 1;
    if (pointInTriangle(localPos, c, v3, v4)) return 1;
    if (pointInTriangle(localPos, c, v4, v5)) return 2;
    if (pointInTriangle(localPos, c, v5, v0)) return 2;
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

    int rhombusIndex = getRhombusIndex(localPos, uRadius);

    // Our texture width is logicalGridSize*3 (stored in uGridSize when we set uniforms)
    float gridWidth = uGridSize;
    // compute texel coords: (rx + rz*0.5) * 3 + rhombusIndex  -> matches JS encoding
    float texX = (float(cell.x) + float(cell.y) * 0.5) * 3.0 + float(rhombusIndex);
    float texY = float(cell.y);
    vec2 texCoord = (vec2(texX + gridWidth * 0.5, texY + uGridSize * 0.5)) / gridWidth;

    if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
        ${isWebGL2 ? "outColor = uBgColor;" : "gl_FragColor = uBgColor;"}
        return;
    }

    vec4 cellValue = ${isWebGL2 ? "texture(uGridTexture, texCoord)" : "texture2D(uGridTexture, texCoord)"};

    if (cellValue.a > 0.5) {
        ${isWebGL2 ? "outColor = uRhombusColors[rhombusIndex];" : "gl_FragColor = uRhombusColors[rhombusIndex];"}
    } else {
        ${isWebGL2 ? "outColor = uBgColor;" : "gl_FragColor = uBgColor;"}
    }
}
`;
        return header + '\n' + body;
    }

    //  Canvas drawing fallback (draws each rhombus separately)
    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const radius = this.radius || 30;

        for (const [q, colMap] of cells) {
            for (const [r, state] of colMap) {
                if (!state) continue;

                const centerX = radius * Math.sqrt(3) * (q + r * 0.5);
                const centerY = radius * 1.5 * r;

                this.drawHexRhombi(ctx, centerX, -centerY, radius);
            }
        }
    }

    drawHexRhombi(ctx, cx, cy, r) {
        // Compute hex vertices (flat-top)
        const verts = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6; // 30° increments, flat-top
            verts.push({
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle)
            });
        }

        // --- Rhombus 0 (top-right) : v0,v1,v2 ---
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(verts[0].x, verts[0].y);
        ctx.lineTo(verts[1].x, verts[1].y);
        ctx.lineTo(verts[2].x, verts[2].y);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
        ctx.fill();

        // --- Rhombus 1 (bottom) : v2,v3,v4 ---
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(verts[2].x, verts[2].y);
        ctx.lineTo(verts[3].x, verts[3].y);
        ctx.lineTo(verts[4].x, verts[4].y);
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 255, 0, 0.6)";
        ctx.fill();

        // --- Rhombus 2 (top-left) : v4,v5,v0 ---
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(verts[4].x, verts[4].y);
        ctx.lineTo(verts[5].x, verts[5].y);
        ctx.lineTo(verts[0].x, verts[0].y);
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
        ctx.fill();
    }

    //  Build texture from entire nested Map (useful on big updates)
    rebuildTextureFromCells(gl) {
        // texture width/height are both this.gridSize (created earlier as logicalGridSize*3)
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

                for (let i = 0; i < 3; i++) {
                    const texX = gx * 3 + i;
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

        // Upload whole texture via BaseGrid.updateGridTexture
        if (gl) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texSize, texSize, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    //  Uniform setup for shader (compatible with HexagonGrid usage)
    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        // geometry.gridSize should equal this.gridSize (the actual texture width)
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, "uResolution"),
            offset: gl.getUniformLocation(program, "uOffset"),
            scale: gl.getUniformLocation(program, "uScale"),
            gridSize: gl.getUniformLocation(program, "uGridSize"),
            radius: gl.getUniformLocation(program, "uRadius"),
            drawColor: gl.getUniformLocation(program, "uDrawColor"),
            bgColor: gl.getUniformLocation(program, "uBgColor"),
            gridTexture: gl.getUniformLocation(program, "uGridTexture"),
            rhombusColors: gl.getUniformLocation(program, "uRhombusColors")
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        // follow HexagonGrid: note HexagonGrid used -cameraView.camY; maintain consistent orientation for you
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        // pass the actual texture width (logicalGridSize*3)
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.radius, this.radius);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        // flatten rhombus colors into Float32Array(12)
        const rhombusColorsFlat = new Float32Array(12);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                rhombusColorsFlat[i * 4 + j] = this.rhombusColors[i][j];
            }
        }
        gl.uniform4fv(uniformLocations.rhombusColors, rhombusColorsFlat);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geometry.texture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        return uniformLocations;
    }

    //  bounds & helpers (same structure as HexagonGrid)
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

export { RhomboidalGrid };