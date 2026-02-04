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

  // Temperature thresholds for color transitions
  const redStart = 150;
  const redEnd = 500;
  const yellowStart = 400; // Overlap with red by 100°C (redEnd - yellowStart = 100)
  const yellowEnd = 1000;
  const whiteStart = 900;
  const blueRange = 500;

  // Red channel: redStart to redEnd
  const redRange = Math.max(1, redEnd - redStart);
  const r = 255 * Math.min(1, Math.max(0, (temp - redStart) / redRange));

  // Green channel: yellowStart to yellowEnd
  const greenRange = Math.max(1, yellowEnd - yellowStart);
  const g = 255 * Math.min(1, Math.max(0, (temp - yellowStart) / greenRange));

  // Blue channel: whiteStart onwards
  const safeBlueRange = Math.max(1, blueRange);
  const b = 255 * Math.min(1, Math.max(0, (temp - whiteStart) / safeBlueRange));

  return { r: clamp255(r), g: clamp255(g), b: Math.min(100,clamp255(b)), a: 255 };
}

function clamp255(value) {
  return Math.max(0, Math.min(255, value));
}