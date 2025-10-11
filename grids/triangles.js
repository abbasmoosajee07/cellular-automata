import { BaseGrid } from './base.js';

class TriangleGrid0 extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.sideLength = 60;
        this.height = this.sideLength * Math.sqrt(3) / 2;
        this.baseCellSize = this.sideLength;
        this.usesTriIndex = false;

        this.bindMethods();
    }

    bindMethods() {
        const methods = ['pickTriangle'];
        methods.forEach(method => {
            if (this[method]) this[method] = this[method].bind(this);
        });
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
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                in vec2 vTexCoord;
                out vec4 outColor;

                bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
                    vec2 v0 = b - a;
                    vec2 v1 = c - a;
                    vec2 v2 = p - a;

                    float d00 = dot(v0, v0);
                    float d01 = dot(v0, v1);
                    float d11 = dot(v1, v1);
                    float d20 = dot(v2, v0);
                    float d21 = dot(v2, v1);

                    float denom = d00 * d11 - d01 * d01;
                    float v = (d11 * d20 - d01 * d21) / denom;
                    float w = (d00 * d21 - d01 * d20) / denom;
                    float u = 1.0 - v - w;

                    return (u >= -0.001 && v >= -0.001 && w >= -0.001);
                }

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    worldPos += vec2(0.0001, 0.0001);

                    float s = uSideLength;
                    float h = uHeight;

                    float row = floor(worldPos.y / h);
                    float col = floor((worldPos.x - mod(row, 2.0) * s * 0.5) / s);

                    float localX = worldPos.x - col * s - mod(row, 2.0) * s * 0.5;
                    float localY = worldPos.y - row * h;

                    bool isUpTriangle = mod(row + col, 2.0) == 0.0;
                    vec2 p = vec2(localX, localY);
                    bool inTriangle;

                    if (isUpTriangle) {
                        vec2 a = vec2(0.0, 0.0);
                        vec2 b = vec2(s, 0.0);
                        vec2 c = vec2(s * 0.5, h);
                        inTriangle = pointInTriangle(p, a, b, c);
                    } else {
                        vec2 a = vec2(0.0, h);
                        vec2 b = vec2(s, h);
                        vec2 c = vec2(s * 0.5, 0.0);
                        inTriangle = pointInTriangle(p, a, b, c);
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        outColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2((col + 0.5) / uGridSize, (row + 0.5) / uGridSize);
                    vec4 cellValue = texture(uGridTexture, texCoord);
                    outColor = (cellValue.a > 0.1) ? uDrawColor : uBgColor;
                }
            `;
        } else {
            return `
                precision mediump float;

                uniform vec2 uResolution;
                uniform vec2 uOffset;
                uniform float uScale;
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                varying vec2 vTexCoord;

                bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
                    vec2 v0 = b - a;
                    vec2 v1 = c - a;
                    vec2 v2 = p - a;

                    float d00 = dot(v0, v0);
                    float d01 = dot(v0, v1);
                    float d11 = dot(v1, v1);
                    float d20 = dot(v2, v0);
                    float d21 = dot(v2, v1);

                    float denom = d00 * d11 - d01 * d01;
                    float v = (d11 * d20 - d01 * d21) / denom;
                    float w = (d00 * d21 - d01 * d20) / denom;
                    float u = 1.0 - v - w;

                    return (u >= -0.001 && v >= -0.001 && w >= -0.001);
                }

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    worldPos += vec2(0.0001, 0.0001);

                    float s = uSideLength;
                    float h = uHeight;

                    float row = floor(worldPos.y / h);
                    float col = floor((worldPos.x - mod(row, 2.0) * s * 0.5) / s);

                    float localX = worldPos.x - col * s - mod(row, 2.0) * s * 0.5;
                    float localY = worldPos.y - row * h;

                    bool isUpTriangle = mod(row + col, 2.0) == 0.0;
                    vec2 p = vec2(localX, localY);
                    bool inTriangle;

                    if (isUpTriangle) {
                        vec2 a = vec2(0.0, 0.0);
                        vec2 b = vec2(s, 0.0);
                        vec2 c = vec2(s * 0.5, h);
                        inTriangle = pointInTriangle(p, a, b, c);
                    } else {
                        vec2 a = vec2(0.0, h);
                        vec2 b = vec2(s, h);
                        vec2 c = vec2(s * 0.5, 0.0);
                        inTriangle = pointInTriangle(p, a, b, c);
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        gl_FragColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2((col + 0.5) / uGridSize, (row + 0.5) / uGridSize);
                    vec4 cellValue = texture2D(uGridTexture, texCoord);
                    gl_FragColor = (cellValue.a > 0.1) ? uDrawColor : uBgColor;
                }
            `;
        }
    }

    worldToCell(world) {
        const s = this.sideLength;
        const h = this.height;

        const row = Math.floor(world.y / h);
        const col = Math.floor((world.x - (row % 2) * s * 0.5) / s);

        const localX = world.x - col * s - (row % 2) * s * 0.5;
        const localY = world.y - row * h;

        const isUpTriangle = (row + col) % 2 === 0;
        let inTriangle = false;

        if (isUpTriangle) {
            inTriangle = this.pointInTriangle(
                { x: localX, y: localY },
                { x: 0, y: 0 },
                { x: s, y: 0 },
                { x: s * 0.5, y: h }
            );
        } else {
            inTriangle = this.pointInTriangle(
                { x: localX, y: localY },
                { x: 0, y: h },
                { x: s, y: h },
                { x: s * 0.5, y: 0 }
            );
        }

        if (!inTriangle || row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return [-1, -1];
        }

        return [col, row];
    }

    pointInTriangle(p, a, b, c) {
        const v0 = { x: b.x - a.x, y: b.y - a.y };
        const v1 = { x: c.x - a.x, y: c.y - a.y };
        const v2 = { x: p.x - a.x, y: p.y - a.y };

        const d00 = v0.x * v0.x + v0.y * v0.y;
        const d01 = v0.x * v1.x + v0.y * v1.y;
        const d11 = v1.x * v1.x + v1.y * v1.y;
        const d20 = v2.x * v0.x + v2.y * v0.y;
        const d21 = v2.x * v1.x + v2.y * v1.y;

        const denom = d00 * d11 - d01 * d01;
        const v = (d11 * d20 - d01 * d21) / denom;
        const w = (d00 * d21 - d01 * d20) / denom;
        const u = 1 - v - w;

        return (u >= -0.001 && v >= -0.001 && w >= -0.001);
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridSize: gl.getUniformLocation(program, 'uGridSize'),
            sideLength: gl.getUniformLocation(program, 'uSideLength'),
            height: gl.getUniformLocation(program, 'uHeight'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, -cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.sideLength, geometry.baseCellSize);
        gl.uniform1f(uniformLocations.height, geometry.baseCellSize * Math.sqrt(3) / 2);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
        gl.uniform1i(uniformLocations.gridTexture, 0);

        return uniformLocations;
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const s = this.sideLength;
        const h = this.height;

        const minCol = Math.floor(minX / s) - 1;
        const maxCol = Math.ceil(maxX / s) + 1;
        const minRow = Math.floor(minY / h) - 1;
        const maxRow = Math.ceil(maxY / h) + 1;

        return [minCol, maxCol, minRow, maxRow];
    }

    pickTriangle(x, y) {
        const world = this.screenToWorld(x, y, window.innerWidth, window.innerHeight, { camX: 0, camY: 0, zoom: 1 });
        const cell = this.worldToCell(world);
        if (cell[0] !== -1 && cell[1] !== -1) {
            return { col: cell[0], row: cell[1] };
        }
        return null;
    }

    drawCanvasCells(ctx, cells) {
        const cellSize = this.baseCellSize || 60;
        const height = cellSize * Math.sqrt(3) / 2;

        for (const [col, colMap] of cells) {
            for (const [row, state] of colMap) {
                if (state) {
                    const x = col * (cellSize / 2);
                    const y = row * height;
                    const orientation = (col + row) % 2;
                    this.drawEquilateralTriangle(ctx, x, -y, cellSize, orientation);
                }
            }
        }
    }

    drawEquilateralTriangle(ctx, x, y, size, orientation) {
        const height = size * Math.sqrt(3) / 2;
        ctx.beginPath();
        if (orientation === 0) {
            ctx.moveTo(x, y + height);
            ctx.lineTo(x + size / 2, y);
            ctx.lineTo(x + size, y + height);
        } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size / 2, y + height);
            ctx.lineTo(x + size, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.radius = 30;
        this.baseCellSize = 60;
        this.sideLength = this.baseCellSize;
        this.height = this.sideLength * Math.sqrt(3) / 2; // Equilateral triangle height
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
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    float s = uSideLength;
                    float h = uHeight;

                    // Match Canvas2D coordinate system but with proper equilateral triangles
                    // Each cell is s wide and h tall
                    float row = floor(worldPos.y / h);
                    float col = floor(worldPos.x / s);
                    
                    // Determine triangle orientation: (col + row) % 2
                    bool isUpTriangle = mod(float(col) + float(row), 2.0) == 0.0;

                    // Local coordinates within the cell
                    float localX = (worldPos.x - col * s);
                    float localY = worldPos.y - row * h;

                    // Equilateral triangle detection - both triangles should fill properly
                    bool inTriangle = false;
                    float halfWidth = s * 0.5;
                    
                    if (isUpTriangle) {
                        // Upward pointing equilateral triangle
                        // Check if point is below the diagonal lines
                        inTriangle = localY >= 0.0 && localY <= h && 
                                    localX >= 0.0 && localX <= s &&
                                    localY <= (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    } else {
                        // Downward pointing equilateral triangle  
                        // Check if point is above the diagonal lines
                        inTriangle = localY >= 0.0 && localY <= h && 
                                    localX >= 0.0 && localX <= s &&
                                    localY >= h - (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    }

                    // Bounds check
                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        outColor = uBgColor;
                        return;
                    }

                    // Sample from texture - both upward and downward triangles use the same texture lookup
                    vec2 texCoord = vec2(col + 0.5, row + 0.5) / vec2(uGridSize, uGridSize);
                    vec4 cellValue = texture(uGridTexture, texCoord);

                    // Render both upward and downward triangles
                    if (cellValue.a > 0.1) {
                        outColor = uDrawColor;
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
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    float s = uSideLength;
                    float h = uHeight;

                    // Match Canvas2D coordinate system but with proper equilateral triangles
                    // Each cell is s wide and h tall
                    float row = floor(worldPos.y / h);
                    float col = floor(worldPos.x / s);
                    
                    // Determine triangle orientation: (col + row) % 2
                    bool isUpTriangle = mod(float(col) + float(row), 2.0) == 0.0;

                    // Local coordinates within the cell
                    float localX = worldPos.x - col * s;
                    float localY = worldPos.y - row * h;

                    // Equilateral triangle detection - both triangles should fill properly
                    bool inTriangle = false;
                    float halfWidth = s * 0.5;
                    
                    if (isUpTriangle) {
                        // Upward pointing equilateral triangle
                        // Check if point is below the diagonal lines
                        inTriangle = localY >= 0.0 && localY <= h && 
                                    localX >= 0.0 && localX <= s &&
                                    localY <= (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    } else {
                        // Downward pointing equilateral triangle  
                        // Check if point is above the diagonal lines
                        inTriangle = localY >= 0.0 && localY <= h && 
                                    localX >= 0.0 && localX <= s &&
                                    localY >= h - (h / halfWidth) * (halfWidth - abs(localX - halfWidth));
                    }

                    // Bounds check
                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        gl_FragColor = uBgColor;
                        return;
                    }

                    // Sample from texture - both upward and downward triangles use the same texture lookup
                    vec2 texCoord = vec2(col + 0.5, row + 0.5) / vec2(uGridSize, uGridSize);
                    vec4 cellValue = texture2D(uGridTexture, texCoord);

                    // Render both upward and downward triangles
                    if (cellValue.a > 0.1) {
                        gl_FragColor = uDrawColor;
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    worldToCell(world) {
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

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const s = this.sideLength;
        const h = this.height;

        const minCol = Math.floor(minX / s) - 1;
        const maxCol = Math.ceil(maxX / s) + 1;
        const minRow = Math.floor(minY / h) - 1;
        const maxRow = Math.ceil(maxY / h) + 1;

        return [minCol, maxCol, minRow, maxRow];
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridSize: gl.getUniformLocation(program, 'uGridSize'),
            sideLength: gl.getUniformLocation(program, 'uSideLength'),
            height: gl.getUniformLocation(program, 'uHeight'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.sideLength, this.sideLength);
        gl.uniform1f(uniformLocations.height, this.height);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
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
                    this.drawEquilateralTriangle(ctx, x, y, cellSize, orientation);
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

}

class TriangleGridc extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.sideLength = 60;
        this.height = this.sideLength * Math.sqrt(3) / 2;
        this.gapSize = 0; // Control both horizontal and vertical gaps
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
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform float uGapSize;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    float s = uSideLength;
                    float h = uHeight;
                    float gap = uGapSize;

                    // Adjust cell spacing for gaps
                    float cellWidth = s + gap;
                    float cellHeight = h + gap * 0.866; // Vertical gap proportional to triangle height

                    // Calculate grid bounds for centering
                    float totalWidth = uGridSize * cellWidth;
                    float totalHeight = uGridSize * cellHeight;
                    float halfWidth = totalWidth * 0.75;
                    float halfHeight = totalHeight * 0.75;

                    // Adjust world position to be relative to grid center
                    vec2 centeredPos = worldPos + vec2(halfWidth, halfHeight);

                    // Calculate grid position with gap spacing
                    float row = floor(centeredPos.y / cellHeight);
                    float col = floor(centeredPos.x / cellWidth);
                    
                    // Determine triangle orientation: (col + row) % 2
                    bool isUpTriangle = mod(float(col) + float(row), 2.0) == 0.0;

                    // Local coordinates within the cell (including gap area)
                    float localX = centeredPos.x - col * cellWidth;
                    float localY = centeredPos.y - row * cellHeight;

                    // Equilateral triangle detection - only draw within the base triangle area
                    bool inTriangle = false;
                    float triangleHalfWidth = s * 0.5;
                    
                    if (isUpTriangle) {
                        // Upward pointing equilateral triangle
                        // Check if point is within the upward triangle bounds
                        inTriangle = localY >= gap * 0.5 && localY <= h + gap * 0.5 && 
                                    localX >= gap * 0.5 && localX <= s + gap * 0.5 &&
                                    localY - gap * 0.5 <= (h / triangleHalfWidth) * (triangleHalfWidth - abs(localX - gap * 0.5 - triangleHalfWidth));
                    } else {
                        // Downward pointing equilateral triangle  
                        // Check if point is within the downward triangle bounds
                        inTriangle = localY >= gap * 0.5 && localY <= h + gap * 0.5 && 
                                    localX >= gap * 0.5 && localX <= s + gap * 0.5 &&
                                    localY - gap * 0.5 >= h - (h / triangleHalfWidth) * (triangleHalfWidth - abs(localX - gap * 0.5 - triangleHalfWidth));
                    }

                    // Bounds check
                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        outColor = uBgColor;
                        return;
                    }

                    // Sample from texture
                    vec2 texCoord = vec2(col + 0.5, row + 0.5) / vec2(uGridSize, uGridSize);
                    vec4 cellValue = texture(uGridTexture, texCoord);

                    if (cellValue.a > 0.1) {
                        outColor = uDrawColor;
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
                uniform float uGridSize;
                uniform float uSideLength;
                uniform float uHeight;
                uniform float uGapSize;
                uniform vec4 uDrawColor;
                uniform vec4 uBgColor;
                uniform sampler2D uGridTexture;

                varying vec2 vTexCoord;

                void main() {
                    vec2 worldPos = (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;
                    
                    float s = uSideLength;
                    float h = uHeight;
                    float gap = uGapSize;

                    // Adjust cell spacing for gaps
                    float cellWidth = s + gap;
                    float cellHeight = h + gap * 0.866;

                    // Calculate grid bounds for centering
                    float totalWidth = uGridSize * cellWidth;
                    float totalHeight = uGridSize * cellHeight;
                    float halfWidth = totalWidth * 0.5;
                    float halfHeight = totalHeight * 0.5;

                    // Adjust world position to be relative to grid center
                    vec2 centeredPos = worldPos + vec2(halfWidth, halfHeight);

                    float row = floor(centeredPos.y / cellHeight);
                    float col = floor(centeredPos.x / cellWidth);
                    
                    bool isUpTriangle = mod(float(col) + float(row), 2.0) == 0.0;

                    float localX = centeredPos.x - col * cellWidth;
                    float localY = centeredPos.y - row * cellHeight;

                    bool inTriangle = false;
                    float triangleHalfWidth = s * 0.5;
                    
                    if (isUpTriangle) {
                        inTriangle = localY >= gap * 0.5 && localY <= h + gap * 0.5 && 
                                    localX >= gap * 0.5 && localX <= s + gap * 0.5 &&
                                    localY - gap * 0.5 <= (h / triangleHalfWidth) * (triangleHalfWidth - abs(localX - gap * 0.5 - triangleHalfWidth));
                    } else {
                        inTriangle = localY >= gap * 0.5 && localY <= h + gap * 0.5 && 
                                    localX >= gap * 0.5 && localX <= s + gap * 0.5 &&
                                    localY - gap * 0.5 >= h - (h / triangleHalfWidth) * (triangleHalfWidth - abs(localX - gap * 0.5 - triangleHalfWidth));
                    }

                    if (!inTriangle || row < 0.0 || row >= uGridSize || col < 0.0 || col >= uGridSize) {
                        gl_FragColor = uBgColor;
                        return;
                    }

                    vec2 texCoord = vec2(col + 0.5, row + 0.5) / vec2(uGridSize, uGridSize);
                    vec4 cellValue = texture2D(uGridTexture, texCoord);

                    if (cellValue.a > 0.1) {
                        gl_FragColor = uDrawColor;
                    } else {
                        gl_FragColor = uBgColor;
                    }
                }
            `;
        }
    }

    setupUniforms(gl, program, cameraView, geometry, drawColor, bgColor, width, height) {
        const uniformLocations = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            offset: gl.getUniformLocation(program, 'uOffset'),
            scale: gl.getUniformLocation(program, 'uScale'),
            gridSize: gl.getUniformLocation(program, 'uGridSize'),
            sideLength: gl.getUniformLocation(program, 'uSideLength'),
            height: gl.getUniformLocation(program, 'uHeight'),
            gapSize: gl.getUniformLocation(program, 'uGapSize'),
            drawColor: gl.getUniformLocation(program, 'uDrawColor'),
            bgColor: gl.getUniformLocation(program, 'uBgColor'),
            gridTexture: gl.getUniformLocation(program, 'uGridTexture')
        };

        gl.uniform2f(uniformLocations.resolution, width, height);
        gl.uniform2f(uniformLocations.offset, cameraView.camX, -cameraView.camY);
        gl.uniform1f(uniformLocations.scale, cameraView.zoom);
        gl.uniform1f(uniformLocations.gridSize, geometry.gridSize);
        gl.uniform1f(uniformLocations.sideLength, this.sideLength);
        gl.uniform1f(uniformLocations.height, this.height);
        gl.uniform1f(uniformLocations.gapSize, this.gapSize);
        gl.uniform4fv(uniformLocations.drawColor, drawColor);
        gl.uniform4fv(uniformLocations.bgColor, bgColor);

        return uniformLocations;
    }

    worldToCell(world) {
        const s = this.sideLength;
        const h = this.height;
        const gap = this.gapSize;

        // Calculate cell spacing with gaps
        const cellWidth = s + gap;
        const cellHeight = h + gap * 0.866;

        // Calculate grid bounds for centering
        const totalWidth = this.gridSize * cellWidth;
        const totalHeight = this.gridSize * cellHeight;
        const halfWidth = totalWidth * 0.5;
        const halfHeight = totalHeight * 0.5;

        // Adjust world position to be relative to grid center
        const centeredX = world.x + halfWidth;
        const centeredY = world.y + halfHeight;

        const row = Math.floor(centeredY / cellHeight);
        const col = Math.floor(centeredX / cellWidth);
        
        const isUpTriangle = (col + row) % 2 === 0;

        // Local coordinates within the cell (including gap area)
        const localX = centeredX - col * cellWidth;
        const localY = centeredY - row * cellHeight;

        let inTriangle = false;
        const triangleHalfWidth = s * 0.5;
        
        if (isUpTriangle) {
            inTriangle = localY >= gap * 0.5 && localY <= h + gap * 0.5 && 
                        localX >= gap * 0.5 && localX <= s + gap * 0.5 &&
                        localY - gap * 0.5 <= (h / triangleHalfWidth) * (triangleHalfWidth - Math.abs(localX - gap * 0.5 - triangleHalfWidth));
        } else {
            inTriangle = localY >= gap * 0.5 && localY <= h + gap * 0.5 && 
                        localX >= gap * 0.5 && localX <= s + gap * 0.5 &&
                        localY - gap * 0.5 >= h - (h / triangleHalfWidth) * (triangleHalfWidth - Math.abs(localX - gap * 0.5 - triangleHalfWidth));
        }

        if (!inTriangle || row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return [-1, -1];
        }

        return [col, row];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const s = this.sideLength;
        const h = this.height;
        const gap = this.gapSize;

        const cellWidth = s + gap;
        const cellHeight = h + gap * 0.866;

        // Calculate grid bounds for centering
        const totalWidth = this.gridSize * cellWidth;
        const totalHeight = this.gridSize * cellHeight;
        const halfWidth = totalWidth * 0.5;
        const halfHeight = totalHeight * 0.5;

        // Adjust bounds to be relative to grid center
        const centeredMinX = minX + halfWidth;
        const centeredMaxX = maxX + halfWidth;
        const centeredMinY = minY + halfHeight;
        const centeredMaxY = maxY + halfHeight;

        const minCol = Math.floor(centeredMinX / cellWidth) - 1;
        const maxCol = Math.ceil(centeredMaxX / cellWidth) + 1;
        const minRow = Math.floor(centeredMinY / cellHeight) - 1;
        const maxRow = Math.ceil(centeredMaxY / cellHeight) + 1;

        return [minCol, maxCol, minRow, maxRow];
    }

    drawCanvasCells(ctx, cells) {
        const cellSize = this.baseCellSize || 60;
        const height = cellSize * Math.sqrt(3) / 2;

        for (const [col, colMap] of cells) {
            for (const [row, state] of colMap) {
                if (state) {
                    const x = col * (cellSize / 2);
                    const y = row * height;
                    const orientation = (col + row) % 2;
                    this.drawEquilateralTriangle(ctx, x, -y, cellSize, orientation);
                }
            }
        }
    }

    drawEquilateralTriangle(ctx, x, y, size, orientation) {
        const height = size * Math.sqrt(3) / 2;
        ctx.beginPath();
        if (orientation === 0) {
            ctx.moveTo(x, y + height);
            ctx.lineTo(x + size / 2, y);
            ctx.lineTo(x + size, y + height);
        } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size / 2, y + height);
            ctx.lineTo(x + size, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

export { TriangleGrid };
