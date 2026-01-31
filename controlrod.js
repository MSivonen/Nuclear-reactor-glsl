class ControlRod {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = controlRodWidth;
        this.height = controlRodHeight;
        this.color = { r: 44, g: 22, b: 4, a: 255 };
        this.targetY = controlRodsStartPos-screenHeight;
        this.movementSpeed = 1;
    }

    draw(ctx, offsetX = 0) {
        const x = offsetX + this.x;
        const y = this.y;
        ctx.save();
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a/255})`;
        ctx.fillRect(x, y, this.width, this.height);
        ctx.restore();
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
    constructor() {
        this.x = 15;
        this.y = controlRodsStartPos;
    }

    draw(ctx, offsetX) {
        // Position relative to sim area
        const drawX = offsetX + this.x;
        
        ctx.fillStyle = 'white';
        // controlRodHeight is 600
        ctx.fillRect(drawX, 0, 10, controlRodHeight);
        
        ctx.fillStyle = 'rgb(255, 0, 0)';
        const sx = drawX - 10;
        const sy = this.y - 5;
        const sw = 30;
        const sh = 10;
        ctx.fillRect(sx, sy, sw, sh);

        // Input logic
        // p5.mouseX are relative to screen top-left (check setup())
        // scaleMouse(mouseX, mouseY) returns Sim coords.
        // this.x is 15 (Sim coords).
        
        // Wait, scaleMouse returns coords centered at 0,0? No.
        // Let's check scaleMouse again.
        // screenSimWidth = 800.
        // `finalX = scaledX + screenSimWidth / 2;`
        // 0..800. Correct.
        
        const mousePos = scaleMouse(mouseX, mouseY);
        // mousePos is in Sim coords.
        // Sim Slider Rect is at `this.x - 10`.
        // `sx` variable above is screen coords.
        // `this.x` is sim coords (15).
        
        // Original logic:
        // if (scaleMouse(mouseX, 0).x > sx && scaleMouse(mouseX, 0).x < sx + sw) {
        // Wait, original logic compared `scaleMouse(...).x` (sim coord) with `sx`.
        // `sx = this.x - 10` (if `rect` was p5 translated)
        // OR `sx` was screen coord?
        
        // In original p5 `renderScene`:
        // translate(screenSimWidth / 2, screenHeight / 2); scale(1); translate(-screenSimWidth / 2, -screenHeight / 2);
        // It resets origin to top-left of SIM area (conceptually, if centered).
        // If simulation area is 800x600, positioned at center of 1067x600.
        // Origin (0,0) of p5 translate stack corresponds to top-left of Sim area.
        
        // So `rect(sx, ...)` draws at Sim coords. 
        // `sx = this.x - 10`. `this.x = 15`. `sx = 5`.
        // So it draws at x=5 in Sim coords.
        
        // `scaleMouse().x` returns Sim coords (0..800).
        // So comparing scaleMouse().x (Sim) with `sx` (Sim) is CORRECT.
        
        // In my new `draw(ctx, offsetX)`:
        // `this.x` is Sim (15).
        // `sx` (variable in `ControlRodsSlider`) was derived from `this.x`.
        // `drawX` uses `offsetX` to map to Screen.
        
        // Logic for mouse interaction should use Sim coords.
        const simSX = this.x - 10;
        const simSW = 30;
        const simSH = 10;
        
        const simMousePos = scaleMouse(mouseX, mouseY);
        
        // We really want to check if mouse is over the handle.
        if (simMousePos.x > simSX && simMousePos.x < simSX + simSW) {
            if (mouseIsPressed) {
                // Clamp to screenHeight (0..600)
                this.y = Math.min(Math.max(simMousePos.y, 0 + simSH / 2), screenHeight - simSH / 2);
                controlRods.forEach(controlRod => {
                    // controlRod logic
                    controlRod.targetY = this.y - screenHeight + simSH / 2;
                });
            }
        }
    }
}