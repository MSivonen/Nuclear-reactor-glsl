class ControlRod {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = controlRodWidth;
        this.height = controlRodHeight;
        this.color = color(44, 22, 4);
        this.targetY = controlRodsStartPos-screenDrawHeight;
        this.movementSpeed = 1;
    }

    draw() {
        fill(this.color);
        rectMode(CORNER);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        if (this.y < this.targetY) {
            this.y += this.movementSpeed;
        } else if (this.y > this.targetY) {
            this.y -= this.movementSpeed;
        }
    }
}


class ControlRodsSlider {
    //make a draggable control slider
    constructor() {
        this.x = 15;
        this.y = controlRodsStartPos;
        this.width = width;
        this.height = height;
    }

    slider() {
        fill(255);
        rectMode(CORNER);

        rect(this.x, 0, 10, 600);
        fill(255, 0, 0);
        const sx = this.x - 10;
        const sy = this.y - 5;
        const sw = 30;
        const sh = 10;
        rect(sx, sy, sw, sh);
        if (scaleMouse(mouseX, 0).x > sx && scaleMouse(mouseX, 0).x < sx + sw) {
            if (mouseIsPressed) {
                this.y = constrain(scaleMouse(0, mouseY).y, 0 + sh / 2, screenDrawHeight - sh / 2); // Clamp the position to screenDrawSize
                controlRods.forEach(controlRod => {
                    controlRod.targetY = this.y - screenDrawHeight + sh / 2;
                });
            }
        }
    }
}