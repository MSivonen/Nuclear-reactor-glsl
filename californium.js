class Californium {
    constructor() {
        this.resetPosition();
        this.radius = 15; // Set in updateDimensions
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.color = { r: 255, g: 165, b: 0 }; // Orange
        this.spawnTimer = 0;
        this.spawnInterval = 0.01; // Seconds between spawns
    }

    resetPosition() {
        // Start near bottom center of sim, slightly offset from plutonium
        this.x = screenSimWidth / 2 + 50 * globalScale;
        this.y = screenHeight - 60 * globalScale;
    }

    updateDimensions() {
        this.radius = 15 * globalScale;
        
        // Clamp position if out of bounds after resize
        this.x = Math.max(this.radius, Math.min(this.x, screenSimWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, screenHeight - this.radius));
    }

    update() {
        this.radius = 15 * globalScale;

        // Neutron Emission
        this.spawnTimer += deltaTime / 1000.0;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            // Spawn neutron
            if (window.neutron) {
                // Spawn one or more neutrons
                neutron.spawn(this.x, this.y, this.radius);
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
        ctx.strokeStyle = "rgba(200, 100, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Simple shine effect
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(drawX - this.radius * 0.3, drawY - this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
