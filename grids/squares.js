
class SquareGrid {
    constructor(colorSchema, detailed, simple) {
        this.colorSchema = colorSchema;
        this.DETAILED_GRID_SIZE = detailed; // Show detailed grid up to this many cells
        this.SIMPLIFIED_GRID_SIZE = simple; // Show simplified grid up to this many cells
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
            color: status ? this.colorSchema[status] : this.colorSchema.line,
            isFill: !!status
        };
    }

    worldToCell(world) {
        const size = this.radius * 2;
        return [Math.floor(world.x / size), Math.floor(world.y / size)];
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

    getGridGeometry(bounds, cells, maxCols, maxRows, infinite) {
        let [minCol, maxCol, minRow, maxRow] = this.calculateBounds(bounds);
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

        // Choose rendering strategy based on cell count
        if (totalCells > this.SIMPLIFIED_GRID_SIZE) {
            return this.getMinimalGridGeometry(minCol, maxCol, minRow, maxRow, size, cells);
        } else if (totalCells > this.DETAILED_GRID_SIZE) {
            return this.getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, size, cells);
        } else {
            return this.getDetailedGridGeometry(minCol, maxCol, minRow, maxRow, size, cells);
        }
    }

    getDetailedGridGeometry(minCol, maxCol, minRow, maxRow, size, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        const halfSize = size / 2;

        // Draw filled cells
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                if (status) {
                    const cellData = this.getCellVertices(col * size, row * size, status);
                    const fillColor = this.colorSchema[status];

                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));

                    for (let i = 0; i < 4; i++) {
                        allColors.push(...fillColor);
                    }

                    indexOffset += 4;
                }
            }
        }

        // Draw detailed grid lines (only when cell count is reasonable)
        // Horizontal grid lines
        for (let row = minRow; row <= maxRow + 1; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const x1 = col * size - halfSize;
                const y = row * size - halfSize;
                const x2 = (col + 1) * size - halfSize;

                const lineWidth = Math.max(0.5, size * 0.02);
                const vertices = [
                    x1, y - lineWidth/2,
                    x2, y - lineWidth/2,
                    x1, y + lineWidth/2,
                    x2, y + lineWidth/2
                ];
                
                allVertices.push(...vertices);
                allIndices.push(...[0, 1, 2, 2, 1, 3].map(idx => idx + indexOffset));
                
                for (let i = 0; i < 4; i++) {
                    allColors.push(...this.colorSchema.line);
                }
                
                indexOffset += 4;
            }
        }
        
        // Vertical grid lines
        for (let col = minCol; col <= maxCol + 1; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const x = col * size - halfSize;
                const y1 = row * size - halfSize;
                const y2 = (row + 1) * size - halfSize;
                
                const lineWidth = Math.max(0.5, size * 0.02);
                const vertices = [
                    x - lineWidth/2, y1,
                    x + lineWidth/2, y1,
                    x - lineWidth/2, y2,
                    x + lineWidth/2, y2
                ];
                
                allVertices.push(...vertices);
                allIndices.push(...[0, 1, 2, 2, 1, 3].map(idx => idx + indexOffset));
                
                for (let i = 0; i < 4; i++) {
                    allColors.push(...this.colorSchema.line);
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

        const halfSize = size / 2;

        // Draw filled cells (always show filled cells)
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                if (status) {
                    const cellData = this.getCellVertices(col * size, row * size, status);
                    const fillColor = this.colorSchema[status];

                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));

                    for (let i = 0; i < 4; i++) {
                        allColors.push(...fillColor);
                    }

                    indexOffset += 4;
                }
            }
        }

        // Draw simplified grid - only major grid lines (every 5th line)
        const gridStep = 5;

        // Horizontal major grid lines
        for (let row = minRow; row <= maxRow + 1; row += gridStep) {
            for (let col = minCol; col <= maxCol; col += gridStep) {
                if (col + gridStep > maxCol) continue;

                const x1 = col * size - halfSize;
                const y = row * size - halfSize;
                const x2 = Math.min((col + gridStep) * size - halfSize, maxCol * size + halfSize);

                const lineWidth = Math.max(0.5, size * 0.02);
                const vertices = [
                    x1, y - lineWidth/2,
                    x2, y - lineWidth/2,
                    x1, y + lineWidth/2,
                    x2, y + lineWidth/2
                ];

                allVertices.push(...vertices);
                allIndices.push(...[0, 1, 2, 2, 1, 3].map(idx => idx + indexOffset));

                for (let i = 0; i < 4; i++) {
                    allColors.push(...this.colorSchema.line);
                }

                indexOffset += 4;
            }
        }

        // Vertical major grid lines
        for (let col = minCol; col <= maxCol + 1; col += gridStep) {
            for (let row = minRow; row <= maxRow; row += gridStep) {
                if (row + gridStep > maxRow) continue;

                const x = col * size - halfSize;
                const y1 = row * size - halfSize;
                const y2 = Math.min((row + gridStep) * size - halfSize, maxRow * size + halfSize);

                const lineWidth = Math.max(0.5, size * 0.02);
                const vertices = [
                    x - lineWidth/2, y1,
                    x + lineWidth/2, y1,
                    x - lineWidth/2, y2,
                    x + lineWidth/2, y2
                ];

                allVertices.push(...vertices);
                allIndices.push(...[0, 1, 2, 2, 1, 3].map(idx => idx + indexOffset));

                for (let i = 0; i < 4; i++) {
                    allColors.push(...this.colorSchema.line);
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

    getMinimalGridGeometry(minCol, maxCol, minRow, maxRow, size, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        // No grid lines at all when too many cells
        // Only draw filled cells
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                if (status) {
                    const cellData = this.getCellVertices(col * size, row * size, status);
                    const fillColor = this.colorSchema[status];

                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));

                    for (let i = 0; i < 4; i++) {
                        allColors.push(...fillColor);
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