class Plutonium {
    constructor() {
        this.resetPosition();
        this.radius = 15; // Set in updateDimensions
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.color = { r: 10, g: 80, b: 20 }; // Dark green
    }

    resetPosition() {
        // Start near bottom center of sim
        this.x = screenSimWidth / 2;
        this.y = screenHeight - 60*globalScale;
    }

    updateDimensions() {
        this.radius = 15 * globalScale; // Diameter 30 * globalScale
        
        // Clamp position if out of bounds after resize
        this.x = Math.max(this.radius, Math.min(this.x, screenSimWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, screenHeight - this.radius));
    }

    update() {
        this.radius = 15 * globalScale;

        // Heat Generation
        // Find water cell below
        if (waterSystem && waterSystem.waterCells) {
             let gx = Math.floor(this.x / uraniumAtomsSpacingX);
             let gy = Math.floor(this.y / uraniumAtomsSpacingY);
             
             if (gx >= 0 && gx < uraniumAtomsCountX && gy >= 0 && gy < uraniumAtomsCountY) {
                 let index = gy * uraniumAtomsCountX + gx;
                 if (waterSystem.waterCells[index]) {
                     const dt = deltaTime / 1000.0;
                     waterSystem.waterCells[index].temperature += 20000 * dt;
                 }
             }
        }
    }

    draw(ctx, offsetX) {
        this.radius = 15 * globalScale;
        
        // Interaction (Handle input here so it works when paused)
        if (mouseIsPressed) {
            const mPos = scaleMouse(mouseX, mouseY);
            
            if (!this.dragging) {
                // Check if clicked
                const dx = mPos.x - this.x;
                const dy = mPos.y - this.y;
                if (Math.sqrt(dx*dx + dy*dy) < this.radius) {
                    this.dragging = true;
                    this.dragOffset.x = this.x - mPos.x;
                    this.dragOffset.y = this.y - mPos.y;
                }
            } else {
                // Dragging
                this.x = mPos.x + this.dragOffset.x;
                this.y = mPos.y + this.dragOffset.y;

                // Clamp to simulation area
                this.x = Math.max(this.radius, Math.min(this.x, screenSimWidth - this.radius));
                this.y = Math.max(this.radius, Math.min(this.y, screenHeight - this.radius));
            }
        } else {
            this.dragging = false;
        }

        const drawX = this.x + offsetX;
        const drawY = this.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(20, 100, 30, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}
