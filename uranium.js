// UraniumAtom Class
class UraniumAtom {
  constructor(x, y, waterCell) {
    this.position = createVector(x, y);
    this.radius = settings.uraniumSize;
    this.color = color(50);
    this.isHit = false;
    this.flash = 0;
    this.heat = 25;
    this.waterCell = waterCell;
    this.index = null;
  }

  draw() {
    noStroke();
    fill(this.color);
    rectMode(CENTER);
    rect(this.position.x, this.position.y, this.radius * 2, this.radius * 2);
  }

  update() {
    if (random() < settings.decayProbability) {
      this.createNeutron();
    }
    this.flash--;
    this.flash = Math.max(0, this.flash);
    this.color = computeUraniumColor(this.heat, this.flash);
    this.heatTransferToWater();
  }

  heatTransferToWater() {
    const deltaT = (this.heat - this.waterCell.temperature) * settings.uraniumToWaterHeatTransfer;
    this.heat -= deltaT;
    this.waterCell.temperature += deltaT;
    energyThisFrame += deltaT;
  }

  hitByNeutron() {
    this.isHit = true;
    this.heat += settings.heatingRate;
    this.flash = 10; // Flash for 10 frames
  }

  createNeutron() {
    addNeutron(this.position.x, this.position.y, this.radius);
  }
}

function computeUraniumColor(heat, flash) {
  if (flash > 0) {
    return color(255, 255, 255);
  }

  if (heat <= 250) {
    const t = heat / 250;
    const r = lerp(0, 255, t);
    const g = lerp(40, 0, t);
    return color(clamp255(r), clamp255(g), 0);
  }

  if (heat <= 1000) {
    const t = (heat - 250) / 250;
    const g = lerp(0, 255, t);
    return color(255, clamp255(g), 0);
  }

  if (heat <= 1500) {
    const t = (heat - 500) / 500;
    const b = lerp(0, 255, t);
    return color(255, 255, clamp255(b));
  }

  return color(255, 255, 255);
}

function clamp255(value) {
  return Math.max(0, Math.min(255, value));
}