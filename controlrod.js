class ControlRod {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = controlRodWidth;
        this.height = controlRodHeight;
        this.color = { r: 44, g: 22, b: 4, a: 255 };
        this.initialY = y;
        this.targetY = y;
        this.movementSpeed = 1;
    }

    draw(ctx, offsetX = 0) {
        const x = offsetX + this.x;
        const y = this.y;
        ctx.save();
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a / 255})`;
        ctx.fillRect(x, y, this.width, this.height);
        ctx.restore();
    }

    update() {
        this.movementSpeed = 1 * globalScale;

        if (this.y < this.targetY) {
            this.y += this.movementSpeed;
        } else if (this.y > this.targetY) {
            this.y -= this.movementSpeed;
        }
    }
}


class ControlRodsSlider {
    constructor() {
        this.x = 15;
        this.y = controlRodsStartPos;
        this.handleY = []; // per-rod handle (bottom Y) in simulation coords
        this.draggingIndex = -1; // -1 = none
        // Initialize handles to match current rods if available
        if (typeof controlRods !== 'undefined' && controlRods.length > 0) {
            this.handleY = [];
            for (let i = 0; i < controlRods.length; i++) {
                const r = controlRods[i];
                this.handleY.push(r.y + r.height);
            }
        }
    }

    draw(ctx, offsetX) {
        const simMousePos = scaleMouse(mouseX, mouseY);

        // Ensure handle array length matches rods
        if (!this.handleY || this.handleY.length !== controlRods.length) {
            this.handleY = [];
            for (let i = 0; i < controlRods.length; i++) {
                const r = controlRods[i];
                this.handleY.push(r.y + r.height);
            }
        }

        const HANDLE_RADIUS = 10 * globalScale;

        ctx.save();

        // Input handling: start drag if pressed and not already dragging
        if (mouseIsPressed && this.draggingIndex === -1) {
            if (typeof paused !== 'undefined' && paused) {
                // Do not allow grabbing when paused
            } else {
                for (let i = 0; i < controlRods.length; i++) {
                    const rod = controlRods[i];
                    const handleX = rod.x + rod.width / 2;
                    const handleY = this.handleY[i];
                    const dx = simMousePos.x - handleX;
                    const dy = simMousePos.y - handleY;
                    if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS + 4) { //grab the balls
                    //if (-dx <= HANDLE_RADIUS && dx <= HANDLE_RADIUS) {//grab anywhere in y direction
                        this.draggingIndex = i;
                        break;
                    }
                }
            }
        }

        // While dragging, move handle instantly with mouse and set rod target accordingly
        if (this.draggingIndex !== -1 && mouseIsPressed) {
            const i = this.draggingIndex;
            // Clamp handle to simulation vertical bounds
            const newY = Math.min(Math.max(simMousePos.y, 0), screenHeight);
            // If 'link-rods' is checked in settings, move all handles to same Y
            const linked = settings.linkRods;

            if (linked) {
                for (let j = 0; j < this.handleY.length; j++) {
                    this.handleY[j] = newY;
                    if (controlRods[j]) controlRods[j].targetY = this.handleY[j] - controlRods[j].height;
                }
            } else {
                this.handleY[i] = newY;
                // Set rod's target to follow (top = bottom - height)
                if (controlRods[i]) controlRods[i].targetY = this.handleY[i] - controlRods[i].height;
            }
        }

        // Release
        if (!mouseIsPressed && this.draggingIndex !== -1) {
            this.draggingIndex = -1;
        }

        // Draw handles (below rods)
        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
            const drawX = offsetX + rod.x + rod.width / 2;
            const drawY = this.handleY[i];

            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(drawX, drawY, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }
}