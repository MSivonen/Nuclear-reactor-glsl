class UraniumAtom {
  constructor(x, y, waterCell, hasAtom, atomGroup) {
    this.position = { x: x, y: y };
    this.radius = settings.uraniumSize;
    this.color = { r: 50, g: 50, b: 50, a: 255 };
    this.isHit = false;
    this.flash = 0;
    this.heat = 25;
    this.waterCell = waterCell;
    this.index = null;
    this.hasAtom = Boolean(hasAtom);
    this.atomGroup = atomGroup;
    this.colInGroup = null;
    this.rowInGroup = null;
  }

  draw(ctx, offsetX = 0) {
    if (!this.hasAtom) return;
    const x = offsetX + this.position.x;
    const y = this.position.y;
    ctx.save();
    ctx.fillStyle = `rgba(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)}, ${this.color.a / 255})`;
    ctx.fillRect(x - this.radius, y - this.radius, this.radius * 2, this.radius * 2);
    ctx.restore();
  }

  update() {
    if (!this.hasAtom) return;
    if (Math.random() < settings.decayProbability) {
      this.createNeutron();
    }
    this.flash--;
    this.flash = Math.max(0, this.flash);
    this.color = computeUraniumColor(this.heat, this.flash);
    this.heatTransferToWater();
  }

  heatTransferToWater() {
    if (!this.hasAtom) return;
    const tempDiff = this.heat - this.waterCell.temperature;
    const baseTransfer = tempDiff * settings.uraniumToWaterHeatTransfer;
    // Boost transfer when temperature difference is high
    const diffBoost = 1 + Math.min(Math.abs(tempDiff) / 500, 2);
    const deltaT = baseTransfer * diffBoost;
    this.heat -= deltaT;
    this.waterCell.temperature += deltaT;

  }

  hitByNeutron() {
    if (!this.hasAtom) return;
    this.isHit = true;
    this.heat += settings.heatingRate;
    //this.flash = 10; // Flash for 10 frames
  }

  createNeutron() {
    neutron.spawn(this.position.x, this.position.y, this.radius);
  }
}

function computeUraniumColor(heat, flash) {
  if (flash > 0) {
    return { r: 255, g: 255, b: 255, a: 255 };
  }

  const temp = Math.max(15, heat);

  const redStart = 150;
  const redEnd = 500;
  const yellowStart = 400;
  const yellowEnd = 1000;
  const whiteStart = 900;
  const blueRange = 500;

  const redRange = Math.max(1, redEnd - redStart);
  const r = 255 * Math.min(1, Math.max(0, (temp - redStart) / redRange));

  const greenRange = Math.max(1, yellowEnd - yellowStart);
  const g = 255 * Math.min(1, Math.max(0, (temp - yellowStart) / greenRange));

  const safeBlueRange = Math.max(1, blueRange);
  const b = 255 * Math.min(1, Math.max(0, (temp - whiteStart) / safeBlueRange));

  return { r: clamp255(r), g: clamp255(g), b: Math.min(100,clamp255(b)), a: 255 };
}

function clamp255(value) {
  return Math.max(0, Math.min(255, value));
}

const ATOM_GROUP_COLUMNS = 6;
const ATOM_GROUP_COUNT = 6;
const STARTING_GROUP_COUNT = 2;
const STARTING_GROUP_COLUMNS = 3;
const STARTING_GROUP_ROWS = 15;
const STARTING_ATOMS_PER_GROUP = STARTING_GROUP_COLUMNS * STARTING_GROUP_ROWS;

let atomGroups = [];

function buildAtomGroups() {
  atomGroups = new Array(ATOM_GROUP_COUNT).fill(null).map((_, idx) => ({
    index: idx,
    atomIndices: [],
    orderedAtomIndices: [],
    capacity: 0
  }));

  for (let i = 0; i < uraniumAtoms.length; i++) {
    const a = uraniumAtoms[i];
    if (a.atomGroup < 0 || a.atomGroup >= ATOM_GROUP_COUNT) continue;
    atomGroups[a.atomGroup].atomIndices.push(i);
  }

  atomGroups.forEach(group => {
    const cols = ATOM_GROUP_COLUMNS;
    const rows = uraniumAtomsCountY;
    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;
    const ordered = group.atomIndices.slice().sort((ai, bi) => {
      const a = uraniumAtoms[ai];
      const b = uraniumAtoms[bi];
      const ax = a.colInGroup;
      const ay = a.rowInGroup;
      const bx = b.colInGroup;
      const by = b.rowInGroup;
      const da = (ax - centerX) * (ax - centerX) + (ay - centerY) * (ay - centerY);
      const db = (bx - centerX) * (bx - centerX) + (by - centerY) * (by - centerY);
      if (da !== db) return da - db;
      if (ax !== bx) return ax - bx;
      return ay - by;
    });
    group.orderedAtomIndices = ordered;
    group.capacity = ordered.length;
  });
}

