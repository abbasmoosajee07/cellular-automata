class ChunkedRender {
    constructor(gridManager, chunkSize) {
        this.gridManager = gridManager;
        this.renderer = gridManager.renderer;
        this.gridMesh = gridManager.grid_mesh;

        this.chunkSize = chunkSize;
        this.cache = new Map(); // "cx,cy,cz" → WebGLTexture

        this.rowMult = gridManager.shapeGrid.rowMult;
        this.colMult = gridManager.shapeGrid.colMult;
        this.rendererUsed = gridManager.shapeGrid.rendererUsed;
        this.renderer.setupRenderStrategy("chunked");
        console.log(`Rendering Strategy: ${chunkSize} sized square chunks`)
    }

    key(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }

    getOrCreate(cx, cy, cz) {
        const key = this.key(cx, cy, cz);
        if (this.cache.has(key)) return this.cache.get(key);

        const gl = this.renderer.gl;
        const tex = gl.createTexture();
        const isWebGL2 = (this.rendererUsed === "webgl2");

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const w = this.chunkSize * this.colMult;
        const h = this.chunkSize * this.rowMult;

        // Passing null for initial data
        const bytesPerPixel = isWebGL2 ? 1 : 4;
        const emptyData = new Uint8Array(w * h * bytesPerPixel);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            isWebGL2 ? gl.R8UI : gl.RGBA,
            w, h,
            0,
            isWebGL2 ? gl.RED_INTEGER : gl.RGBA,
            gl.UNSIGNED_BYTE,
            emptyData
        );

        this.cache.set(key, tex);
        return tex;
    }

    uploadChunk(cx, cy, cz) {
        const gl = this.renderer.gl;
        const tex = this.getOrCreate(cx, cy, cz);
        const cs = this.chunkSize;
        const w  = cs * this.colMult;
        const h  = cs * this.rowMult;
        const isWebGL2 = ((this.rendererUsed === "webgl2"));

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        const data = this.gridMesh.get_chunk_cells(cx, cy, cz);
        if (!data || data.length === 0) return;
        let uploadData = this.gridManager.shapeGrid.transformChunkData(data, cs);

        if (!isWebGL2) {
            const colorSchema = this.gridManager.colorSchema;
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
            w, h,
            isWebGL2 ? gl.RED_INTEGER : gl.RGBA,
            gl.UNSIGNED_BYTE,
            uploadData
        );
    }

    renderGrid(tl, br, cameraView, updateCells) {
        const cs = this.chunkSize;

        const minCX = Math.floor(Math.min(tl[0], br[0]) / cs);
        const maxCX = Math.floor(Math.max(tl[0], br[0]) / cs);
        const minCY = Math.floor(Math.min(tl[1], br[1]) / cs);
        const maxCY = Math.floor(Math.max(tl[1], br[1]) / cs);

        const isCanvas = this.rendererUsed === "canvas2d";

        if (isCanvas) {
            const ctx = this.renderer.ctx;
            const { 0: gridColor } = this.renderer.colorSchema;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
            ctx.fillStyle = this.renderer.rgba(gridColor);
            ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
        } else {
            this.renderer.gl.clear(this.renderer.gl.COLOR_BUFFER_BIT);
        }

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cy = minCY; cy <= maxCY; cy++) {
                if (isCanvas) {
                    const data = this.gridMesh.get_chunk_cells(cx, cy, 0);
                    this.renderer.drawChunk(cameraView, cx, cy, cs, data);
                } else {
                    const key = this.key(cx, cy, 0);
                    if (updateCells || !this.cache.has(key)) this.uploadChunk(cx, cy, 0);
                    this.renderer.drawChunk(cameraView, this.cache.get(key), cx, cy, cs);
                }
            }
        }
    }

    changeCell(q, r, s, state) {
        if (this.rendererUsed === "canvas2d") {
            return;
        }
        const cs = this.chunkSize;
        const cx = Math.floor(q / cs);
        const cy = Math.floor(r / cs);
        this.uploadChunk(cx, cy, 0);
    }

    clearCache() {
        const gl = this.renderer.gl;
        if (gl) {
            for (const texture of this.cache.values()) {
                gl.deleteTexture(texture);
            }
        }
        this.cache.clear();
        this.renderer.clearAll();
        this.gridManager.renderGrid();
    }

}

export { ChunkedRender };