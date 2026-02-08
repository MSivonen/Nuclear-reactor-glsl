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
        this.x = 15 * globalScale;
        this.y = controlRodsStartPos;
        this.handleY = [];
        this.draggingIndex = -1;

        this.ensureHandleLength();
    }

    ensureHandleLength() {
        const prev = this.handleY || [];
        this.handleY = new Array(controlRods.length).fill(null);
        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
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

        const scramActive = ui.canvas.scramActive;
        if (scramActive && this.draggingIndex !== -1) {
            this.draggingIndex = -1;
        }

        if (mouseIsPressed && this.draggingIndex === -1 && (!ui.canvas.activeDrag || ui.canvas.activeDrag.type === 'controlRod')) {
            if (!paused && !scramActive) {
                for (let i = 0; i < controlRods.length; i++) {
                    const rod = controlRods[i];
                    const handleX = rod.x + rod.width / 2;
                    const handleY = (typeof this.handleY[i] === 'number') ? this.handleY[i] : (rod.y + rod.height);
                    const dx = simMousePos.x - handleX;
                    const dy = simMousePos.y - handleY;
                    if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS + 4 * globalScale) { //grab the balls
                        this.draggingIndex = i;
                        ui.canvas.activeDrag = { type: 'controlRod', index: i };
                        break;
                    }
                }
            }
        }

        if (this.draggingIndex !== -1 && mouseIsPressed) {
            if (scramActive) {
                this.draggingIndex = -1;
                ctx.restore();
                return;
            }
            const i = this.draggingIndex;
            const newY = simMousePos.y;
            const linked = settings.linkRods;

            if (linked) {
                for (let j = 0; j < this.handleY.length; j++) {
                    this.handleY[j] = clampControlRodHandleY(j, newY);
                    controlRods[j].targetY = this.handleY[j] - controlRods[j].height;
                }
            } else {
                this.handleY[i] = clampControlRodHandleY(i, newY);
                controlRods[i].targetY = this.handleY[i] - controlRods[i].height;
            }
        }

        if (!mouseIsPressed && this.draggingIndex !== -1) {
            this.draggingIndex = -1;
            if (ui.canvas && ui.canvas.activeDrag && ui.canvas.activeDrag.type === 'controlRod') ui.canvas.activeDrag = null;
        }

        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
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
    const level = controlRodUpgradeLevels[index] || 0;
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

    player.rodCount = controlRodPurchaseCount;
    ui.controlSlider.ensureHandleLength();

    return true;
}

function initControlRodUpgrades() {
    controlRodUpgradeLevels = new Array(controlRodCount).fill(0);
    controlRodPurchaseCount = player.rodCount;
    for (let i = 0; i < controlRodPurchaseCount; i++) {
        const seqIndex = i % CONTROL_ROD_UPGRADE_SEQUENCE.length;
        const rodIndex = CONTROL_ROD_UPGRADE_SEQUENCE[seqIndex];
        controlRodUpgradeLevels[rodIndex] = (controlRodUpgradeLevels[rodIndex] || 0) + 1;
    }

    ui.controlSlider.ensureHandleLength();
}

window.applyControlRodPurchase = applyControlRodPurchase;
window.initControlRodUpgrades = initControlRodUpgrades;
window.getMaxControlRodPurchases = getMaxControlRodPurchases;