class Meter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.power = 0;
        this.needleAngle = 0;
        this.warning = false;

        this.width = 110;
        this.height = 110;
        
        // Pre-render the static meter background
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

        // Draw background
        ctx.drawImage(this.meterImage, 0, 0, this.meterImage.width, this.meterImage.height, drawX, drawY, this.width, this.height);

        // Draw needle
        ctx.save();
        ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
        ctx.rotate(this.needleAngle);
        
        const needleWidth = 3;
        ctx.fillStyle = 'black';
        
        // Needle rect
        ctx.beginPath();

        ctx.rect(-needleWidth / 2, 0, needleWidth, screenHeight/13);
        ctx.fill();
        
        ctx.restore();
    }

    update() {
        this.power = Math.max(0, energyThisFrame);
        // Smooth transition using easing functions
        // map(this.power, 0, 1000, 0.5, TWO_PI - 0.5);
        const t = Math.min(Math.max(this.power / 1000, 0), 1);
        const targetAngle = 0.5 + t * (Math.PI * 2 - 1.0);


        const delta = targetAngle - this.needleAngle;
        this.needleAngle += delta * 0.1;
    }
}