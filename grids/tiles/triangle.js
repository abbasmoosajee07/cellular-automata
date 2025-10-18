import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.baseCellSize = 60;
        this.height = this.baseCellSize * Math.sqrt(3) / 2;
        this.rowMult = 2;
        this.colMult = 1;
    }

    worldToCell(world) {
        const size = this.baseCellSize;

        // Convert world coordinates to match the triangle drawing positions
        const q = Math.floor(world.x / size);
        const r = Math.floor(world.y / size);

        // Get position within the current square cell
        const localX = (world.x - q * size) / size;
        const localY = (world.y - r * size) / size;

        // Determine which triangle based on the diagonal
        const s = localY < localX ? 1 : 0;
        return [q, r, s];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible square cell range
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);
        const minCol = -centerCol - 1;
        const minRow = -centerRow - 1;

        // Use different texture rows for different triangle types
        const texX = q - minCol;
        const texY = (r - minRow) + (s * (this.gridRows + 2));

        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);
        const textureWidth = this.gridCols + 2; // +2 for boundaries
        const textureHeight = (this.gridRows + 2) * 2; // Double height for both triangle types
        
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
                    
                    // Convert world to cell coordinates - match the drawing logic
                    float cellSize = uBaseCellSize;
                    float col = floor(worldPos.x / cellSize);
                    float row = floor(worldPos.y / cellSize);
                    
                    // Get position within cell
                    float localX = (worldPos.x - col * cellSize) / cellSize;
                    float localY = (worldPos.y - row * cellSize) / cellSize;
                    
                    // Determine triangle type - match the drawing logic
                    float s = localY < localX ? 1.0 : 0.0;
                    
                    // Calculate bounds (centered around 0)
                    float centerCol = float(uGridCols) * 0.5;
                    float centerRow = float(uGridRows) * 0.5;
                    float minCol = -centerCol - 1.0;
                    float maxCol = centerCol;
                    float minRow = -centerRow - 1.0;
                    float maxRow = centerRow;

                    if (col >= minCol && col <= maxCol && row >= minRow && row <= maxRow) {
                        // Convert to texture coordinates
                        float texMinCol = -centerCol - 1.0;
                        float texMinRow = -centerRow - 1.0;
                        
                        float texX = (col - texMinCol);
                        float texY = (row - texMinRow) + (s * (uGridRows + 2.0));
                        
                        // Normalize texture coordinates
                        float texCoordX = texX / (uGridCols + 2.0);
                        float texCoordY = texY / ((uGridRows + 2.0) * 2.0);
                        
                        vec4 cellColor = texture(uGridTexture, vec2(texCoordX, texCoordY));
                        outColor = cellColor;
                    } else {
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
                    
                    float cellSize = uBaseCellSize;
                    float col = floor(worldPos.x / cellSize);
                    float row = floor(worldPos.y / cellSize);
                    
                    float localX = (worldPos.x - col * cellSize) / cellSize;
                    float localY = (worldPos.y - row * cellSize) / cellSize;
                    
                    float s = localY < localX ? 1.0 : 0.0;
                    
                    float centerCol = float(uGridCols) * 0.5;
                    float centerRow = float(uGridRows) * 0.5;
                    float minCol = -centerCol - 1.0;
                    float maxCol = centerCol;
                    float minRow = -centerRow - 1.0;
                    float maxRow = centerRow;

                    if (col >= minCol && col <= maxCol && row >= minRow && row <= maxRow) {
                        float texMinCol = -centerCol - 1.0;
                        float texMinRow = -centerRow - 1.0;
                        
                        float texX = (col - texMinCol);
                        float texY = (row - texMinRow) + (s * (uGridRows + 2.0));
                        
                        float texCoordX = texX / (uGridCols + 2.0);
                        float texCoordY = texY / ((uGridRows + 2.0) * 2.0);
                        
                        vec4 cellColor = texture2D(uGridTexture, vec2(texCoordX, texCoordY));
                        gl_FragColor = cellColor;
                    } else {
                        gl_FragColor = vec4(0.0);
                    }
                }
            `;
        }
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
                    // s=0 → below the diagonal (left triangle)
                    // Match worldToCell(): "below diagonal" = bottom-left region
                    ctx.moveTo(worldX, worldY);                        // top-left
                    ctx.lineTo(worldX, worldY - cellSize);             // bottom-left
                    ctx.lineTo(worldX + cellSize, worldY - cellSize);  // bottom-right
                } else {
                    // s=1 → above the diagonal (right triangle)
                    // Match worldToCell(): "above diagonal" = top-right region
                    ctx.moveTo(worldX, worldY);                        // top-left
                    ctx.lineTo(worldX + cellSize, worldY);             // top-right
                    ctx.lineTo(worldX + cellSize, worldY - cellSize);  // bottom-right
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

export { TriangleGrid };
