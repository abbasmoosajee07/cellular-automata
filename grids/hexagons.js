import { BaseGrid } from './base.js';

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
            gridSize: gl.getUniformLocation(program, "uGridSize"),
            radius: gl.getUniformLocation(program, "uRadius"),
            drawColor: gl.getUniformLocation(program, "uDrawColor"),
            bgColor: gl.getUniformLocation(program, "uBgColor"),
            gridTexture: gl.getUniformLocation(program, "uGridTexture")
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
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
            uniform float uGridSize;
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

            void main() {
                vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                vec2 axial = worldToHex(worldPos, uRadius);
                ivec2 cell = hexRound(axial);

                vec2 texCoord = (vec2(float(cell.x) + uGridSize * 0.5, float(cell.y) + uGridSize * 0.5)) / uGridSize;

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
            uniform float uGridSize;
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

            void main() {
                vec2 worldPos = (vTexCoord * uResolution - uResolution*0.5 - uOffset) / uScale;
                vec2 axial = worldToHex(worldPos, uRadius);
                ivec2 cell = hexRound(axial);

                vec2 texCoord = (vec2(float(cell.x) + uGridSize*0.5, float(cell.y) + uGridSize*0.5)) / uGridSize;

                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
                    gl_FragColor = uBgColor;
                    return;
                }

                vec4 cellValue = texture2D(uGridTexture, texCoord);
                gl_FragColor = (cellValue.a > 0.5) ? uDrawColor : uBgColor;
            }`;
        }
    }

    worldToCell(worldPos) {
        const q = (Math.sqrt(3)/3 * worldPos.x - 1/3 * worldPos.y) / this.radius;
        const s = (2/3 * worldPos.y) / this.radius;

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

        return [rx, rz];
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

    drawCanvasCells(ctx, cells) {
        const radius = this.radius || 30;
        for (const [q, colMap] of cells) {
            for (const [r, state] of colMap) {
                if (state) {
                    const x = radius * Math.sqrt(3) * (q + r * 0.5);
                    const y = radius * r * -1.5;
                    this.drawFlatTopHexagon(ctx, x, y, radius);
                }
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
}

export { HexagonGrid };