
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

        // Background circles
        ctx.fillStyle = 'rgb(150, 150, 150)';
        ctx.beginPath();
        ctx.arc(0, 0, d / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgb(222, 222, 222)';
        ctx.beginPath();
        ctx.arc(0, 0, d * 0.9 / 2, 0, Math.PI * 2);
        ctx.fill();

        // Ticks
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
        // Position relative to sim area
        const drawX = offsetX + this.x - this.width / 2;
        const drawY = this.y - this.height / 2;

        // Alarm glow when nearing max value
        const range = this.max - this.min;
        const ratio = range !== 0 ? (this.value - this.min) / range : 0;
        const clampedRatio = Math.min(Math.max(ratio, 0), 1);
        const alarmThreshold = 0.8;
        let glow = 0;
        if (clampedRatio >= alarmThreshold) {
            const alarmT = (clampedRatio - alarmThreshold) / (1 - alarmThreshold);
            let phase = 0;
            if (typeof audioManager !== 'undefined' && audioManager.getAlarmPhase) {
                phase = audioManager.getAlarmPhase();
            }
            const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
            glow = alarmT * pulse;

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

        // Draw background
        ctx.drawImage(this.meterImage, 0, 0, this.meterImage.width, this.meterImage.height, drawX, drawY, this.width, this.height);

        // Tint rim when alarm is active
        if (glow > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 * glow})`;
            ctx.lineWidth = this.width * 0.05;
            ctx.beginPath();
            ctx.arc(drawX + this.width / 2, drawY + this.height / 2, this.width * 0.475, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw needle
        ctx.save();
        ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
        ctx.rotate(this.needleAngle);
        
        const needleWidth = 3 * globalScale;
        ctx.fillStyle = 'black';
        
        // Needle rect
        ctx.beginPath();

        ctx.rect(-needleWidth / 2, 0, needleWidth, globalScale*45);
        ctx.fill();
        
        ctx.restore();

        // Draw value text
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
        // Smooth transition using easing functions
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
    }

    update() {
        const powerVal = Math.max(0, energyThisFrame);
        super.update(powerVal);
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
        
        // Use energyOutput global if defined, else fallback to internal value
        const val = (typeof energyOutput !== 'undefined') ? energyOutput * 1000 : this.value;
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
        const val = (typeof window.avgTemp !== 'undefined') ? window.avgTemp : 0;
        super.update(val);
    }
}
