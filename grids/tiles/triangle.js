import { BaseGrid } from '../base.js';

class TriangleGrid extends BaseGrid {
    constructor(colorSchema) {
        super(colorSchema, "triangle");
        this.cellSize = 60;
        this.height = this.cellSize * Math.sqrt(3) / 2;
        this.rowMult = 2;
        this.colMult = 1;
    }

    worldToCell(world) {
        const size = this.cellSize;

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
        const size = this.cellSize;

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
        const minCol = -centerCol;
        const minRow = -centerRow;

        // Use different texture rows for different triangle types
        const texX = q - minCol;
        const texY = (r - minRow) + (s * this.gridRows);

        return [Math.floor(texX), Math.floor(texY)];
    }

    getFragmentShaderSource(isWebGL2 = false) {
        if (isWebGL2) {
            return `#version 300 es
                precision mediump float;

                uniform vec2  uResolution;
                uniform vec2  uOffset;
                uniform float uScale;
                uniform float uGridCols;
                uniform float uGridRows;
                uniform float uBaseCellSize;

                uniform sampler2D uGridTexture;
                uniform vec4 uCanvasColor;
                uniform vec4 uGridColor;

                in vec2 vTexCoord;
                out vec4 outColor;

                void main() {

                    // ------- World position -------
                    vec2 worldPos =
                        (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    float cellSize = uBaseCellSize;

                    // ------- cell coordinate (in square space) -------
                    float col = floor(worldPos.x / cellSize);
                    float row = floor(worldPos.y / cellSize);

                    // ------- local pos inside cell -------
                    float localX = (worldPos.x - col * cellSize) / cellSize;
                    float localY = (worldPos.y - row * cellSize) / cellSize;

                    // upper/lower triangle selector
                    float tri = (localY < localX) ? 1.0 : 0.0;

                    // ------- grid bounds -------
                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  floor(uGridCols * 0.5);
                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  floor(uGridRows * 0.5);

                    // outside → canvas color
                    if (col < minQ || col > maxQ || row < minR || row > maxR) {
                        outColor = uCanvasColor;
                        return;
                    }

                    // ------- texture lookup for triangle grid -------
                    // triangles stored as two rows
                    float texX = (col - minQ) / uGridCols;
                    float texY = ( (row - minR) + tri * uGridRows ) / (uGridRows * 2.0);

                    vec4 cellColor = texture(uGridTexture, vec2(texX, texY));

                    // empty → grid color
                    if (cellColor.a <= 0.0) {
                        outColor = uGridColor;
                    } else {
                        outColor = cellColor;
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
                uniform vec4 uCanvasColor;
                uniform vec4 uGridColor;

                varying vec2 vTexCoord;

                void main() {

                    vec2 worldPos =
                        (vTexCoord * uResolution - uResolution * 0.5 - uOffset) / uScale;

                    float cellSize = uBaseCellSize;

                    float col = floor(worldPos.x / cellSize);
                    float row = floor(worldPos.y / cellSize);

                    float localX = (worldPos.x - col * cellSize) / cellSize;
                    float localY = (worldPos.y - row * cellSize) / cellSize;

                    float tri = (localY < localX) ? 1.0 : 0.0;

                    float minQ = -floor(uGridCols * 0.5);
                    float maxQ =  floor(uGridCols * 0.5);
                    float minR = -floor(uGridRows * 0.5);
                    float maxR =  floor(uGridRows * 0.5);

                    if (col < minQ || col > maxQ || row < minR || row > maxR) {
                        gl_FragColor = uCanvasColor;
                        return;
                    }

                    float texX = (col - minQ) / uGridCols;
                    float texY = ((row - minR) + tri * uGridRows) / (uGridRows * 2.0);

                    vec2 texCoord = vec2(texX, texY);
                    vec4 cellColor = texture2D(uGridTexture, texCoord);

                    if (cellColor.a <= 0.0) {
                        gl_FragColor = uGridColor;
                    } else {
                        gl_FragColor = cellColor;
                    }
                }
            `;
        }
    }

    drawGridShape(ctx) {
        const w = this.gridCols * this.cellSize;
        const h = this.gridRows * this.cellSize;
        ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    drawShapeCell(ctx, q, r, s, state) {
        const cellSize = this.cellSize || 60;

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

    screenGridBounds(minQ, maxQ, minR, maxR, minS, maxS) {
        let minX, maxX, minY, maxY;
        const fitFactor = 1.1;

        // Simple linear mapping
        const size = this.cellSize;

        minX = minQ * size;
        maxX = maxQ * size;

        minY = minR * size;
        maxY = maxR * size;
        minY *= fitFactor;
        maxY *= fitFactor;
        return [minX, maxX, minY, maxY];

    }
}

export { TriangleGrid };
