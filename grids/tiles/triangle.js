import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.baseCellSize = 60;
        this.height = this.baseCellSize * Math.sqrt(3) / 2;
        this.rowMult = 2;
        this.colMult = 1;
    }

    getFragmentShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision mediump float;
                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridCols;
                uniform float uGridRows;
                uniform float uBaseCellSize;
                uniform sampler2D uGridTexture;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    // Convert world to square cell coordinates
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    float q = cellCoord.x;
                    float r = cellCoord.y;
                    
                    // Calculate bounds (centered around 0)
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    if (q >= minQ && q <= maxQ && r >= minR && r <= maxR) {
                        // Determine which triangle within the square
                        vec2 localPos = fract(worldPos / uBaseCellSize + 0.5) - 0.5;
                        bool isRightTriangle = localPos.x > -localPos.y; // Right triangle (s=1)
                        
                        // s = 0 for left triangle, s = 1 for right triangle
                        float s = isRightTriangle ? 1.0 : 0.0;
                        
                        // Convert to texture coordinates - pack q, r, s into 2D texture
                        // Use different texture rows for left (s=0) vs right (s=1) triangles
                        float texX = (q - minQ) / uGridCols;
                        float texY = ((r - minR) + (s * uGridRows)) / (uGridRows * 2.0);
                        
                        vec4 cellColor = texture(uGridTexture, vec2(texX, texY));
                        
                        // Always use the color from texture, regardless of alpha
                        outColor = cellColor;
                    } else {
                        // Outside grid bounds - use transparent
                        outColor = vec4(0.0);
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
                uniform float uBaseCellSize;
                uniform sampler2D uGridTexture;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    float q = cellCoord.x;
                    float r = cellCoord.y;
                    
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    if (q >= minQ && q <= maxQ && r >= minR && r <= maxR) {
                        vec2 localPos = fract(worldPos / uBaseCellSize + 0.5) - 0.5;
                        bool isRightTriangle = localPos.x > -localPos.y;
                        
                        float s = isRightTriangle ? 1.0 : 0.0;
                        
                        float texX = (q - minQ) / uGridCols;
                        float texY = ((r - minR) + (s * uGridRows)) / (uGridRows * 2.0);
                        
                        vec4 cellColor = texture2D(uGridTexture, vec2(texX, texY));
                        
                        // Always use the color from texture
                        gl_FragColor = cellColor;
                    } else {
                        // Outside grid bounds - use transparent
                        gl_FragColor = vec4(0.0);
                    }
                }
            `;
        }
    }

    worldToCell(world) {
        const size = this.baseCellSize;
        
        // Convert to square cell coordinates
        const q = Math.round(world.x / size);
        const r = Math.round(world.y / size);
        
        // Determine which triangle within the square
        const localX = (world.x / size) - q;
        const localY = (world.y / size) - r;
        
        // s = 0 for left triangle, s = 1 for right triangle
        // Using diagonal from top-left to bottom-right
        const s = localX > -localY ? 1 : 0; // Right triangle if above the diagonal
        
        return [q, r, s];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible square cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    setupUniforms(gl, program, cameraView, geometry, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridCols: gl.getUniformLocation(program, 'uGridCols'),
            gridRows: gl.getUniformLocation(program, 'uGridRows'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.baseCellSize, this.baseCellSize);

        return uniformLocations;
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const cellSize = this.baseCellSize || 60;

        for (const [key, state] of cells) {
            if (state) {
                const [q, r, s] = key.split(',').map(Number);
                const worldX = q * cellSize;
                const worldY = -r * cellSize;

                // Use color schema based on state value
                const drawColor = this.colorSchema[state] ||  [1, 1, 1, 1];
                ctx.fillStyle = `rgba(
                    ${Math.round(drawColor[0] * 255)},
                    ${Math.round(drawColor[1] * 255)},
                    ${Math.round(drawColor[2] * 255)},
                    ${drawColor[3]}
                )`;

                // Draw the appropriate triangle based on s coordinate
                ctx.beginPath();
                if (s === 0) {
                    // Left triangle (s=0) - bottom-left and top-right
                    ctx.moveTo(worldX - cellSize/2, worldY + cellSize/2); // bottom-left
                    ctx.lineTo(worldX - cellSize/2, worldY - cellSize/2); // top-left  
                    ctx.lineTo(worldX + cellSize/2, worldY + cellSize/2); // bottom-right
                } else {
                    // Right triangle (s=1) - top-left and top-right
                    ctx.moveTo(worldX - cellSize/2, worldY - cellSize/2); // top-left
                    ctx.lineTo(worldX + cellSize/2, worldY - cellSize/2); // top-right
                    ctx.lineTo(worldX + cellSize/2, worldY + cellSize/2); // bottom-right
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);
        
        // Use different texture rows for left (s=0) vs right (s=1) triangles
        const texX = q - minQ;
        const texY = (r - minR) + (s * this.gridRows); // s=0: rows 0-gridRows-1, s=1: rows gridRows-2*gridRows-1
        
        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);
        const textureWidth = this.gridCols;
        const textureHeight = this.gridRows * 2; // Double height for left + right triangles
        
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
}

export { TriangleGrid };
