
class FlatCellManager {
    constructor(width = 20, height = 20, depth = 20) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.origin = [
            Math.floor(width / 2),
            Math.floor(height / 2),
            Math.floor(depth / 2),
        ];
        console.log(this.origin);
        this.cells = new Uint32Array(width * height * depth);
        this.adj_neighbors = [
            [0, -1, 0], [0, 1, 0],
            [1, 0, 0], [-1, 0, 0],
            [0, 0, -1], [0, 0, 1],
        ];
    }

    index(q, r, s) {
        q += this.origin[0];
        r += this.origin[1];
        s += this.origin[2];

        return q + r * this.width + s * this.width * this.height;
    }

    setCell(q, r, s, value) {
        const idx = this.index(q, r, s);
        console.log(idx, value);
        if (idx >= 0) this.cells[idx] = value;
    }

    getCell(q, r, s) {
        const idx = this.index(q, r, s);
        return idx >= 0 ? this.cells[idx] : 0;
    }

    countLiveNeighbors(q, r, s) {
        let count = 0;
        for (const [dq, dr, ds] of this.adj_neighbors) {
            count += this.getCell(q + dq, r + dr, s + ds);
        }
        return count;
    }

    clear() {
        this.cells.fill(0);
    }

    forEachCell(callback, { skipDead = false } = {}) {
        for (let s = 0; s < this.depth; s++)
            for (let r = 0; r < this.height; r++)
                for (let q = 0; q < this.width; q++) {
                    const idx = this.index(q, r, s);
                    const state = this.cells[idx];
                    if (skipDead && !state) continue;
                    callback(q, r, s, state);
                }
    }

    getBounds() {
        return [
            -Math.floor(this.width / 2),
            Math.floor((this.width - 1) / 2),
            -Math.floor(this.height / 2),
            Math.floor((this.height - 1) / 2),
        ];
    }

    forEachCell(callback, { skipDead = false } = {}) {
        const halfW = Math.floor(this.width / 2);
        const halfH = Math.floor(this.height / 2);
        const halfD = Math.floor(this.depth / 2);

        for (let q = 0; q < this.width; q++) 
            for (let r = 0; r < this.height; r++)
                for (let s = 0; s < this.depth; s++){
                    const idx = this.index(q - halfW, r - halfH, s - halfD);
                    const state = this.cells[idx];
                    if (skipDead && !state) continue;
                    callback(q - halfW, r - halfH, s - halfD, state);
                }
    }

    resize(newWidth, newHeight, newDepth = this.depth) {
        const newCells = new Uint32Array(newWidth * newHeight * newDepth);
        const newOrigin = [
            Math.floor(newWidth / 2),
            Math.floor(newHeight / 2),
            Math.floor(newDepth / 2),
        ];

        const minW = Math.min(this.width, newWidth);
        const minH = Math.min(this.height, newHeight);
        const minD = Math.min(this.depth, newDepth);

        for (let s = 0; s < minD; s++) {
            for (let r = 0; r < minH; r++) {
                for (let q = 0; q < minW; q++) {
                    const oldQ = q - Math.floor(minW / 2);
                    const oldR = r - Math.floor(minH / 2);
                    const oldS = s - Math.floor(minD / 2);

                    const val = this.getCell(oldQ, oldR, oldS);
                    if (val) {
                        const nq = q - Math.floor(newWidth / 2);
                        const nr = r - Math.floor(newHeight / 2);
                        const ns = s - Math.floor(newDepth / 2);

                        const idx = nq + newOrigin[0] +
                                    (nr + newOrigin[1]) * newWidth +
                                    (ns + newOrigin[2]) * newWidth * newHeight;
                        newCells[idx] = val;
                    }
                }
            }
        }

        this.width = newWidth;
        this.height = newHeight;
        this.depth = newDepth;
        this.origin = newOrigin;
        this.cells = newCells;
    }

    getNeighbors(q, r, s) {
        const neighbors = [];
        for (const [dq, dr, ds] of this.adj_neighbors) {
            neighbors.push([q + dq, r + dr, s + ds]);
        }
        return neighbors;
    }


}

class ChunkedCellManager {
    constructor(width, height, depth = 1, chunkSize = 256) {
        console.log("Chunky");
        this.chunkSize = chunkSize;
        this.depth = depth;
        this.chunks = new Map();
        this.adj_neighbors = [
            [0, -1, 0], [0, 1, 0],
            [1, 0, 0], [-1, 0, 0],
            [0, 0, -1], [0, 0, 1],
        ];
    }

