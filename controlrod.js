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
        this.ensureHandleLength();
    }

    ensureHandleLength() {
        if (typeof controlRods === 'undefined' || !controlRods) return;

        const prev = this.handleY || [];
        this.handleY = new Array(controlRods.length).fill(null);
        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
            if (!rod) continue;
            const prevVal = prev[i];
            const rawHandle = (typeof prevVal === 'number') ? prevVal : (rod.y + rod.height);
            const clampedHandle = clampControlRodHandleY(i, rawHandle);
            this.handleY[i] = clampedHandle;
            rod.targetY = this.handleY[i] - rod.height;
        }
    }

    draw(ctx, offsetX) {
        const simMousePos = scaleMouse(mouseX, mouseY);
        this.ensureHandleLength();

        const HANDLE_RADIUS = 10 * globalScale;

        ctx.save();

        // Input handling: start drag if pressed and not already dragging
        if (mouseIsPressed && this.draggingIndex === -1) {
            if (typeof paused !== 'undefined' && paused) {
                // Do not allow grabbing when paused
            } else {
                for (let i = 0; i < controlRods.length; i++) {
                    const rod = controlRods[i];
                    if (!rod) continue;
                    const handleX = rod.x + rod.width / 2;
                    const handleY = (typeof this.handleY[i] === 'number') ? this.handleY[i] : (rod.y + rod.height);
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
            const newY = simMousePos.y;
            // If 'link-rods' is checked in settings, move all handles to same Y
            const linked = settings.linkRods;

            if (linked) {
                for (let j = 0; j < this.handleY.length; j++) {
                    if (!controlRods[j]) continue;
                    this.handleY[j] = clampControlRodHandleY(j, newY);
                    if (controlRods[j]) controlRods[j].targetY = this.handleY[j] - controlRods[j].height;
                }
            } else {
                if (controlRods[i]) {
                    this.handleY[i] = clampControlRodHandleY(i, newY);
                    // Set rod's target to follow (top = bottom - height)
                    controlRods[i].targetY = this.handleY[i] - controlRods[i].height;
                }
            }
        }

        // Release
        if (!mouseIsPressed && this.draggingIndex !== -1) {
            this.draggingIndex = -1;
        }

        // Draw handles (below rods)
        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
            if (!rod) continue;
            const drawX = offsetX + rod.x + rod.width / 2;
            const drawY = (typeof this.handleY[i] === 'number') ? this.handleY[i] : (rod.y + rod.height);

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
const CONTROL_ROD_UPGRADE_SEQUENCE = [1, 3, 0, 4, 1, 3];
const CONTROL_ROD_STEP = 0.05;
const CONTROL_ROD_SIDE_BASE = 0.25;
const CONTROL_ROD_SIDE_CAP = 1.0;

function getControlRodCenterIndex() {
    return Math.floor(controlRodCount / 2);
}

function getControlRodMaxPercent(index) {
    const centerIndex = getControlRodCenterIndex();
    if (index === centerIndex) return 1.0;
    const level = (controlRodUpgradeLevels && controlRodUpgradeLevels[index]) ? controlRodUpgradeLevels[index] : 0;
    return Math.min(CONTROL_ROD_SIDE_CAP, CONTROL_ROD_SIDE_BASE + level * CONTROL_ROD_STEP);
}

function clampControlRodHandleY(index, desiredY) {
    const maxPercent = getControlRodMaxPercent(index);
    const maxY = screenHeight * maxPercent;
    const clamped = Math.min(Math.max(desiredY, 0), maxY);
    return clamped;
}

function getMaxControlRodPurchases() {
    const centerIndex = getControlRodCenterIndex();
    const maxPerRod = Math.max(0, Math.floor((CONTROL_ROD_SIDE_CAP - CONTROL_ROD_SIDE_BASE) / CONTROL_ROD_STEP));
    return (controlRodCount - 1) * maxPerRod;
}

function applyControlRodPurchase() {
    const maxPurchases = getMaxControlRodPurchases();
    if (controlRodPurchaseCount >= maxPurchases) return false;

    const seqIndex = controlRodPurchaseCount % CONTROL_ROD_UPGRADE_SEQUENCE.length;
    const rodIndex = CONTROL_ROD_UPGRADE_SEQUENCE[seqIndex];
    if (!controlRodUpgradeLevels || controlRodUpgradeLevels.length !== controlRodCount) {
        controlRodUpgradeLevels = new Array(controlRodCount).fill(0);
    }
    controlRodUpgradeLevels[rodIndex] = (controlRodUpgradeLevels[rodIndex] || 0) + 1;
    controlRodPurchaseCount++;

    if (typeof player !== 'undefined' && player) player.rodCount = controlRodPurchaseCount;

    if (typeof ui !== 'undefined' && ui && ui.controlSlider) {
        ui.controlSlider.ensureHandleLength();
    }

    return true;
}

function initControlRodUpgrades() {
    controlRodUpgradeLevels = new Array(controlRodCount).fill(0);
    controlRodPurchaseCount = (typeof player !== 'undefined' && player && typeof player.rodCount === 'number') ? player.rodCount : 0;
    for (let i = 0; i < controlRodPurchaseCount; i++) {
        const seqIndex = i % CONTROL_ROD_UPGRADE_SEQUENCE.length;
        const rodIndex = CONTROL_ROD_UPGRADE_SEQUENCE[seqIndex];
        controlRodUpgradeLevels[rodIndex] = (controlRodUpgradeLevels[rodIndex] || 0) + 1;
    }

    if (typeof ui !== 'undefined' && ui && ui.controlSlider) {
        ui.controlSlider.ensureHandleLength();
    }
}

// Expose helpers
window.applyControlRodPurchase = applyControlRodPurchase;
window.initControlRodUpgrades = initControlRodUpgrades;
window.getMaxControlRodPurchases = getMaxControlRodPurchases;