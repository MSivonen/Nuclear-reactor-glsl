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

        this.spawnTimer += deltaTime / 1000.0;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (window.neutron) {
                const randAngle = Math.random() * .2 - .1;
                const randPosY = globalScale * Math.random() * 20 - 10;
                const randPosX = globalScale * Math.random() * 20 - 10;
                neutron.spawn(this.x + randPosX, this.y + randPosY, this.radius / 2, randAngle);
            }
        }
    }

    draw(ctx, offsetX) {
        this.radius = 15 * globalScale;

        // Interaction (Handle input here so it works when paused)
        const mPos = scaleMouse(mouseX, mouseY);

        if (mouseIsPressed) {
            if (!this.dragging) {
                // Only start dragging if no other UI element has captured the drag
                if (!ui.canvas.activeDrag || ui.canvas.activeDrag.type === 'californium') {
                    const dx = mPos.x - this.x;
                    const dy = mPos.y - this.y;
                    if (Math.sqrt(dx * dx + dy * dy) < this.radius) {
                        this.dragging = true;
                        this.dragOffset.x = this.x - mPos.x;
                        this.dragOffset.y = this.y - mPos.y;
                        ui.canvas.activeDrag = { type: 'californium' };
                    }
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
            if (this.dragging && ui.canvas && ui.canvas.activeDrag && ui.canvas.activeDrag.type === 'californium') ui.canvas.activeDrag = null;
            this.dragging = false;
        }

        const drawX = this.x + offsetX;
        const drawY = this.y;
        // Compute transparency based on overlap with meters
        let alpha = 1.0;
        try {
            const meters = [ui.powerMeter, ui.tempMeter];
            for (const m of meters) {
                if (!m) continue;
                const meterCenterX = offsetX + m.x;
                const meterCenterY = m.y;
                const dx = drawX - meterCenterX;
                const dy = drawY - meterCenterY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const influenceRadius = Math.max(m.width, m.height) * 0.6;
                const factor = Math.min(Math.max(1 - dist / influenceRadius, 0), 1);
                // Lerp alpha towards 0.3 when fully overlapping
                const target = 1.0 - 0.7 * factor;
                alpha = Math.min(alpha, target);
            }
        } catch (e) {
            // ignore
        }

        ctx.save();
        ctx.globalAlpha = alpha;
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
