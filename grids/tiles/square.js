import { BaseGrid } from '../base.js';

class SquareGrid1 extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.boundary = 2;
        this.baseCellSize = 60;
    }

    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision highp float;
                in vec2 aPosition;
                out vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        } else {
            return `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        }
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
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    // Direct world to cell conversion - centered coordinates
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    // Calculate bounds (centered around 0)
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        // Convert to texture coordinates (shift to positive range)
                        vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellValue = texture(uGridTexture, texCoord);

                        if (cellValue.a > 0.5) {
                            outColor = uDrawColor;
                        } else {
                            outColor = uBgColor;
                        }
                    } else {
                        outColor = uBgColor;
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
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellValue = texture2D(uGridTexture, texCoord);

                        if (cellValue.a > 0.5) {
                            gl_FragColor = uDrawColor;
                        } else {
                            gl_FragColor = uBgColor;
                        }
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    worldToCell(world) {
        const size = this.baseCellSize;
        
        // Direct world to cell conversion - centered coordinates
        // World (0,0) maps to cell (0,0)
        const cellX = Math.round(world.x / size);
        const cellY = Math.round(world.y / size);
        
        // Convert to cube coordinates with s = 0
        return [cellX, cellY, 0];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridCols: gl.getUniformLocation(program, 'uGridCols'),
            gridRows: gl.getUniformLocation(program, 'uGridRows'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.baseCellSize, this.baseCellSize);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const cellSize = this.baseCellSize || 60;

        for (const [key, state] of cells) {
            if (state) {
                const [q, r, s] = key.split(',').map(Number);
                // Direct world coordinates: cell (q,r) at (q * cellSize, r * cellSize)
                // This automatically centers the grid since (0,0) is at center
                const worldX = q * cellSize;
                const worldY = r * cellSize;
                ctx.fillRect(worldX, -worldY, cellSize, cellSize);
            }
        }
    }

    // Cube coordinate to texture coordinate conversion
    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        // (-gridCols/2, -gridRows/2) maps to (0,0)
        // (gridCols/2-1, gridRows/2-1) maps to (gridCols-1, gridRows-1)
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);
        
        const texX = q - minQ;
        const texY = r - minR;
        
        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
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

            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            const pixelData = new Uint8Array([
                this.textureData[index],
                this.textureData[index + 1],
                this.textureData[index + 2],
                this.textureData[index + 3]
            ]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            
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

    resizeGridTexture(gl, newCols, newRows, oldCells) {
        this.initGridTexture(gl, newCols, newRows);

        if (oldCells) {
            for (const [key, state] of oldCells) {
                const [q, r, s] = key.split(',').map(Number);
                this.setCellState(gl, q, r, s, state);
                
            }
        }
    }

    clearGrid(gl) {
        // Clear texture data
        for (let i = 0; i < this.textureData.length; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }
        
        // Update GPU texture
        if (gl && this.gridTexture) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.gridCols, this.gridRows, 
                            gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    getCellIndexFromWorld(world, q, r, s) {
        return 1; // Square grid only has one state per cell
    }
}

class SquareGrid2 extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.boundary = 1;
        this.baseCellSize = 60;
    }

    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision highp float;
                in vec2 aPosition;
                out vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        } else {
            return `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        }
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
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    // Direct world to cell conversion - centered coordinates
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    // Calculate bounds (centered around 0)
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    // Calculate position within the cell (0 to 1 range)
                    vec2 cellLocalPos = fract(worldPos / uBaseCellSize + 0.5);
                    
                    // Check if we're near the boundary (using boundary size of 2 pixels in world space)
                    float boundarySize = 0.5 / uBaseCellSize;
                    bool isBoundary = cellLocalPos.x < boundarySize || cellLocalPos.x > (1.0 - boundarySize) ||
                                     cellLocalPos.y < boundarySize || cellLocalPos.y > (1.0 - boundarySize);

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        // Convert to texture coordinates (shift to positive range)
                        vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellValue = texture(uGridTexture, texCoord);

                        if (cellValue.a > 0.5) {
                            if (isBoundary) {
                                // Draw grey boundary for active cells
                                outColor = vec4(0.5, 0.5, 0.5, 1.0);
                            } else {
                                outColor = uDrawColor;
                            }
                        } else {
                            if (isBoundary) {
                                // Draw grey boundary for inactive cells too
                                outColor = vec4(0.3, 0.3, 0.3, 1.0);
                            } else {
                                outColor = uBgColor;
                            }
                        }
                    } else {
                        outColor = uBgColor;
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
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    // Calculate position within the cell (0 to 1 range)
                    vec2 cellLocalPos = fract(worldPos / uBaseCellSize + 0.5);
                    
                    // Check if we're near the boundary (using boundary size of 2 pixels in world space)
                    float boundarySize = 0.5 / uBaseCellSize;
                    bool isBoundary = cellLocalPos.x < boundarySize || cellLocalPos.x > (1.0 - boundarySize) ||
                                     cellLocalPos.y < boundarySize || cellLocalPos.y > (1.0 - boundarySize);

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        vec2 texCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellValue = texture2D(uGridTexture, texCoord);

                        if (cellValue.a > 0.5) {
                            if (isBoundary) {
                                // Draw grey boundary for active cells
                                gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
                            } else {
                                gl_FragColor = uDrawColor;
                            }
                        } else {
                            if (isBoundary) {
                                // Draw grey boundary for inactive cells too
                                gl_FragColor = vec4(0.3, 0.3, 0.3, 1.0);
                            } else {
                                gl_FragColor = uBgColor;
                            }
                        }
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    worldToCell(world) {
        const size = this.baseCellSize;
        
        // Direct world to cell conversion - centered coordinates
        // World (0,0) maps to cell (0,0)
        const cellX = Math.round(world.x / size);
        const cellY = Math.round(world.y / size);
        
        // Convert to cube coordinates with s = 0
        return [cellX, cellY, 0];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridCols: gl.getUniformLocation(program, 'uGridCols'),
            gridRows: gl.getUniformLocation(program, 'uGridRows'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.baseCellSize, this.baseCellSize);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const cellSize = this.baseCellSize || 60;

        for (const [key, state] of cells) {
            if (state) {
                const [q, r, s] = key.split(',').map(Number);
                // Direct world coordinates: cell (q,r) at (q * cellSize, r * cellSize)
                // This automatically centers the grid since (0,0) is at center
                const worldX = q * cellSize;
                const worldY = r * cellSize;
                
                // Draw cell with boundary
                ctx.fillStyle = this.colorSchema[state] || '#ffffff';
                ctx.fillRect(worldX, -worldY, cellSize, cellSize);
                
                // Draw grey boundary
                ctx.strokeStyle = 'rgba(128, 128, 128, 1.0)';
                ctx.lineWidth = 2;
                ctx.strokeRect(worldX, -worldY, cellSize, cellSize);
            }
        }
    }

    // Cube coordinate to texture coordinate conversion
    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        // (-gridCols/2, -gridRows/2) maps to (0,0)
        // (gridCols/2-1, gridRows/2-1) maps to (gridCols-1, gridRows-1)
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);
        
        const texX = q - minQ;
        const texY = r - minR;
        
        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
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

            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            const pixelData = new Uint8Array([
                this.textureData[index],
                this.textureData[index + 1],
                this.textureData[index + 2],
                this.textureData[index + 3]
            ]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            
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

    resizeGridTexture(gl, newCols, newRows, oldCells) {
        this.initGridTexture(gl, newCols, newRows);

        if (oldCells) {
            for (const [key, state] of oldCells) {
                const [q, r, s] = key.split(',').map(Number);
                this.setCellState(gl, q, r, s, state);
            }
        }
    }

    clearGrid(gl) {
        // Clear texture data
        for (let i = 0; i < this.textureData.length; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }
        
        // Update GPU texture
        if (gl && this.gridTexture) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.gridCols, this.gridRows, 
                            gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    getCellIndexFromWorld(world, q, r, s) {
        return 1; // Square grid only has one state per cell
    }
}

class SquareGrid3 extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.baseCellSize = 60;
        this.boundaryColor = [0.5, 0.5, 0.5, 0]; // Grey boundary
        this.cellTextureSize = 1; // Small texture representing one cell (8x8 pixels)
        this.boundaryWidth = 0.0125; // 1 pixel boundary in the cell texture
    }

    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision highp float;
                in vec2 aPosition;
                out vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        } else {
            return `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        }
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
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                uniform float uCellTextureSize;
                uniform float uBoundaryWidth;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    // Direct world to cell conversion - centered coordinates
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    // Calculate bounds (centered around 0)
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    // Calculate position within the cell (0 to 1 range)
                    vec2 cellLocalPos = fract(worldPos / uBaseCellSize + 0.5);

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        // Convert to texture coordinates for the grid
                        vec2 gridTexCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellState = texture(uGridTexture, gridTexCoord);

                        // Calculate position within cell texture
                        vec2 cellTexCoord = fract(cellLocalPos * uCellTextureSize);
                        
                        // Check if we're in the boundary region
                        bool isBoundary = cellTexCoord.x < (uBoundaryWidth / uCellTextureSize) || 
                                         cellTexCoord.x > (1.0 - uBoundaryWidth / uCellTextureSize) ||
                                         cellTexCoord.y < (uBoundaryWidth / uCellTextureSize) || 
                                         cellTexCoord.y > (1.0 - uBoundaryWidth / uCellTextureSize);

                        if (cellState.a > 0.5) {
                            // Active cell
                            if (isBoundary) {
                                outColor = vec4(0.5, 0.5, 0.5, 0.0); // Grey boundary
                            } else {
                                outColor = cellState; // Cell interior color
                            }
                        } else {
                            // Inactive cell
                            if (isBoundary) {
                                outColor = vec4(0.5, 0.5, 0.5, 0.0); // Darker grey boundary
                            } else {
                                outColor = uBgColor; // Transparent interior
                            }
                        }
                    } else {
                        outColor = uBgColor;
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
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                uniform float uCellTextureSize;
                uniform float uBoundaryWidth;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    vec2 cellLocalPos = fract(worldPos / uBaseCellSize + 0.5);

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        vec2 gridTexCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellState = texture2D(uGridTexture, gridTexCoord);

                        vec2 cellTexCoord = fract(cellLocalPos * uCellTextureSize);
                        
                        bool isBoundary = cellTexCoord.x < (uBoundaryWidth / uCellTextureSize) || 
                                         cellTexCoord.x > (1.0 - uBoundaryWidth / uCellTextureSize) ||
                                         cellTexCoord.y < (uBoundaryWidth / uCellTextureSize) || 
                                         cellTexCoord.y > (1.0 - uBoundaryWidth / uCellTextureSize);

                        if (cellState.a > 0.5) {
                            if (isBoundary) {
                                gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
                            } else {
                                gl_FragColor = cellState;
                            }
                        } else {
                            if (isBoundary) {
                                gl_FragColor = vec4(0.3, 0.3, 0.3, 1.0);
                            } else {
                                gl_FragColor = uBgColor;
                            }
                        }
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    worldToCell(world) {
        const size = this.baseCellSize;

        // Direct world to cell conversion - centered coordinates
        // World (0,0) maps to cell (0,0)
        const cellX = Math.round(world.x / size);
        const cellY = Math.round(world.y / size);

        // Convert to cube coordinates with s = 0
        return [cellX, cellY, 0];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridCols: gl.getUniformLocation(program, 'uGridCols'),
            gridRows: gl.getUniformLocation(program, 'uGridRows'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture'),
            cellTextureSize: gl.getUniformLocation(program, 'uCellTextureSize'),
            boundaryWidth: gl.getUniformLocation(program, 'uBoundaryWidth')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.baseCellSize, this.baseCellSize);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);
        gl.uniform1f(uniformLocations.cellTextureSize, this.cellTextureSize);
        gl.uniform1f(uniformLocations.boundaryWidth, this.boundaryWidth);

        return uniformLocations;
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const cellSize = this.baseCellSize || 60;

        for (const [key, state] of cells) {
            if (state) {
                const [q, r, s] = key.split(',').map(Number);
                // Direct world coordinates: cell (q,r) at (q * cellSize, r * cellSize)
                const worldX = q * cellSize;
                const worldY = r * cellSize;
                
                // Draw cell with integrated boundary
                const color = this.colorSchema[state] || '#ffffff';
                
                // Main cell fill
                ctx.fillStyle = color;
                ctx.fillRect(worldX, -worldY, cellSize, cellSize);
                
                // Integrated boundary - draw as part of the cell
                ctx.strokeStyle = 'rgba(128, 128, 128, 1.0)';
                ctx.lineWidth = 2;
                ctx.strokeRect(worldX, -worldY, cellSize, cellSize);
            }
        }
    }

    // Cube coordinate to texture coordinate conversion
    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);
        
        const texX = q - minQ;
        const texY = r - minR;
        
        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX >= 0 && texX < this.gridCols && texY >= 0 && texY < this.gridRows) {
            const index = (texY * this.gridCols + texX) * 4;

            if (state) {
                const color = this.colorSchema[state] || [1, 1, 1, 1];
                // Store the cell color - boundary will be handled in shader
                this.textureData[index] = color[0] * 255;
                this.textureData[index + 1] = color[1] * 255;
                this.textureData[index + 2] = color[2] * 255;
                this.textureData[index + 3] = 255; // Full opacity for active cells
            } else {
                // For inactive cells, store transparent
                this.textureData[index] = 0;
                this.textureData[index + 1] = 0;
                this.textureData[index + 2] = 0;
                this.textureData[index + 3] = 0;
            }

            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            const pixelData = new Uint8Array([
                this.textureData[index],
                this.textureData[index + 1],
                this.textureData[index + 2],
                this.textureData[index + 3]
            ]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            
            return true;
        }
        return false;
    }

    initGridTexture(gl, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.textureData = new Uint8Array(gridCols * gridRows * 4);

        // Initialize texture with all cells inactive (transparent)
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

    resizeGridTexture(gl, newCols, newRows, oldCells) {
        this.initGridTexture(gl, newCols, newRows);

        if (oldCells) {
            for (const [key, state] of oldCells) {
                const [q, r, s] = key.split(',').map(Number);
                this.setCellState(gl, q, r, s, state);
            }
        }
    }

    clearGrid(gl) {
        // Clear texture data
        for (let i = 0; i < this.textureData.length; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }

        // Update GPU texture
        if (gl && this.gridTexture) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.gridCols, this.gridRows, 
                            gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    getCellIndexFromWorld(world, q, r, s) {
        return 1; // Square grid only has one state per cell
    }
}

class SquareGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "square");
        this.baseCellSize = 60;
        this.cellSize = 60; // Slightly smaller than baseCellSize to create boundary
        this.boundarySize = (this.baseCellSize - this.cellSize) / 2; // 1 pixel boundary on each side
    }

    getVertexShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision highp float;
                in vec2 aPosition;
                out vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        } else {
            return `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;

                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
        }
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
                uniform float uCellSize;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    // Direct world to cell conversion - centered coordinates
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    // Calculate bounds (centered around 0)
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    // Calculate position within the cell (0 to 1 range)
                    vec2 cellLocalPos = fract(worldPos / uBaseCellSize + 0.5);

                    // Check if we're in the boundary region
                    float boundaryStart = (uBaseCellSize - uCellSize) / (2.0 * uBaseCellSize);
                    float boundaryEnd = 1.0 - boundaryStart;
                    bool isBoundary = cellLocalPos.x < boundaryStart || cellLocalPos.x > boundaryEnd ||
                                     cellLocalPos.y < boundaryStart || cellLocalPos.y > boundaryEnd;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        // Convert to texture coordinates for the grid
                        vec2 gridTexCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellState = texture(uGridTexture, gridTexCoord);

                        if (cellState.a > 0.5 && !isBoundary) {
                            // Active cell interior
                            outColor = cellState;
                        } else {
                            // Boundary or inactive cell - show background
                            outColor = uBgColor;
                        }
                    } else {
                        outColor = uBgColor;
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
                uniform float uCellSize;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;
                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    vec2 cellCoord = floor(worldPos / uBaseCellSize + 0.5);
                    
                    float minQ = -float(uGridCols) * 0.5;
                    float maxQ = float(uGridCols) * 0.5 - 1.0;
                    float minR = -float(uGridRows) * 0.5;
                    float maxR = float(uGridRows) * 0.5 - 1.0;

                    vec2 cellLocalPos = fract(worldPos / uBaseCellSize + 0.5);

                    float boundaryStart = (uBaseCellSize - uCellSize) / (2.0 * uBaseCellSize);
                    float boundaryEnd = 1.0 - boundaryStart;
                    bool isBoundary = cellLocalPos.x < boundaryStart || cellLocalPos.x > boundaryEnd ||
                                     cellLocalPos.y < boundaryStart || cellLocalPos.y > boundaryEnd;

                    if (cellCoord.x >= minQ && cellCoord.x <= maxQ && 
                        cellCoord.y >= minR && cellCoord.y <= maxR) {
                        
                        vec2 gridTexCoord = (cellCoord - vec2(minQ, minR)) / vec2(uGridCols, uGridRows);
                        vec4 cellState = texture2D(uGridTexture, gridTexCoord);

                        if (cellState.a > 0.5 && !isBoundary) {
                            gl_FragColor = cellState;
                        } else {
                            gl_FragColor = uBgColor;
                        }
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    worldToCell(world) {
        const size = this.baseCellSize;

        // Direct world to cell conversion - centered coordinates
        // World (0,0) maps to cell (0,0)
        const cellX = Math.round(world.x / size);
        const cellY = Math.round(world.y / size);

        // Convert to cube coordinates with s = 0
        return [cellX, cellY, 0];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const size = this.baseCellSize;

        // Calculate visible cell range in centered coordinates
        const minQ = Math.floor(minX / size) - 1;
        const maxQ = Math.ceil(maxX / size) + 1;
        const minR = Math.floor(minY / size) - 1;
        const maxR = Math.ceil(maxY / size) + 1;

        return [minQ, maxQ, minR, maxR];
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridCols: gl.getUniformLocation(program, 'uGridCols'),
            gridRows: gl.getUniformLocation(program, 'uGridRows'),
            baseCellSize: gl.getUniformLocation(program, 'uBaseCellSize'),
            cellSize: gl.getUniformLocation(program, 'uCellSize'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridCols, this.gridCols);
        gl.uniform1f(uniformLocations.gridRows, this.gridRows);
        gl.uniform1f(uniformLocations.baseCellSize, this.baseCellSize);
        gl.uniform1f(uniformLocations.cellSize, this.cellSize);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
    }

    drawCanvasCells(ctx, cells) {
        this.rendererUsed = "canvas2d";
        const cellSize = this.cellSize;
        const boundaryOffset = this.boundarySize;

        for (const [key, state] of cells) {
            if (state) {
                const [q, r, s] = key.split(',').map(Number);
                // Direct world coordinates: cell (q,r) at (q * baseCellSize, r * baseCellSize)
                const worldX = q * this.baseCellSize;
                const worldY = r * this.baseCellSize;
                
                // Draw cell with boundary (smaller cell inside larger base cell)
                const color = this.colorSchema[state] || '#ffffff';
                
                // Main cell fill (offset by boundary size)
                ctx.fillStyle = color;
                ctx.fillRect(
                    worldX + boundaryOffset, 
                    -worldY + boundaryOffset, 
                    cellSize, 
                    cellSize
                );
                
                // The boundary is automatically created by the background showing through
                // around the smaller cell
            }
        }
    }

    // Cube coordinate to texture coordinate conversion
    cubeToTextureCoords(q, r, s) {
        // Convert centered coordinates to texture coordinates
        const minQ = -Math.floor(this.gridCols / 2);
        const minR = -Math.floor(this.gridRows / 2);
        
        const texX = q - minQ;
        const texY = r - minR;
        
        return [Math.floor(texX), Math.floor(texY)];
    }

    setCellState(gl, q, r, s, state) {
        const [texX, texY] = this.cubeToTextureCoords(q, r, s);

        if (texX >= 0 && texX < this.gridCols && texY >= 0 && texY < this.gridRows) {
            const index = (texY * this.gridCols + texX) * 4;

            if (state) {
                const color = this.colorSchema[state] || [1, 1, 1, 1];
                // Store the cell color
                this.textureData[index] = color[0] * 255;
                this.textureData[index + 1] = color[1] * 255;
                this.textureData[index + 2] = color[2] * 255;
                this.textureData[index + 3] = 255; // Full opacity for active cells
            } else {
                // For inactive cells, store transparent
                this.textureData[index] = 0;
                this.textureData[index + 1] = 0;
                this.textureData[index + 2] = 0;
                this.textureData[index + 3] = 0;
            }

            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            const pixelData = new Uint8Array([
                this.textureData[index],
                this.textureData[index + 1],
                this.textureData[index + 2],
                this.textureData[index + 3]
            ]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
            
            return true;
        }
        return false;
    }

    initGridTexture(gl, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.textureData = new Uint8Array(gridCols * gridRows * 4);

        // Initialize texture with all cells inactive (transparent)
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

    resizeGridTexture(gl, newCols, newRows, oldCells) {
        this.initGridTexture(gl, newCols, newRows);

        if (oldCells) {
            for (const [key, state] of oldCells) {
                const [q, r, s] = key.split(',').map(Number);
                this.setCellState(gl, q, r, s, state);
            }
        }
    }

    clearGrid(gl) {
        // Clear texture data
        for (let i = 0; i < this.textureData.length; i += 4) {
            this.textureData[i] = 0;
            this.textureData[i + 1] = 0;
            this.textureData[i + 2] = 0;
            this.textureData[i + 3] = 0;
        }

        // Update GPU texture
        if (gl && this.gridTexture) {
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.gridCols, this.gridRows, 
                            gl.RGBA, gl.UNSIGNED_BYTE, this.textureData);
        }
    }

    getCellIndexFromWorld(world, q, r, s) {
        return 1; // Square grid only has one state per cell
    }
}

export { SquareGrid };