    _chunkKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }

    _getChunk(cx, cy, cz) {
        const key = this._chunkKey(cx, cy, cz);
        if (!this.chunks.has(key)) {
            this.chunks.set(key, new Uint32Array(this.chunkSize ** 2 * this.depth));
        }
        return this.chunks.get(key);
    }

    _localIndex(lx, ly, lz) {
        return lx + ly * this.chunkSize + lz * this.chunkSize * this.chunkSize;
    }

    setCell(q, r, s, value) {
        const cx = Math.floor(q / this.chunkSize);
        const cy = Math.floor(r / this.chunkSize);
        const cz = Math.floor(s / this.depth);
        const lx = ((q % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const ly = ((r % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const lz = ((s % this.depth) + this.depth) % this.depth;

        const chunk = this._getChunk(cx, cy, cz);
        chunk[this._localIndex(lx, ly, lz)] = value;
    }

    getCell(q, r, s) {
        const cx = Math.floor(q / this.chunkSize);
        const cy = Math.floor(r / this.chunkSize);
        const cz = Math.floor(s / this.depth);
        const key = this._chunkKey(cx, cy, cz);
        if (!this.chunks.has(key)) return 0;

        const lx = ((q % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const ly = ((r % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const lz = ((s % this.depth) + this.depth) % this.depth;

        const chunk = this.chunks.get(key);
        return chunk[this._localIndex(lx, ly, lz)];
    }

    countLiveNeighbors(q, r, s) {
        let count = 0;
        for (const [dq, dr, ds] of this.adj_neighbors) {
            count += this.getCell(q + dq, r + dr, s + ds);
        }
        return count;
    }

    forEachCell(callback) {
        for (const [key, chunk] of this.chunks) {
            const [cx, cy, cz] = key.split(",").map(Number);
            for (let ly = 0; ly < this.chunkSize; ly++) {
                for (let lx = 0; lx < this.chunkSize; lx++) {
                    for (let lz = 0; lz < this.depth; lz++) {
                        const idx = this._localIndex(lx, ly, lz);
                        const state = chunk[idx];
                        // if (!state) continue;
                        const q = cx * this.chunkSize + lx;
                        const r = cy * this.chunkSize + ly;
                        const s = cz * this.depth + lz;
                        callback(q, r, s, state);
                    }
                }
            }
        }
    }

    clear() {
        this.chunks.clear();
    }

    resize(newWidth, newHeight, newDepth = this.depth) {
        this.depth = newDepth;
        // You could optionally trim chunks outside new bounds, but usually not needed.
        // For now, we’ll just leave existing chunks as-is.
    }

    getNeighbors(q, r, s) {
        const neighbors = [];
        for (const [dq, dr, ds] of this.adj_neighbors) {
            neighbors.push([q + dq, r + dr, s + ds]);
        }
        return neighbors;
    }

}

class CellManager {
    constructor(width = 20, height = 20, depth = 4) {
        this.threshold = 2500;
        const useChunked = width > this.threshold || height > this.threshold;

        if (useChunked) {
            console.warn(`Grid ${width}x${height} is large — using ChunkedCellManager.`);
            this.impl = new ChunkedCellManager(width+2, height+2, depth);
        } else {
            this.impl = new FlatCellManager(width +2, height+2, depth);
        }
    }

    setCell(...args) { this.impl.setCell(...args); }
    getCell(...args) { return this.impl.getCell(...args); }
    countLiveNeighbors(...args) { return this.impl.countLiveNeighbors(...args); }
    forEachCell(...args) { this.impl.forEachCell(...args); }
    clear(...args) { this.impl.clear(...args); }
    getNeighbors(...args) { return this.impl.getNeighbors(...args); }

    index(...args) {
        if (typeof this.impl.index === "function") {
            return this.impl.index(...args);
        } else {
            return -1;
        }
    }

    resize(newWidth, newHeight, newDepth = 4) {
        const useChunked = newWidth > this.threshold || newHeight > this.threshold;

        // If implementation type changes, migrate data
        if ((useChunked && !(this.impl instanceof ChunkedCellManager)) ||
            (!useChunked && !(this.impl instanceof FlatCellManager))) {
            console.warn("Switching cell manager type due to resize");
            const oldImpl = this.impl;
            const NewImpl = useChunked ? ChunkedCellManager : FlatCellManager;
            this.impl = new NewImpl(newWidth + 2, newHeight + 2, newDepth);

            // // Copy over existing cells
            // oldImpl.forEachCell((q, r, s, state) => {
            //     if (state) this.impl.setCell(q, r, s, state);
            // });
        } else {
            this.impl.resize(newWidth + 2, newHeight + 2, newDepth);
        }
    }

}

export { CellManager };