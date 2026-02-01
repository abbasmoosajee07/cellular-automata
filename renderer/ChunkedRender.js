class ChunkedRender {
    constructor(gridManager, chunkSize) {
        this.gridManager = gridManager;
        this.renderer = gridManager.renderer;
        this.gridMesh = gridManager.grid_mesh;
        this.gl = this.renderer.gl;
        this.chunkSize = chunkSize;
        this.cache = new Map(); // "cx,cy,cz" → WebGLTexture
    }

    key(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }

    getOrCreate(cx, cy, cz) {
        const key = this.key(cx, cy, cz);
        if (this.cache.has(key)) return this.cache.get(key);

        const gl = this.gl;
        const tex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R8UI,
            this.chunkSize,
            this.chunkSize,
            0,
            gl.RED_INTEGER,
            gl.UNSIGNED_BYTE,
            null
        );

        this.cache.set(key, tex);
        return tex;
    }

    upload(cx, cy, cz, data) {
        const gl = this.gl;
        const tex = this.getOrCreate(cx, cy, cz);

        gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, 0,
            this.chunkSize,
            this.chunkSize,
            gl.RED_INTEGER,
            gl.UNSIGNED_BYTE,
            new Uint8Array(data)
        );

        return tex;
    }

upload(cx, cy, cz, data) {
    const gl = this.gl;
    const tex = this.getOrCreate(cx, cy, cz);

    const cs = this.chunkSize;
    // console.log(cs)
    const layerSize = cs * cs;

    // --- SAFETY CHECK ---
    if (data.length < layerSize) {
        throw new Error(
            `Chunk data too small: got ${data.length}, expected ${layerSize}`
        );
    }

    // --- Extract z = 0 layer only ---
    const slice = new Uint8Array(layerSize);
    for (let i = 0; i < layerSize; i++) {
        slice[i] = data[i] & 0xFF; // u32 → u8
    }

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0, 0,
        cs,
        cs,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        slice
    );

    return tex;
}

    renderGrid(tl, br) {
        const gl = this.renderer.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);

        const cs = this.chunkSize;

        const minCX = Math.floor(Math.min(tl[0], br[0]) / cs);
        const maxCX = Math.floor(Math.max(tl[0], br[0]) / cs);
        const minCY = Math.floor(Math.min(tl[1], br[1]) / cs);
        const maxCY = Math.floor(Math.max(tl[1], br[1]) / cs);
        // console.log("test");
        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cy = minCY; cy <= maxCY; cy++) {
            const cz = 0;

            const data = this.gridMesh.get_chunk_cells(cx, cy, cz);
            if (!data || data.length === 0) continue;

            const texture = this.upload(cx, cy, cz, data);
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
        this.gridMesh.set_cell(q, r, s, state);

        const cs = this.chunkSize;
        const cx = Math.floor(q / cs);
        const cy = Math.floor(r / cs);

        const data = this.gridMesh.get_chunk_cells(cx, cy, 0);
        this.upload(cx, cy, 0, data);
    }

}

export { ChunkedRender };
