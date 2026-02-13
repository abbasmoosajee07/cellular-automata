class ChunkedRender {
    constructor(gridManager, chunkSize) {
        this.gridManager = gridManager;
        this.renderer = gridManager.renderer;
        this.gridMesh = gridManager.grid_mesh;

        this.chunkSize = chunkSize;
        this.cache = new Map(); // "cx,cy,cz" → WebGLTexture
        console.log("Rendering Strategy: Chunked")
        this.isWebGL2 = this.renderer.isWebGL2;
        this.rowMult = gridManager.shapeGrid.rowMult;
        this.colMult = gridManager.shapeGrid.colMult;
        this.useWebgl = this.renderer.setupChunkedRender();
    }

    key(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }

    getOrCreate(cx, cy, cz) {
        const key = this.key(cx, cy, cz);
        if (this.cache.has(key)) return this.cache.get(key);

        const gl = this.renderer.gl;
        const tex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const w = this.chunkSize * this.colMult;
        const h = this.chunkSize * this.rowMult;

        // Passing null for initial data is unreliable in some WebGL1 drivers.
        // Always supply a correctly-sized zeroed buffer instead.
        const bytesPerPixel = this.isWebGL2 ? 1 : 4;
        const emptyData = new Uint8Array(w * h * bytesPerPixel);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            this.isWebGL2 ? gl.R8UI : gl.RGBA,
            w,
            h,
            0,
            this.isWebGL2 ? gl.RED_INTEGER : gl.RGBA,
            gl.UNSIGNED_BYTE,
            emptyData
        );

        this.cache.set(key, tex);
        return tex;
    }

    upload(cx, cy, cz, data) {
        const gl = this.renderer.gl;
        const tex = this.getOrCreate(cx, cy, cz);
        const cs = this.chunkSize;
        const w  = cs * this.colMult;
        const h  = cs * this.rowMult;

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        let uploadData = this.renderer.shapeGrid.transformChunkData(data, cs);

        if (!this.isWebGL2) {
            // WebGL1 texture is RGBA (4 bytes/pixel). transformChunkData returns
            // 1 byte/cell (state index). Expand each state to its RGBA color so
            // the shader can sample the color directly via texture2D.
            const colorSchema = this.renderer.shapeGrid.colorSchema;
            const rgba = new Uint8Array(w * h * 4);
            for (let i = 0; i < uploadData.length; i++) {
                const state = uploadData[i];
                const color = colorSchema[state] || colorSchema.grid || [1, 1, 1, 1];
                rgba[i * 4]     = Math.round(color[0] * 255);
                rgba[i * 4 + 1] = Math.round(color[1] * 255);
                rgba[i * 4 + 2] = Math.round(color[2] * 255);
                rgba[i * 4 + 3] = state === 0 ? 0 : Math.round((color[3] ?? 1) * 255);
            }
            uploadData = rgba;
        }

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, 0,
            w,
            h,
            this.isWebGL2 ? gl.RED_INTEGER : gl.RGBA,
            gl.UNSIGNED_BYTE,
            uploadData
        );
    }
    renderGrid(tl, br, updateCells) {
        if (!this.useWebgl) {
            this.renderer.renderGrid(this.gridManager.cameraView, this.gridMesh, updateCells)
            return
        }
        const gl = this.renderer.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);

        const cs = this.chunkSize;

        const minCX = Math.floor(Math.min(tl[0], br[0]) / cs);
        const maxCX = Math.floor(Math.max(tl[0], br[0]) / cs);
        const minCY = Math.floor(Math.min(tl[1], br[1]) / cs);
        const maxCY = Math.floor(Math.max(tl[1], br[1]) / cs);

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cy = minCY; cy <= maxCY; cy++) {
                const cz = 0;
                const key = this.key(cx, cy, cz);

                // Only upload if chunk is dirty or doesn't exist
                if (updateCells || !this.cache.has(key)) {
                    const data = this.gridMesh.get_chunk_cells(cx, cy, cz);
                    if (!data || data.length === 0) continue;
                    this.upload(cx, cy, cz, data);
                }

                const texture = this.cache.get(key);
                this.renderer.drawChunk(
                    this.gridManager.cameraView,
                    texture,
                    cx, cy,
                    cs
                );
            }
        }
    }

    changeCell(q, r, s, state) {
        const cs = this.chunkSize;
        const cx = Math.floor(q / cs);
        const cy = Math.floor(r / cs);

        const data = this.gridMesh.get_chunk_cells(cx, cy, 0);
        if (this.useWebgl) {
            this.upload(cx, cy, 0, data);
        }
    }

}

export { ChunkedRender };
