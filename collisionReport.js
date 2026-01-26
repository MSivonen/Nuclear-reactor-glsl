class CollisionReport {
  constructor() {
    this.count = 0;
    this.atomIndices = new Uint32Array(MAX_NEUTRONS_SQUARED);
  }

  reset() {
    this.count = 0;
  }

  add(atomIndex) {
    if (this.count >= MAX_NEUTRONS_SQUARED) return;
    this.atomIndices[this.count++] = atomIndex;
  }
}
