class CellManager {
    constructor() {
        this.cells = new Map();
        this.neighborsMap = new Map();
        this.boundaryCells = new Map();
        
        this.adj_neighbors = [[0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0]];
        
        this.infiniteGrid = false;
        this.boundaryType = "wrap";
        this.neighborType = "adjacent";
        this.bounds = [0, 0, 0, 0];
    }

    toString() {
        return this.cells;
    }

    clear() {
        this.cells.clear();
        this.neighborsMap.clear();
        this.boundaryCells.clear();
    }

    getNeighbors(q, r, s) {
        return this.adj_neighbors.map(([dq, dr, ds]) => [
            dq + q,
            dr + r, 
            ds + s
        ]);
    }

    buildNeighborsMap() {
        this.neighborsMap.clear();
        const [minQ, maxQ, minR, maxR] = this.bounds;

        for (let q = minQ; q <= maxQ; q++) {
            for (let r = minR; r <= maxR; r++) {
                const neighbors = this.getNeighbors(q, r, 0);
                this.neighborsMap.set(this.createCubeKey(q, r, 0), neighbors);
            }
        }
        
        return this.neighborsMap;
    }

    addNeighbors(q, r, s) {
        const neighbors = this.getNeighbors(q, r, s);
        this.neighborsMap.set(this.createCubeKey(q, r, s), neighbors);
    }

    createCubeKey(q, r, s) {
        return `${q},${r},${s}`;
    }

    parseCubeKey(key) {
        return key.split(',').map(Number);
    }
}

export { CellManager };