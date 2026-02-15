class Plutonium {
    constructor() {
        this.baseRadius = 15;
        this.maxRadius = 30;
        this.baseHeatPerSecond = 6000;
        this.maxUpgradeLevel = 12;
        this.upgradeLevel = 0;
        this.heatPerSecond = this.baseHeatPerSecond;
        this.electronCount = 1;
        this.resetPosition();
        this.radius = 15; // Set in updateDimensions
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.color = { r: 80, g: 80, b: 80 }; // Grau / Metallic
        this.seed = Math.random() * 1000.0;
    }

    resetPosition() {
        this.x = screenSimWidth / 5;
        this.y = screenHeight - 60*globalScale;
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

        const heatMultiplier = 1 + 1.2 * t;
        this.heatPerSecond = this.baseHeatPerSecond * heatMultiplier;
        this.electronCount = 1 + this.upgradeLevel;
    }

    syncFromPlayer() {
        if (typeof player !== 'undefined' && player) {
            const level = Number.isFinite(player.plutoniumUpgradeCount) ? player.plutoniumUpgradeCount : 0;
            this.applyUpgradeLevel(level);
        } else {
            this.applyUpgradeLevel(0);
        }
    }

    update() {
        const mPos = scaleMouse(mouseX, mouseY);

        if (mouseIsPressed) {
            if (!this.dragging) {
                // Only start dragging if no other UI element has captured the drag
                if (!ui.canvas.activeDrag || ui.canvas.activeDrag.type === 'plutonium') {
                    const dx = mPos.x - this.x;
                    const dy = mPos.y - this.y;
                    if (Math.sqrt(dx*dx + dy*dy) < this.radius) {
                        this.dragging = true;
                        this.dragOffset.x = this.x - mPos.x;
                        this.dragOffset.y = this.y - mPos.y;
                        ui.canvas.activeDrag = { type: 'plutonium' };
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
            if (this.dragging && ui.canvas && ui.canvas.activeDrag && ui.canvas.activeDrag.type === 'plutonium') ui.canvas.activeDrag = null;
            this.dragging = false;
        }

        // Heat Generation
        // Find water cell below
        if (waterSystem && waterSystem.waterCells) {
             let gx = Math.floor(this.x / uraniumAtomsSpacingX);
             let gy = Math.floor(this.y / uraniumAtomsSpacingY);
             
             if (gx >= 0 && gx < uraniumAtomsCountX && gy >= 0 && gy < uraniumAtomsCountY) {
                 let index = gy * uraniumAtomsCountX + gx;
                 if (waterSystem.waterCells[index]) {
                     const dt = deltaTime / 1000.0;
                     waterSystem.waterCells[index].temperature += this.heatPerSecond * dt;
                 }
             }
        }
    }

    draw(ctx, offsetX) {
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
        ctx.strokeStyle = "rgba(20, 100, 30, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}
