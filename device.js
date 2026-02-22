// Simple device renderer (flux-capacitor-like) drawn into the UI canvas
class DeviceWidget {
    constructor() {
        this.x = 80; // sim coordinates (from left of sim area)
        this.y = 80;
        this.size = 64; // base size in pixels
        this.visible = false; // hidden until tutorial reveals it
        this.activateGlow = false;
        this.glowStart = 0;
    }

    show() {
        this.visible = true;
        this.glowStart = (typeof renderTime === 'number') ? renderTime : Date.now() / 1000;
    }

    setActiveGlow(on) {
        this.activateGlow = !!on;
        if (this.activateGlow) this.glowStart = (typeof renderTime === 'number') ? renderTime : Date.now() / 1000;
    }

    draw(ctx, simXOffset) {
        if (!this.visible) return;

        const t = (typeof renderTime === 'number') ? renderTime : Date.now() / 1000;

        const cx = simXOffset + this.x;
        const cy = this.y;
        const s = this.size * globalScale;

        // Glow pulse when active
        let glow = 0.25;
        if (this.activateGlow) {
            glow = 0.8 + 0.4 * Math.sin((t - this.glowStart) * 6.0);
        } else {
            glow = 0.2 + 0.05 * Math.sin(t * 2.0);
        }

        ctx.save();
        ctx.translate(cx, cy);

        // Background soft glow
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2);
        grad.addColorStop(0, `rgba(200,240,255,${0.06 * glow})`);
        grad.addColorStop(0.6, `rgba(80,200,255,${0.02 * glow})`);
        grad.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Draw three channels (Y-shape)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const channelColor = `rgba(180,230,255,${0.9 * glow})`;
        const accent = `rgba(255,220,180,${0.9 * glow})`;

        // central chamber
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(30,40,60,0.85)`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // inner core glow
        ctx.globalCompositeOperation = 'lighter';
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.22);
        coreGrad.addColorStop(0, `rgba(255,230,170,${0.7 * glow})`);
        coreGrad.addColorStop(1, `rgba(255,230,170,0)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw arms
        const arms = [ -120, 0, 120 ];
        for (let i = 0; i < 3; i++) {
            const ang = (arms[i] + 90) * (Math.PI / 180);
            const ax = Math.cos(ang) * s * 0.38;
            const ay = Math.sin(ang) * s * 0.38;
            const bx = Math.cos(ang) * s * 0.95;
            const by = Math.sin(ang) * s * 0.95;

            // path
            ctx.lineWidth = s * 0.12;
            ctx.strokeStyle = channelColor;
            ctx.beginPath();
            ctx.moveTo(ax * 0.2, ay * 0.2);
            ctx.lineTo(bx, by);
            ctx.stroke();

            // central connector
            ctx.lineWidth = s * 0.06;
            ctx.strokeStyle = accent;
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(ax * 0.18, ay * 0.18);
            ctx.stroke();

            // small end cap glow
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(180,230,255,${0.6 * glow})`;
            ctx.beginPath();
            ctx.arc(bx, by, s * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Outline
        ctx.lineWidth = Math.max(1, 1.5 * globalScale);
        ctx.strokeStyle = 'rgba(20,30,40,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

window.device = new DeviceWidget();
