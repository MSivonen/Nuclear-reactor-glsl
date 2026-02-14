class PrestigeScreen {
    constructor() {
        this.transition = {
            boomHold: 3.0,
            greenIn: 0.65,
            greenHold: 0.28,
            greenToPrestige: 0.9
        };
        this.button = null;
        this.hovered = false;
    }

    getTransitionPhases() {
        return { ...this.transition };
    }

    getTransitionVisuals(elapsedSeconds) {
        const t = Math.max(0, elapsedSeconds || 0);
        const p = this.transition;

        const boomEnd = p.boomHold;
        const greenInEnd = boomEnd + p.greenIn;
        const greenHoldEnd = greenInEnd + p.greenHold;
        const crossfadeEnd = greenHoldEnd + p.greenToPrestige;

        if (t < boomEnd) {
            return {
                done: false,
                showBoom: true,
                showPrestige: false,
                prestigeAlpha: 0,
                greenAlpha: 0
            };
        }

        if (t < greenInEnd) {
            const f = (t - boomEnd) / p.greenIn;
            return {
                done: false,
                showBoom: true,
                showPrestige: false,
                prestigeAlpha: 0,
                greenAlpha: Math.max(0, Math.min(1, f))
            };
        }

        if (t < greenHoldEnd) {
            return {
                done: false,
                showBoom: false,
                showPrestige: false,
                prestigeAlpha: 0,
                greenAlpha: 1
            };
        }

        if (t < crossfadeEnd) {
            const f = (t - greenHoldEnd) / p.greenToPrestige;
            const clamped = Math.max(0, Math.min(1, f));
            return {
                done: false,
                showBoom: false,
                showPrestige: true,
                prestigeAlpha: clamped,
                greenAlpha: 1 - clamped
            };
        }

        return {
            done: true,
            showBoom: false,
            showPrestige: true,
            prestigeAlpha: 1,
            greenAlpha: 0
        };
    }

    clearOverlayCanvas() {
        if (!ui || !ui.canvas || !ui.canvas.ctx) return;
        ui.canvas.ensureFrame();
        ui.canvas.ctx.clearRect(0, 0, screenWidth, screenHeight);
    }

    drawGreenOverlay(alpha = 1) {
        if (!ui || !ui.canvas || !ui.canvas.ctx) return;
        const a = Math.max(0, Math.min(1, alpha));
        if (a <= 0) return;
        ui.canvas.ensureFrame();
        const ctx = ui.canvas.ctx;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgb(55,255,77)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        ctx.restore();
    }

    drawPrestigeScreen(alpha = 1) {
        if (!ui || !ui.canvas || !ui.canvas.ctx) return;
        const a = Math.max(0, Math.min(1, alpha));
        if (a <= 0) return;

        const ctx = ui.canvas.ctx;
        ui.canvas.ensureFrame();

        const centerX = screenWidth * 0.5;
        const centerY = screenHeight * 0.5;
        const panelW = Math.min(screenWidth * 0.7, 780 * globalScale);
        const panelH = Math.min(screenHeight * 0.62, 420 * globalScale);
        const panelX = centerX - panelW * 0.5;
        const panelY = centerY - panelH * 0.5;

        const currentLoop = (prestigeManager && Number.isFinite(prestigeManager.loopNumber)) ? prestigeManager.loopNumber : 1;
        const nextLoop = currentLoop + 1;
        const nextData = (prestigeManager && typeof prestigeManager.getLoopData === 'function')
            ? prestigeManager.getLoopData(nextLoop)
            : null;

        this.button = {
            x: centerX - (320 * globalScale) * 0.5,
            y: panelY + panelH - 92 * globalScale,
            w: 320 * globalScale,
            h: 58 * globalScale,
            enabled: a > 0.98
        };

        ctx.save();
        ctx.globalAlpha = a;

        ctx.fillStyle = 'rgba(0,0,0,0.58)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        ctx.fillStyle = 'rgba(14,14,14,0.75)';
        ctx.strokeStyle = 'rgba(160,255,170,0.85)';
        ctx.lineWidth = 2 * globalScale;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgba(212,255,218,0.98)';
        ctx.font = `${32 * globalScale}px UIFont1, sans-serif`;
        ctx.fillText("Atom's blessing granted -", centerX, panelY + 54 * globalScale);
        ctx.fillText("The Great Glow achieved.", centerX, panelY + 86 * globalScale);

        ctx.fillStyle = 'rgba(165,255,178,0.95)';
        ctx.font = `${23 * globalScale}px UIFont1, sans-serif`;
        ctx.fillText(`Prestige unlocked: Loop ${nextLoop}`, centerX, panelY + 126 * globalScale);

        ctx.fillStyle = 'rgba(240,255,244,0.95)';
        ctx.font = `${18 * globalScale}px UIFont1, sans-serif`;
        const reqText = nextData && nextData.thresholds
            ? `Next requirements: ${formatLarge(nextData.thresholds.money || 0, CURRENCY_UNIT, 2)} and ${formatLarge(nextData.thresholds.power || 0, 'kW', 2)}`
            : 'Next loop requirements and scaling have been prepared.';
        ctx.fillText(reqText, centerX, panelY + 170 * globalScale);

        const hover = this.hovered && this.button.enabled;
        ctx.fillStyle = hover ? 'rgba(50,50,50,0.92)' : 'rgba(25,25,25,0.9)';
        ctx.strokeStyle = 'rgba(225,255,230,0.95)';
        ctx.lineWidth = 2 * globalScale;
        ctx.fillRect(this.button.x, this.button.y, this.button.w, this.button.h);
        ctx.strokeRect(this.button.x, this.button.y, this.button.w, this.button.h);

        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.font = `${24 * globalScale}px UIFont1, sans-serif`;
        ctx.fillText(`Go to level ${nextLoop}`, centerX, this.button.y + this.button.h * 0.5);

        ctx.restore();
    }

    updateHover(mouseX, mouseY) {
        if (!this.button || !this.button.enabled) {
            this.hovered = false;
            return;
        }

        this.hovered = mouseX >= this.button.x
            && mouseX <= this.button.x + this.button.w
            && mouseY >= this.button.y
            && mouseY <= this.button.y + this.button.h;
    }

    handleClick(mouseX, mouseY) {
        this.updateHover(mouseX, mouseY);
        if (!this.hovered || !this.button || !this.button.enabled) return false;

        if (typeof resetRunForPrestige === 'function') {
            resetRunForPrestige();
            return true;
        }
        return false;
    }
}

window.PrestigeScreen = PrestigeScreen;