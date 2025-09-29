class HexagonGrid {
    constructor(colorSchema) {
        this.colorSchema = colorSchema;
        this.radius = 30;
        this.zoom = 1;
    }

    // Returns vertex data for rendering
    getCellVertices(x, y, status) {
        const vertices = [];
        const indices = [];
        
        // Create hexagon by connecting 6 points in a circle
        for (let i = 0; i < 6; i++) {
            const a = Math.PI/3 * i;  // Angle for each vertex (60° increments)
            const px = x + this.radius * Math.cos(a);
            const py = y + this.radius * Math.sin(a);
            vertices.push(px, py);
        }
        
        // Create triangles for the hexagon (fan triangulation from center)
        // First add center point
        vertices.push(x, y);
        const centerIndex = 6;
        
        // Create 6 triangles from center to each edge
        for (let i = 0; i < 6; i++) {
            indices.push(centerIndex, i, (i + 1) % 6);
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
        // Hexagonal grid: using axial coordinates (q, r)
        const q = Math.round(world.x / (1.5 * this.radius));
        const r = Math.round((world.y - (q % 2 ? Math.sqrt(3) * this.radius / 2 : 0)) / (Math.sqrt(3) * this.radius));
        return [q, r];
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
        const horiz = 1.5 * this.radius;
        const vert = Math.sqrt(3) * this.radius;

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
            return this.getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, horiz, vert, cells);
        }

        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const x = col * horiz;
                const y = row * vert + (col % 2 ? vert / 2 : 0);
                const status = cells.has(col) ? cells.get(col).get(row) : undefined;
                
                // Only draw non-empty cells for large grids
                if (totalCells > MAX_CELLS_PER_FRAME && !status) {
                    continue;
                }

                const cellData = this.getCellVertices(x, y, status);
                
                allVertices.push(...cellData.vertices);
                allIndices.push(...cellData.indices.map(idx => idx + indexOffset));
                
                // Add colors for each vertex (7 vertices per hexagon: 6 perimeter + 1 center)
                for (let i = 0; i < 7; i++) {
                    allColors.push(...cellData.color);
                }
                
                indexOffset += 7; // 7 vertices per hexagon
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

    getSimplifiedGridGeometry(minCol, maxCol, minRow, maxRow, horiz, vert, cells) {
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
                const x = col * horiz;
                const y = row * vert + (col % 2 ? vert / 2 : 0);
                const markerSize = this.radius * 0.1;
                
                // Draw small marker instead of full hexagon
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
                    const x = col * horiz;
                    const y = row * vert + (col % 2 ? vert / 2 : 0);
                    const cellData = this.getCellVertices(x, y, status);
                    
                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));
                    
                    for (let i = 0; i < 7; i++) {
                        allColors.push(...cellData.color);
                    }
                    
                    indexOffset += 7;
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

export { HexagonGrid };