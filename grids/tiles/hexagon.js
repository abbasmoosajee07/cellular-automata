import { BaseGrid } from '../base.js';

class HexagonGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "hexagon");
        this.radius = 30;
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, "uResolution"),
            offset: gl.getUniformLocation(program, "uOffset"),
            scale: gl.getUniformLocation(program, "uScale"),
            gridCols: gl.getUniformLocation(program, "uGridCols"),
            gridRows: gl.getUniformLocation(program, "uGridRows"),
            radius: gl.getUniformLocation(program, "uRadius"),
            drawColor: gl.getUniformLocation(program, "uDrawColor"),
            bgColor: gl.getUniformLocation(program, "uBgColor"),
            gridTexture: gl.getUniformLocation(program, "uGridTexture")
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.radius, this.radius);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geometry.texture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        return uniformLocations;
    }

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
            uniform vec4 uDrawColor;
            uniform vec4 uBgColor;
            uniform sampler2D uGridTexture;

            // Flat-topped axial conversion
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

            void main() {
                vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                vec2 axial = worldToHex(worldPos, uRadius);
                ivec3 cell = hexRound(axial);

                // Use rectangular grid mapping with proper bounds
                float minQ = -float(uGridCols) * 0.5;
                float minR = -float(uGridRows) * 0.5;
                
                vec2 texCoord = vec2(
                    (float(cell.x) + float(cell.y) * 0.5 - minQ) / uGridCols,
                    (float(cell.y) - minR) / uGridRows
                );

                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
                    outColor = uBgColor;
                    return;
                }

                vec4 cellValue = texture(uGridTexture, texCoord);
                outColor = (cellValue.a > 0.5) ? uDrawColor : uBgColor;
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
            uniform vec4 uDrawColor;
            uniform vec4 uBgColor;
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

            void main() {
                vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                vec2 axial = worldToHex(worldPos, uRadius);
                vec3 cell = hexRound(axial);

                float minQ = -float(uGridCols) * 0.5;
                float minR = -float(uGridRows) * 0.5;
                
                vec2 texCoord = vec2(
                    (cell.x + cell.y * 0.5 - minQ) / uGridCols,
                    (cell.y - minR) / uGridRows
                );

                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
                    gl_FragColor = uBgColor;
                    return;
                }

                vec4 cellValue = texture2D(uGridTexture, texCoord);
                gl_FragColor = (cellValue.a > 0.5) ? uDrawColor : uBgColor;
            }`;
        }
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.radius * 2;
        const minCol = Math.floor(minX / size) - 1;
        const maxCol = Math.ceil(maxX / size) + 1;
        const minRow = Math.floor(minY / size) - 1;
        const maxRow = Math.ceil(maxY / size) + 1;
        return [minCol, maxCol, minRow, maxRow];
    }

    worldToCell(worldPos) {
        const q = (Math.sqrt(3) / 3 * worldPos.x - 1 / 3 * worldPos.y) / this.radius;
        const s = (2 / 3 * worldPos.y) / this.radius;

        // Cube coordinates for rounding
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

        // Return all three cube coordinates with q + r + s = 0
        return [rx, rz, -rx - rz];
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const radius = this.radius || 30;
        
        for (const [key, state] of cells) {
            if (state) {
                const [q, r, s] = key.split(',').map(Number);
                // Verify cube coordinate constraint
                if (Math.abs(q + r + s) > 0.001) {
                    // console.warn(`Invalid cube coordinates: (${q}, ${r}, ${s}), sum = ${q + r + s}`);
                    continue;
                }
                
                const x = radius * Math.sqrt(3) * (q + r * 0.5);
                const y = radius * r * -1.5; // Keep original negative for rectangular layout
                this.drawFlatTopHexagon(ctx, x, y, radius);
            }
        }
    }

    drawFlatTopHexagon(ctx, centerX, centerY, radius) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6; // -30° offset for flat-topped
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Cube coordinate to texture coordinate conversion
    cubeToTextureCoords(q, r, s) {
        // Verify cube coordinate constraint
        if (Math.abs(q + r + s) > 0.001) {
            // console.warn(`Invalid cube coordinates in texture mapping: (${q}, ${r}, ${s}), sum = ${q + r + s}`);
        }

        // Use rectangular grid mapping
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);
        
        const texX = q + r * 0.5 - minQ;
        const texY = r - minR;
        
        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        // Verify cube coordinate constraint
        if (Math.abs(q + r + s) > 0.001) {
            // console.warn(`Invalid cube coordinates: (${q}, ${r}, ${s}), sum = ${q + r + s}`);
            return false;
        }

        const [texX, texY] = this.cubeToTextureCoords(q, r, s);
        
        if (texX >= 0 && texX < this.gridCols && texY >= 0 && texY < this.gridRows) {
            const index = (texY * this.gridCols + texX) * 4;

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

    initGridTexture(gl, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.textureData = new Uint8Array(gridCols * gridRows * 4);

        // Initialize texture with all cells empty
        for (let i = 0; i < gridCols * gridRows * 4; i += 4) {
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gridCols, gridRows, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
    }

    getCellIndexFromWorld(world, q, r, s) {
        return 1;
    }
}

export { HexagonGrid };