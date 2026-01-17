// Neutron Class
class Neutron {
  constructor(x, y, origin = 'decay') {
    this.position = createVector(x, y);
    this.radius = neutronSize;
    this.color = color(50, 255, 50, 55);
    this.direction = p5.Vector.random2D();
    this.speed = neutronSpeed;
    this.direction.setMag(this.speed);
    this.alive = true;
    this.origin = origin;
    this.slowed = false;
    this.debounceTime = 10;
    this.lastCollisionFrame = frameCount;
  }

  draw() {
    // No need to draw here, as we are using shaders
  }

  update() {
    if (this.position.x < 0 || this.position.x > screenDrawWidth || this.position.y < 0 || this.position.y > screenDrawHeight) {
      this.alive = false;
      return;
    }

    this.position.add(this.direction);

    let nearbyAtoms = grid.getAtomsInArea(this.position.x, this.position.y);
    for (let atom of nearbyAtoms) {
      let d = dist(atom.position.x, atom.position.y, this.position.x, this.position.y);
      if (d < atom.radius + this.radius && random() < collisionProbability
          && frameCount > this.lastCollisionFrame + this.debounceTime) {
        atom.hitByNeutron();
        collisionsThisSecond++;
        this.lastCollisionFrame = frameCount;
      }
    }

    for (let rod of controlRods) {
      if (this.position.x > rod.x && this.position.x < rod.x + controlRodWidth && this.position.y > rod.y && this.position.y < rod.y + controlRodHeight) {
        if (random() < controlRodAbsorptionProbability) {
          this.alive = false;
        } else if (!this.slowed) {
          this.speed /= 2;
          this.direction.setMag(this.speed);
          this.slowed = true;
        }
      }
    }
  }
}