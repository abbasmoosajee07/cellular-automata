class TriangleGrid {
    constructor(colorSchema, detailed, simple) {
        this.colorSchema = colorSchema;
        this.DETAILED_GRID_SIZE = detailed; // Show detailed grid up to this many cells
        this.SIMPLIFIED_GRID_SIZE = simple; // Show simplified grid up to this many cells
        this.radius = 30;
        this.zoom = 1;
        this.gridLineColor = this.colorSchema.line;
        // Geometry functions that can be swapped
        this.geometryStrategies = {
            detailed: this.getDetailedGeometry.bind(this),
            simplified: this.getSimplifiedGeometry.bind(this),
            minimal: this.getMinimalGeometry.bind(this)
        };
    }

    // Geometry calculation functions
    getCellVertices(x, y, upsideDown, status) {
        const side = this.radius * 2;
        const h = Math.sqrt(3) / 2 * side; // Triangle height

        let vertices;

        if (!upsideDown) {
            // Point-up triangle
            vertices = [
                x, y,           // top vertex
                x + side/2, y + h, // bottom-right vertex
                x - side/2, y + h  // bottom-left vertex
            ];
        } else {
            // Point-down triangle
            vertices = [
                x, y + h,       // bottom vertex
                x + side/2, y,  // top-right vertex
                x - side/2, y   // top-left vertex
            ];
        }

        // Single triangle indices
        const indices = [0, 1, 2];

        return {
            vertices,
            indices,
            color: status ? this.colorSchema[status] : this.colorSchema.line,
            isFill: !!status
        };
    }

    getGridMarkerGeometry(col, row, side, h, markerSize) {
        const x = col * (side / 2);
        const y = row * h;

        // Simple dot marker
        return [
            x - markerSize, y - markerSize,
            x + markerSize, y - markerSize,
            x - markerSize, y + markerSize,
            x + markerSize, y + markerSize
        ];
    }

    getTriangleOutlineGeometry(col, row, side, h, lineWidth) {
        const x = col * (side / 2);
        const y = row * h;
        const upsideDown = (col + row) % 2 === 0;

        const vertices = [];

        if (!upsideDown) {
            // Point-up triangle outline
            const top = [x, y];
            const right = [x + side/2, y + h];
            const left = [x - side/2, y + h];

            this.addTriangleOutline(vertices, top, right, left, lineWidth);
        } else {
            // Point-down triangle outline
            const bottom = [x, y + h];
            const right = [x + side/2, y];
            const left = [x - side/2, y];

            this.addTriangleOutline(vertices, bottom, right, left, lineWidth);
        }
        
        return vertices;
    }

    addTriangleOutline(vertices, p1, p2, p3, lineWidth) {
        // Create outlines for each edge of the triangle
        this.addLineSegment(vertices, p1, p2, lineWidth);
        this.addLineSegment(vertices, p2, p3, lineWidth);
        this.addLineSegment(vertices, p3, p1, lineWidth);
    }

    addLineSegment(vertices, start, end, lineWidth) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        const perpX = -dy / length * lineWidth / 2;
        const perpY = dx / length * lineWidth / 2;
        
        // Create a quad for the line segment
        vertices.push(
            start[0] + perpX, start[1] + perpY,
            end[0] + perpX, end[1] + perpY,
            start[0] - perpX, start[1] - perpY,
            end[0] + perpX, end[1] + perpY,
            end[0] - perpX, end[1] - perpY,
            start[0] - perpX, start[1] - perpY
        );
    }

    getMajorGridStep(totalCells) {
        // Dynamic grid step based on cell density
        if (totalCells > 5000) return 10;
        if (totalCells > 2000) return 5;
        return 3;
    }

    // Geometry strategies
    getDetailedGeometry(minCol, maxCol, minRow, maxRow, side, h, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        const lineWidth = Math.max(0.5, this.radius * 0.02);

        // Draw all triangle outlines
        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const outlineVertices = this.getTriangleOutlineGeometry(col, row, side, h, lineWidth);
                if (outlineVertices.length > 0) {
                    // Each triangle outline has 3 segments, each with 6 vertices (2 triangles per segment)
                    for (let i = 0; i < 3; i++) {
                        const segmentVertices = outlineVertices.slice(i * 12, (i + 1) * 12);
                        this.addGeometryAsTriangles(allVertices, allIndices, allColors, indexOffset, segmentVertices);
                        indexOffset += 6; // 6 vertices per segment (2 triangles)
                    }
                }
            }
        }

        // Add filled cells
        this.addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, side, h, cells);
        
        return this.createGeometryBuffer(allVertices, allIndices, allColors);
    }

    getSimplifiedGeometry(minCol, maxCol, minRow, maxRow, side, h, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        const gridStep = this.getMajorGridStep((maxCol - minCol + 1) * (maxRow - minRow + 1));
        const markerSize = this.radius * 0.1;

        // Draw simple grid markers at major intersections
        for (let col = minCol; col <= maxCol; col += gridStep) {
            for (let row = minRow; row <= maxRow; row += gridStep) {
                const markerVertices = this.getGridMarkerGeometry(col, row, side, h, markerSize);
                this.addGeometryAsQuad(allVertices, allIndices, allColors, indexOffset, markerVertices);
                indexOffset += 4;
            }
        }

        // Add filled cells
        this.addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, side, h, cells);
        
        return this.createGeometryBuffer(allVertices, allIndices, allColors);
    }

    getMinimalGeometry(minCol, maxCol, minRow, maxRow, side, h, cells) {
        const allVertices = [];
        const allIndices = [];
        const allColors = [];
        let indexOffset = 0;

        // Only draw filled cells, no grid markers
        this.addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, side, h, cells);
        
        return this.createGeometryBuffer(allVertices, allIndices, allColors);
    }

    // Helper functions (same as HexagonGrid)
    addGeometryAsQuad(vertices, indices, colors, offset, newVertices, color) {
        if (newVertices.length !== 8) return;

        vertices.push(...newVertices);
        indices.push(
            offset, offset + 1, offset + 2,
            offset + 2, offset + 1, offset + 3
        );

        for (let i = 0; i < 4; i++) {
            colors.push(...this.gridLineColor);
        }
    }

    addGeometryAsTriangles(vertices, indices, colors, offset, newVertices, color) {
        if (newVertices.length === 0) return;

        vertices.push(...newVertices);
        const vertexCount = newVertices.length / 2;
        const triangleCount = vertexCount / 3;

        for (let i = 0; i < triangleCount; i++) {
            indices.push(
                offset + i * 3,
                offset + i * 3 + 1,
                offset + i * 3 + 2
            );
        }

        for (let i = 0; i < vertexCount; i++) {
            colors.push(...this.gridLineColor);
        }
    }

    addFilledCells(allVertices, allIndices, allColors, indexOffset, minCol, maxCol, minRow, maxRow, side, h, cells) {

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const status = cells.get(col)?.get(row);
                if (status) {
                    const x = col * (side / 2);
                    const y = row * h;
                    const upsideDown = (col + row) % 2 === 0;
                    const cellData = this.getCellVertices(x, y, upsideDown, status);
                    const fillColor = this.colorSchema[status];

                    allVertices.push(...cellData.vertices);
                    allIndices.push(...cellData.indices.map(idx => idx + indexOffset));

                    for (let i = 0; i < 3; i++) {
                        allColors.push(...fillColor);
                    }

                    indexOffset += 3; // 3 vertices per triangle
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
        const side = this.radius * 2;
        const h = Math.sqrt(3) / 2 * side;
        const gridX = Math.floor(world.x / (side / 2));
        const gridY = Math.floor(world.y / h);
        return [gridX, gridY];
    }

    calculateBounds(bounds) {
        const [minX, maxX, minY, maxY] = bounds;
        const side = this.radius * 2;
        const h = Math.sqrt(3) / 2 * side;

        const minCol = Math.floor(minX / (side / 2)) - 2;
        const maxCol = Math.ceil(maxX / (side / 2)) + 2;
        const minRow = Math.floor(minY / h) - 2;
        const maxRow = Math.ceil(maxY / h) + 2;

        return [minCol, maxCol, minRow, maxRow];
    }

    getGridGeometry(bounds, cells, maxCols, maxRows, infinite) {
        let [minCol, maxCol, minRow, maxRow] = this.calculateBounds(bounds);
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

        const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1);

        let strategy;
        if (totalCells > this.SIMPLIFIED_GRID_SIZE) {
            strategy = 'minimal';
        } else if (totalCells > this.DETAILED_GRID_SIZE) {
            strategy = 'simplified';
        } else {
            strategy = 'detailed';
        }

        return this.geometryStrategies[strategy](minCol, maxCol, minRow, maxRow, side, h, cells);
    }

    setGeometryStrategy(strategyName, strategyFunction) {
        this.geometryStrategies[strategyName] = strategyFunction.bind(this);
    }
}

export { TriangleGrid };