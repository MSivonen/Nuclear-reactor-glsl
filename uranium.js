// UraniumAtom Class
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
    this.hasAtom = hasAtom;
    this.atomGroup = atomGroup;
  }

  draw(ctx, offsetX = 0) {
    const x = offsetX + this.position.x;
    const y = this.position.y;
    ctx.save();
    ctx.fillStyle = `rgba(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)}, ${this.color.a / 255})`;
    ctx.fillRect(x - this.radius, y - this.radius, this.radius * 2, this.radius * 2);
    ctx.restore();
  }

  update() {
    if (Math.random() < settings.decayProbability) {
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

  }

  hitByNeutron() {
    this.isHit = true;
    this.heat += settings.heatingRate;
    this.flash = 10; // Flash for 10 frames
  }

  createNeutron() {
    neutron.spawn(this.position.x, this.position.y, this.radius);
  }
}

function computeUraniumColor(heat, flash) {
  if (flash > 0) {
    return { r: 255, g: 255, b: 255, a: 255 };
  }

  if (heat <= 250) {
    const t = heat / 250;
    const r = lerp(0, 255, t);
    const g = lerp(40, 0, t);
    return { r: clamp255(r), g: clamp255(g), b: 0, a: 255 };
  }

  if (heat <= 1000) {
    const t = (heat - 250) / 250;
    const g = lerp(0, 255, t);
    return { r: 255, g: clamp255(g), b: 0, a: 255 };
  }

  if (heat <= 1500) {
    const t = (heat - 500) / 500;
    const b = lerp(0, 255, t);
    return { r: 255, g: 255, b: clamp255(b), a: 255 };
  }

  return { r: 255, g: 255, b: 255, a: 255 };
}

function clamp255(value) {
  return Math.max(0, Math.min(255, value));
}