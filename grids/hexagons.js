class HexagonGrid {
    constructor(colorSchema, detailed, simple) {
        this.colorSchema = colorSchema;
        this.DETAILED_GRID_SIZE = detailed; // Show detailed grid up to this many cells
        this.SIMPLIFIED_GRID_SIZE = simple; // Show simplified grid up to this many cells
        this.radius = 30;
        this.zoom = 1;

        // Geometry functions that can be swapped
        this.geometryStrategies = {
            detailed: this.getDetailedGeometry.bind(this),
            simplified: this.getSimplifiedGeometry.bind(this),
            minimal: this.getMinimalGeometry.bind(this)
        };
    }

    // Geometry calculation functions
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
            color: status ? this.colorSchema[status] : this.colorSchema.line,
            isFill: !!status
        };
    }

    getGridMarkerGeometry(col, row, horiz, vert, markerSize) {
        const x = col * horiz;
        const y = row * vert + (col % 2 ? vert / 2 : 0);
        
        // Simple dot marker - much clearer than complex hexagon outlines
        return [
            x - markerSize, y - markerSize,
            x + markerSize, y - markerSize,
            x - markerSize, y + markerSize,
            x + markerSize, y + markerSize
        ];
    }

    getHexagonOutlineGeometry(col, row, horiz, vert, lineWidth) {
        const x = col * horiz;
        const y = row * vert + (col % 2 ? vert / 2 : 0);
        
        const vertices = [];
        // Create a thin outline around the hexagon
        const innerRadius = this.radius - lineWidth/2;
        const outerRadius = this.radius + lineWidth/2;
        
        for (let i = 0; i < 6; i++) {
            const a1 = Math.PI/3 * i;
            const a2 = Math.PI/3 * ((i + 1) % 6);
            
            // Inner points
            const ix1 = x + innerRadius * Math.cos(a1);
            const iy1 = y + innerRadius * Math.sin(a1);
            const ix2 = x + innerRadius * Math.cos(a2);
            const iy2 = y + innerRadius * Math.sin(a2);
            
            // Outer points
            const ox1 = x + outerRadius * Math.cos(a1);
            const oy1 = y + outerRadius * Math.sin(a1);
            const ox2 = x + outerRadius * Math.cos(a2);
            const oy2 = y + outerRadius * Math.sin(a2);
            
            // Create two triangles for the line segment
            vertices.push(
                ix1, iy1, ix2, iy2, ox1, oy1,  // First triangle
                ix2, iy2, ox2, oy2, ox1, oy1   // Second triangle
            );
        }
        
        return vertices;
    }

    getMajorGridStep(totalCells) {
        // Dynamic grid step based on cell density
        if (totalCells > 5000) return 10;
        if (totalCells > 2000) return 5;
        return 3;
    }

    // Geometry strategies
    getDetailedGeometry(minCol, maxCol, minRow, maxRow, horiz, vert, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        const lineWidth = Math.max(0.5, this.radius * 0.02);

        // Draw all hexagon outlines
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const outlineVertices = this.getHexagonOutlineGeometry(col, row, horiz, vert, lineWidth);
                if (outlineVertices.length > 0) {
                    // Each hexagon outline has 6 segments, each with 6 vertices
                    for (let i = 0; i < 6; i++) {
                        const segmentVertices = outlineVertices.slice(i * 12, (i + 1) * 12);
                        this.addGeometryAsTriangles(allVertices, allIndices, allColors, indexOffset, segmentVertices);
                        indexOffset += 6; // 6 vertices per segment (2 triangles)
                    }
                }
            }
        }

        // Add filled cells
        this.addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, horiz, vert, cells);

        return this.createGeometryBuffer(allVertices, allIndices, allColors);
    }

    getSimplifiedGeometry(minCol, maxCol, minRow, maxRow, horiz, vert, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;


        const gridStep = this.getMajorGridStep((maxCol - minCol + 1) * (maxRow - minRow + 1));
        const markerSize = this.radius * 0.1; // Small clear dots

        // Draw simple grid markers at major intersections - much clearer!
        for (let col = minCol; col <= maxCol; col += gridStep) {
            for (let row = minRow; row <= maxRow; row += gridStep) {
                const markerVertices = this.getGridMarkerGeometry(col, row, horiz, vert, markerSize);
                this.addGeometryAsQuad(allVertices, allIndices, allColors, indexOffset, markerVertices);
                indexOffset += 4;
            }
        }

        // Add filled cells
        this.addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, horiz, vert, cells);

        return this.createGeometryBuffer(allVertices, allIndices, allColors);
    }

    getMinimalGeometry(minCol, maxCol, minRow, maxRow, horiz, vert, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        // Only draw filled cells, no grid markers
        this.addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, horiz, vert, cells);

        return this.createGeometryBuffer(allVertices, allIndices, allColors);
    }

    // Helper functions
    addGeometryAsQuad(vertices, indices, colors, offset, newVertices) {
        if (newVertices.length !== 8) return; // Should have 4 vertices (x,y pairs)

        vertices.push(...newVertices);

        // Create indices for a quad (two triangles)
        indices.push(
            offset, offset + 1, offset + 2,    // First triangle
            offset + 2, offset + 1, offset + 3  // Second triangle
        );

        // Add colors for each vertex
        for (let i = 0; i < 4; i++) {
            colors.push(...this.colorSchema.line);
        }
    }

    addGeometryAsTriangles(vertices, indices, colors, offset, newVertices, color) {
        if (newVertices.length === 0) return;

        vertices.push(...newVertices);

        // Create indices for triangles (each 3 vertices form a triangle)
        const vertexCount = newVertices.length / 2;
        const triangleCount = vertexCount / 3;

        for (let i = 0; i < triangleCount; i++) {
            indices.push(
                offset + i * 3,
                offset + i * 3 + 1,
                offset + i * 3 + 2
            );
        }

        // Add colors for each vertex
        for (let i = 0; i < vertexCount; i++) {
            colors.push(...this.colorSchema.line);
        }
    }

    addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, horiz, vert, cells) {

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.get(col)?.get(row);
                if (status) {
                    const x = col * horiz;
                    const y = row * vert + (col % 2 ? vert / 2 : 0);
                    const cellData = this.getCellVertices(x, y, status);
                    const fillColor = this.colorSchema[status];

                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));

                    // Add colors for each vertex (7 vertices per hexagon: 6 perimeter + 1 center)
                    for (let i = 0; i < 7; i++) {
                        allColors.push(...fillColor);
                    }

                    indexOffset += 7; // 7 vertices per hexagon
                }
            }
        }
        return indexOffset;
    }

    createGeometryBuffer(vertices, indices, colors) {
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
            colors: new Float32Array(colors),
            vertexCount: vertices.length / 2,
            indexCount: indices.length
        };
    }

    worldToCell(world) {
        const q = Math.round(world.x / (1.5 * this.radius));
        const r = Math.round((world.y - (q % 2 ? Math.sqrt(3) * this.radius / 2 : 0)) / (Math.sqrt(3) * this.radius));
        return [q, r];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const horiz = 1.5 * this.radius;
        const vert = Math.sqrt(3) * this.radius;

        const minCol = Math.floor(minX / horiz) - 1;
        const maxCol = Math.ceil(maxX / horiz) + 1;
        const minRow = Math.floor(minY / vert) - 1;
        const maxRow = Math.ceil(maxY / vert) + 1;
        
        return [minCol, maxCol, minRow, maxRow];
    }

    getGridGeometry(bounds, cells, maxCols, maxRows, infinite) {
        let [minCol, maxCol, minRow, maxRow] = this.calculateBounds(bounds);
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

        const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1);

        let strategy;
        if (totalCells > this.SIMPLIFIED_GRID_SIZE) {
            strategy = 'minimal';
        } else if (totalCells > this.DETAILED_GRID_SIZE) {
            strategy = 'simplified';
        } else {
            strategy = 'detailed';
        }

        return this.geometryStrategies[strategy](minCol, maxCol, minRow, maxRow, horiz, vert, cells);
    }

    setGeometryStrategy(strategyName, strategyFunction) {
        this.geometryStrategies[strategyName] = strategyFunction.bind(this);
    }
}

export { HexagonGrid };