class TriangleGrid {
    constructor(colorSchema) {
        this.colorSchema = colorSchema;
        this.radius = 30;
        this.zoom = 1;
    }

    // Returns vertex data for rendering
    getCellVertices(x, y, upsideDown, status) {
        const side = this.radius * 2;
        const h = Math.sqrt(3) / 2 * side; // Triangle height
        
        let vertices, indices;
        
        if (!upsideDown) {
            // Point-up triangle
            vertices = [
                x, y,           // top vertex
                x + side/2, y + h, // bottom-right vertex
                x - side/2, y + h  // bottom-left vertex
            ];
            indices = [0, 1, 2]; // Single triangle
        } else {
            // Point-down triangle
            vertices = [
                x, y + h,       // bottom vertex
                x + side/2, y,  // top-right vertex
                x - side/2, y   // top-left vertex
            ];
            indices = [0, 1, 2]; // Single triangle
        }

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
        // Triangular grid coordinate system
        const side = this.radius * 2;
        const h = Math.sqrt(3) / 2 * side;
        const gridX = Math.floor(world.x / (side / 2));
        const gridY = Math.floor(world.y / h);
        return [gridX, gridY];
    }

    calculateBounds(bounds, infinite) {
        const [minX, maxX, minY, maxY] = bounds;
        const side = 2 * this.radius;
        const h = Math.sqrt(3) / 2 * side;

        // Find bounding indices of visible cols/rows
        const minCol = Math.floor(minX / (side / 2)) - 2;
        const maxCol = Math.ceil(maxX / (side / 2)) + 2;
        const minRow = Math.floor(minY / h) - 2;
        const maxRow = Math.ceil(maxY / h) + 2;

        return [minCol, maxCol, minRow, maxRow];
    }

    getGridGeometry(bounds, cells, maxCols, maxRows, infinite) {
        let [minCol, maxCol, minRow, maxRow] = this.calculateBounds(bounds, infinite);
        const side = this.radius * 2;
        const h = Math.sqrt(3) / 2 * side;

        if (!infinite) {
            const halfCols = Math.floor(maxCols / 2);
            const halfRows = Math.floor(maxRows / 2);

            minCol = Math.max(minCol, -halfCols);
            maxCol = Math.min(maxCol, halfCols);
            minRow = Math.max(minRow, -halfRows);
            maxRow = Math.min(maxRow, halfRows);
        }

        // Calculate total cells and implement chunking if too large
        const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1);
        const MAX_CELLS_PER_FRAME = 10000;

        if (totalCells > MAX_CELLS_PER_FRAME) {
            return this.getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, side, h, cells);
        }

        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const x = col * (side / 2);
                const y = row * h;
                const upsideDown = (col + row) % 2 === 0;
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                
                // Only draw non-empty cells for large grids
                if (totalCells > MAX_CELLS_PER_FRAME && !status) {
                    continue;
                }

                const cellData = this.getCellVertices(x, y, upsideDown, status);
                
                allVertices.push(...cellData.vertices);
                allIndices.push(...cellData.indices.map(idx => idx + indexOffset));
                
                // Add colors for each vertex (3 vertices per triangle)
                for (let i = 0; i < 3; i++) {
                    allColors.push(...cellData.color);
                }
                
                indexOffset += 3; // 3 vertices per triangle
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

    getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, side, h, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        // Draw simplified grid markers for large grids
        const gridLineColor = this.hexToRgb(this.colorSchema["line"]);
        const cols = maxCol - minCol + 1;
        const rows = maxRow - minRow + 1;
        
        const step = Math.max(1, Math.floor(cols / 50));

        for (let col = minCol; col <= maxCol; col += step) {
            for (let row = minRow; row <= maxRow; row += step) {
                const x = col * (side / 2);
                const y = row * h;
                const markerSize = this.radius * 0.1;

                // Draw small marker instead of full triangle
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

        // Draw filled cells (always show filled cells regardless of grid size)
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                if (status) {
                    const x = col * (side / 2);
                    const y = row * h;
                    const upsideDown = (col + row) % 2 === 0;
                    const cellData = this.getCellVertices(x, y, upsideDown, status);
                    
                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));
                    
                    for (let i = 0; i < 3; i++) {
                        allColors.push(...cellData.color);
                    }
                    
                    indexOffset += 3;
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

export { TriangleGrid };