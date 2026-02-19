class Californium {
    constructor() {
        this.baseRadius = 15;
        this.maxRadius = 30;
        this.maxUpgradeLevel = 12;
        this.upgradeLevel = 0;
        this.baseSpawnInterval = 0.02;
        this.minSpawnInterval = 0.006;
        this.spawnBurstCount = 1;
        this.electronCount = 1;
        this.resetPosition();
        this.radius = 15; // Set in updateDimensions
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.color = { r: 200, g: 200, b: 200 }; // Light Grau / Metallic
        this.seed = Math.random() * 1000.0;
        this.spawnTimer = 0;
        this.spawnInterval = this.baseSpawnInterval; // Seconds between spawns
    }

    resetPosition() {
        // Start near bottom center of sim, slightly offset from plutonium
        this.x = screenSimWidth / 2 + 50 * globalScale;
        this.y = screenHeight - 60 * globalScale;
    }

    updateDimensions() {
        this.applyUpgradeLevel(this.upgradeLevel);
        
        // Clamp position if out of bounds after resize
        this.x = Math.max(this.radius, Math.min(this.x, screenSimWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, screenHeight - this.radius));
    }

    applyUpgradeLevel(level) {
        const maxLevel = Number.isFinite(this.maxUpgradeLevel) && this.maxUpgradeLevel > 0 ? this.maxUpgradeLevel : 1;
        this.upgradeLevel = Math.max(0, Math.min(level || 0, maxLevel));
        const t = this.upgradeLevel / maxLevel;

        const baseRadiusScaled = this.baseRadius * globalScale;
        const maxRadiusScaled = this.maxRadius * globalScale;
        this.radius = baseRadiusScaled + (maxRadiusScaled - baseRadiusScaled) * t;

        this.spawnInterval = this.baseSpawnInterval + (this.minSpawnInterval - this.baseSpawnInterval) * t;
        this.spawnBurstCount = 1 + Math.floor(this.upgradeLevel / 3);
        this.electronCount = 1 + this.upgradeLevel;
    }

    syncFromPlayer() {
        if (typeof player !== 'undefined' && player) {
            const level = Number.isFinite(player.californiumUpgradeCount) ? player.californiumUpgradeCount : 0;
            this.applyUpgradeLevel(level);
        } else {
            this.applyUpgradeLevel(0);
        }
    }

    updateInteraction() {
        this.applyUpgradeLevel(this.upgradeLevel);

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

    }

    stepSpawn(dtSeconds) {
        const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? dtSeconds : (1.0 / 60.0);
        this.spawnTimer += dt;
        while (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            if (window.neutron) {
                for (let i = 0; i < this.spawnBurstCount; i++) {
                    const randAngle = Math.random() * .2 - .1;
                    const randPosY = globalScale * Math.random() * 20 - 10;
                    const randPosX = globalScale * Math.random() * 20 - 10;
                    neutron.spawn(this.x + randPosX, this.y + randPosY, this.radius / 2, randAngle);
                }
            }
        }
    }

    draw(ctx, offsetX) {
        this.applyUpgradeLevel(this.upgradeLevel);

        const drawX = this.x + offsetX;
        const drawY = this.y;

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
