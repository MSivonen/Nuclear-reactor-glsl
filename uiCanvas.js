class UICanvas {
    constructor() {
        this.width = 1067;
        this.height = 600;
        this.simWidth = 800;
        this.simXOffset = (this.width - this.simWidth) / 2;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.pointerEvents = 'none'; 

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.canvas);
        } else {
            console.warn('Canvas container not found, appending to body');
            document.body.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        // Draw scene overlays
        drawBorders(this.ctx, this.simXOffset);

        // Draw control rods
        controlRods.forEach(r => r.draw(this.ctx, this.simXOffset));

        // Draw Meter
        if (ui.meter) ui.meter.draw(this.ctx, this.simXOffset);

        // Draw Slider
        if (ui.controlSlider) ui.controlSlider.draw(this.ctx, this.simXOffset);

        // Draw FPS
        drawFPS(this.ctx, this.simXOffset);

        // Game over overlay
        gameOver(this.ctx, this.simXOffset);
    }
}
