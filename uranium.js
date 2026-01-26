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
    if (this.flash === 0) {
      let c;
      if (this.heat <= 250) {
        c = lerpColor(color(0, 40, 0), color(255, 0, 0), this.heat / 250);
      } else if (this.heat <= 1000) {
        const heatRelativeTo250 = (this.heat - 250) / 250;
        c = lerpColor(color(255, 0, 0), color(255, 255, 0), heatRelativeTo250);
      } else if (this.heat <= 1500) {
        const heatRelativeTo500 = (this.heat - 500) / 500;
        c = lerpColor(color(255, 255, 0), color('white'), heatRelativeTo500);
      } else {
        // if temperature is greater than 1000, set color to white
        c = color('white');
      }
      this.color = c;
    } else {
      this.color = color('white');
    }
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