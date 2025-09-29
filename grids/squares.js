
class SquareGrid {
    constructor(colorSchema) {
        this.colorSchema = colorSchema;
        this.radius = 30;
        this.zoom = 1;
    }

    getCellVertices(x, y, status) {
        const size = this.radius * 2;
        const halfSize = size / 2;
        
        const vertices = [
            x - halfSize, y - halfSize,
            x + halfSize, y - halfSize,
            x - halfSize, y + halfSize,
            x + halfSize, y + halfSize
        ];
        
        const indices = [0, 1, 2, 2, 1, 3];
        
        return {
            vertices,
            indices,
            color: status ? this.hexToRgb(this.colorSchema[status]) : this.hexToRgb(this.colorSchema["line"]),
            isFill: !!status
        };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ] : [0.5, 0.5, 0.5, 1.0];
    }

    worldToCell(world) {
        const size = this.radius * 2;
        return [Math.floor(world.x / size), Math.floor(world.y / size)];
    }

    calculateBounds(bounds, infinite) {
        const [minX, maxX, minY, maxY] = bounds;
        let horiz, vert;
        
        if (infinite) {
            horiz = 1.5 * this.radius;
            vert = Math.sqrt(3) * this.radius;
        } else {
            horiz = 1;
            vert = 1;
        }

        const minCol = Math.floor(minX / horiz) - 1;
        const maxCol = Math.ceil(maxX / horiz) + 1;
        const minRow = Math.floor(minY / vert) - 1;
        const maxRow = Math.ceil(maxY / vert) + 1;
        
        return [minCol, maxCol, minRow, maxRow];
    }

    getGridGeometry(bounds, cells, maxCols, maxRows, infinite) {
        let [minCol, maxCol, minRow, maxRow] = this.calculateBounds(bounds, infinite);
        const size = this.radius * 2;

        if (!infinite) {
            const halfCols = Math.floor(maxCols / 2);
            const halfRows = Math.floor(maxRows / 2);

            minCol = Math.max(minCol, -halfCols);
            maxCol = Math.min(maxCol, halfCols);
            minRow = Math.max(minRow, -halfRows);
            maxRow = Math.min(maxRow, halfRows);
        }

        const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1);
        const MAX_CELLS_PER_FRAME = 10000;

        if (totalCells > MAX_CELLS_PER_FRAME) {
            return this.getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, size, cells);
        }

        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                
                if (totalCells > MAX_CELLS_PER_FRAME && !status) {
                    continue;
                }

                const cellData = this.getCellVertices(col * size, row * size, status);
                
                allVertices.push(...cellData.vertices);
                allIndices.push(...cellData.indices.map(idx => idx + indexOffset));
                
                for (let i = 0; i < 4; i++) {
                    allColors.push(...cellData.color);
                }
                
                indexOffset += 4;
            }
        }

        return {
            vertices: new Float32Array(allVertices),
            indices: new Uint16Array(allIndices),
            colors: new Float32Array(allColors),
            vertexCount: allVertices.length / 2,
            indexCount: allIndices.length
        };
    }

    getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, size, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        const gridLineColor = this.hexToRgb(this.colorSchema["line"]);
        const cols = maxCol - minCol + 1;
        const rows = maxRow - minRow + 1;
        
        const step = Math.max(1, Math.floor(cols / 50));

        for (let col = minCol; col <= maxCol; col += step) {
            for (let row = minRow; row <= maxRow; row += step) {
                const x = col * size;
                const y = row * size;
                const markerSize = size * 0.1;
                
                const vertices = [
                    x - markerSize, y - markerSize,
                    x + markerSize, y - markerSize,
                    x - markerSize, y + markerSize,
                    x + markerSize, y + markerSize
                ];
                
                allVertices.push(...vertices);
                allIndices.push(...[0, 1, 2, 2, 1, 3].map(idx => idx + indexOffset));
                
                for (let i = 0; i < 4; i++) {
                    allColors.push(...gridLineColor);
                }
                
                indexOffset += 4;
            }
        }

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                if (status) {
                    const cellData = this.getCellVertices(col * size, row * size, status);
                    
                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));
                    
                    for (let i = 0; i < 4; i++) {
                        allColors.push(...cellData.color);
                    }
                    
                    indexOffset += 4;
                }
            }
        }

        return {
            vertices: new Float32Array(allVertices),
            indices: new Uint16Array(allIndices),
            colors: new Float32Array(allColors),
            vertexCount: allVertices.length / 2,
            indexCount: allIndices.length
        };
    }
}

export { SquareGrid };
