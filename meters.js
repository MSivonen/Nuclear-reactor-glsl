
class BaseMeter {
    constructor(x, y, size, min, max, unit) {
        this.x = x;
        this.y = y;
        this.baseSize = size;
        this.width = size * globalScale;
        this.height = size * globalScale;
        
        this.min = min;
        this.max = max;
        this.unit = unit;

        this.value = 0;
        this.needleAngle = 0;
        this.warning = false;
        
        this.meterImage = this.createMeterImg();
    }

    createMeterImg() {
        let d = 220;
        let bgCanvas = document.createElement('canvas');
        bgCanvas.width = d;
        bgCanvas.height = d;
        let ctx = bgCanvas.getContext('2d');

        ctx.translate(d / 2, d / 2);

        ctx.fillStyle = 'rgb(150, 150, 150)';
        ctx.beginPath();
        ctx.arc(0, 0, d / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgb(222, 222, 222)';
        ctx.beginPath();
        ctx.arc(0, 0, d * 0.9 / 2, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 11; i++) {
            let angle = 0.5 + (i / 10) * (Math.PI * 2 - 1.0);
            
            ctx.save();
            ctx.rotate(angle);
            
            if (i == 9) ctx.fillStyle = "orange";
            else if (i == 10) ctx.fillStyle = "red";
            else ctx.fillStyle = "rgb(50, 50, 50)";
            
            ctx.fillRect(0, d * 0.47, d * 0.025, d * -0.08);
            ctx.restore();
        }
        return bgCanvas;
    }

    draw(ctx, offsetX) {
        const drawX = offsetX + this.x - this.width / 2;
        const drawY = this.y - this.height / 2;

        const range = this.max - this.min;
        const ratio = range !== 0 ? (this.value - this.min) / range : 0;
        const clampedRatio = Math.min(Math.max(ratio, 0), 1);
        const alarmThreshold = 0.8;
        let glow = 0;
        if (clampedRatio >= alarmThreshold) {
            const alarmT = (clampedRatio - alarmThreshold) / (1 - alarmThreshold);
            const glowBase = 0.1 + 0.9 * alarmT;
            let phase = audioManager.getAlarmPhase();
            const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
            glow = glowBase * (0.7 + 0.3 * pulse);

            ctx.save();
            ctx.globalAlpha = 0.5 * glow;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.shadowColor = 'rgba(255, 0, 0, 0.9)';
            ctx.shadowBlur = this.width * 0.25;
            ctx.beginPath();
            ctx.arc(drawX + this.width / 2, drawY + this.height / 2, this.width * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.drawImage(this.meterImage, 0, 0, this.meterImage.width, this.meterImage.height, drawX, drawY, this.width, this.height);

        if (glow > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 * glow})`;
            ctx.lineWidth = this.width * 0.05;
            ctx.beginPath();
            ctx.arc(drawX + this.width / 2, drawY + this.height / 2, this.width * 0.475, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
        ctx.rotate(this.needleAngle);
        
        const needleWidth = 5 * globalScale;
        const needleTipWidth = 2 * globalScale;
        const needleLength = globalScale * 45;
        ctx.fillStyle = 'black';
        
        ctx.beginPath();

        ctx.moveTo(-needleWidth / 2, 0);
        ctx.lineTo(needleWidth / 2, 0);
        ctx.lineTo(needleTipWidth / 2, needleLength);
        ctx.lineTo(-needleTipWidth / 2, needleLength);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();

        this.drawValue(ctx, drawX, drawY);
    }

    drawValue(ctx, drawX, drawY) {
        ctx.save();
        ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.roundRect(drawX + this.width / 4, drawY + this.height - 80 * globalScale, this.width / 2, globalScale*17,globalScale*5);
        ctx.fill();
        ctx.restore();
        ctx.save();

        ctx.fillStyle = 'light-green';
        ctx.font = `${12 * globalScale}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = formatLarge(Math.round(this.value), this.unit, 0);
        ctx.fillText(text, drawX + this.width / 2, drawY + this.height - 70 * globalScale);
        ctx.restore();
    }

    update(val) {
        this.value = val;
        const range = this.max - this.min;
        let t = 0;
        if(range !== 0) {
             t = (this.value - this.min) / range;
        }
        
        t = Math.min(Math.max(t, 0), 1);
        const targetAngle = 0.5 + t * (Math.PI * 2 - 1.0);

        const delta = targetAngle - this.needleAngle;
        this.needleAngle += delta * 0.1;
    }
}

class PowerMeter extends BaseMeter {
    constructor(x, y) {
        super(x, y, 110, 0, 1000, 'W');
        this.smoothedPower = 0;
    }

    update() {
        const powerVal = Math.max(0, energyThisFrame);
        this.smoothedPower = lerp(this.smoothedPower, powerVal, 0.15);
        super.update(this.smoothedPower);
    }

    drawValue(ctx, drawX, drawY) {
        ctx.save();
        ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.roundRect(drawX + this.width / 4, drawY + this.height - 80 * globalScale, this.width / 2, globalScale*17,globalScale*5);
        ctx.fill();
        ctx.restore();
        ctx.save();

        ctx.fillStyle = 'light-green';
        ctx.font = `${12 * globalScale}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const val = energyOutput * 1000;
        const powerText = formatLarge(Math.round(val), 'W', 0);
        ctx.fillText(powerText, drawX + this.width / 2, drawY + this.height - 70 * globalScale);
        ctx.restore();
    }
}

class TempMeter extends BaseMeter {
    constructor(x, y) {
        super(x, y, 110, 0, 500, 'C');
    }

    update() {
        let val = 0;
        let sum = 0;
        for (let c of waterSystem.waterCells) sum += (c.temperature || 0);
        val = sum / waterSystem.waterCells.length;
        super.update(val);
    }
}

class WaterValve {
    constructor(x, y, size) {
        this.x = x; // coordinates are already scaled
        this.y = y;
        this.size = size || (40 * globalScale);
        this.radius = this.size;
        this.angle = 0; // current displayed angle
        this.visible = true;
    }

    draw(ctx, offsetX, flow) {
        const drawX = offsetX + this.x;
        const drawY = this.y;

        // Map flow (0..1) to valve rotation angle. Use discrete stops by snapping slightly.
        const t = Math.min(Math.max(flow || 0, 0), 1);
        const minA = -Math.PI * 0.6;
        const maxA = Math.PI * 0.6;
        const target = minA + t * (maxA - minA);

        // Smoothly approach target angle
        this.angle += (target - this.angle) * 0.18;

        // Draw outer wheel
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(this.angle);

        // shadow / depth
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(4, 4, this.radius * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // rim
        ctx.fillStyle = 'rgb(90,90,90)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // inner face
        ctx.fillStyle = 'rgb(160,160,160)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // spokes
        ctx.strokeStyle = 'rgba(40,40,40,0.95)';
        ctx.lineWidth = Math.max(2, this.radius * 0.12);
        const spokes = 6;
        for (let i = 0; i < spokes; i++) {
            const a = (i / spokes) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * this.radius * 0.7, Math.sin(a) * this.radius * 0.7);
            ctx.lineTo(Math.cos(a) * (this.radius * 1.02), Math.sin(a) * (this.radius * 1.02));
            ctx.stroke();
        }

        // center nut
        ctx.fillStyle = 'rgb(70,70,70)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // handle to show distinct position (a small bar fixed to wheel)
        ctx.save();
        ctx.translate(0, -this.radius * 0.88);
        ctx.rotate(-this.angle); // keep handle visually aligned with wheel orientation
        ctx.fillStyle = 'rgb(120,120,120)';
        ctx.beginPath();
        const hw = this.radius * 0.18;
        const hh = this.radius * 0.48;
        ctx.roundRect(-hw/2, -hh, hw, hh, hw*0.35);
        ctx.fill();
        ctx.restore();

        ctx.restore();

        // (no percentage text - visualization only)
    }
}