function getAtomGroupOrderByCenter() {
  const center = (ATOM_GROUP_COUNT - 1) / 2;
  const indices = Array.from({ length: ATOM_GROUP_COUNT }, (_, i) => i);
  return indices.sort((a, b) => {
    const da = Math.abs(a - center);
    const db = Math.abs(b - center);
    if (da !== db) return da - db;
    return a - b;
  });
}

function initializePlayerAtomGroups(playerObj) {
  if (playerObj.ownedGroups.length === 0) {
    const order = getAtomGroupOrderByCenter();
    playerObj.ownedGroups = order.slice(0, STARTING_GROUP_COUNT);
    playerObj.groupAtomCounts = new Array(ATOM_GROUP_COUNT).fill(0);
    playerObj.ownedGroups.forEach(g => {
      const cap = getGroupCapacity(g);
      playerObj.groupAtomCounts[g] = Math.min(cap, STARTING_ATOMS_PER_GROUP);
    });
  }

  applyPlayerAtomState(playerObj);

  const firstOwned = playerObj.ownedGroups[0] || 0;
  shop.setTargetAtomGroup(firstOwned);
}

function applyPlayerAtomState(playerObj) {
  const owned = new Set(playerObj.ownedGroups || []);
  for (let i = 0; i < uraniumAtoms.length; i++) {
    uraniumAtoms[i].hasAtom = false;
  }
  for (let g = 0; g < ATOM_GROUP_COUNT; g++) {
    if (!owned.has(g)) continue;
    const group = atomGroups[g];
    if (!group) continue;
    const count = Math.max(0, Math.min(group.capacity, playerObj.groupAtomCounts[g] || 0));
    for (let i = 0; i < count; i++) {
      const atomIndex = group.orderedAtomIndices[i];
      if (uraniumAtoms[atomIndex]) uraniumAtoms[atomIndex].hasAtom = true;
    }
  }
}

function getGroupCapacity(groupIndex) {
  return atomGroups[groupIndex].capacity || 0;
}

function getGroupAtomCount(groupIndex) {
  return player.groupAtomCounts[groupIndex] || 0;
}

function getGroupAvailableSlots(groupIndex) {
  return Math.max(0, getGroupCapacity(groupIndex) - getGroupAtomCount(groupIndex));
}

function getTotalAtomCount() {
  return player.groupAtomCounts.reduce((sum, val) => sum + (val || 0), 0);
}

function getAtomGroupCount() {
  return ATOM_GROUP_COUNT;
}

function addAtomsToGroup(groupIndex, count) {
  if (!player.ownedGroups.includes(groupIndex)) return 0;
  const group = atomGroups[groupIndex];

  const available = getGroupAvailableSlots(groupIndex);
  const toAdd = Math.max(0, Math.min(available, count));
  if (toAdd <= 0) return 0;

  const current = getGroupAtomCount(groupIndex);
  const newCount = current + toAdd;
  player.groupAtomCounts[groupIndex] = newCount;

  for (let i = current; i < newCount; i++) {
    const atomIndex = group.orderedAtomIndices[i];
    if (uraniumAtoms[atomIndex]) uraniumAtoms[atomIndex].hasAtom = true;
  }
  return toAdd;
}

function unlockAtomGroup(groupIndex) {
  if (player.ownedGroups.includes(groupIndex)) return false;
  player.ownedGroups.push(groupIndex);
  const cap = getGroupCapacity(groupIndex);
  const startCount = Math.min(cap, STARTING_ATOMS_PER_GROUP);
  player.groupAtomCounts[groupIndex] = Math.max(player.groupAtomCounts[groupIndex] || 0, startCount);
  applyPlayerAtomState(player);
  return true;
}

function getNextUnlockableGroup() {
  const owned = new Set(player.ownedGroups);
  const order = getAtomGroupOrderByCenter();
  for (let i = 0; i < order.length; i++) {
    if (!owned.has(order[i])) return order[i];
  }
  return null;
}

// Expose helpers
window.buildAtomGroups = buildAtomGroups;
window.initializePlayerAtomGroups = initializePlayerAtomGroups;
window.applyPlayerAtomState = applyPlayerAtomState;
window.getAtomGroupOrderByCenter = getAtomGroupOrderByCenter;
window.getGroupCapacity = getGroupCapacity;
window.getGroupAtomCount = getGroupAtomCount;
window.getGroupAvailableSlots = getGroupAvailableSlots;
window.getTotalAtomCount = getTotalAtomCount;
window.getAtomGroupCount = getAtomGroupCount;
window.addAtomsToGroup = addAtomsToGroup;
window.unlockAtomGroup = unlockAtomGroup;
window.getNextUnlockableGroup = getNextUnlockableGroup;