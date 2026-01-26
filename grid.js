class Grid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = [];
  }

  addAtom(atom) {
    let gridX = Math.floor(atom.position.x / this.cellSize);
    let gridY = Math.floor(atom.position.y / this.cellSize);

    if (!this.grid[gridX]) this.grid[gridX] = [];
    if (!this.grid[gridX][gridY]) this.grid[gridX][gridY] = [];

    this.grid[gridX][gridY].push(atom);
  }

  getAtomsInArea(x, y) {
    let atoms = [];
    let gridX = Math.floor(x / this.cellSize);
    let gridY = Math.floor(y / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (this.grid[gridX + dx] && this.grid[gridX + dx][gridY + dy]) {
          atoms = atoms.concat(this.grid[gridX + dx][gridY + dy]);
        }
      }
    }

    return atoms;
  }
}
