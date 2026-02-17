class Moderator {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = moderatorWidth;
        this.height = moderatorHeight;
        this.color = { r: 60, g: 70, b: 90, a: 255 };
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

const MODERATOR_SLOT_ORDER = [2, 1, 3, 0, 4];
const MODERATOR_UPGRADE_SEQUENCE = [1, 3, 0, 4];
const MODERATOR_STEP = 0.05;
const MODERATOR_SIDE_BASE = 0.25;
const MODERATOR_SIDE_CAP = 1.0;

function getModeratorCenterIndex() {
    return Math.floor(moderatorCount / 2);
}

function isModeratorActive(index) {
    if (index < 0 || index >= moderatorCount) return false;
    const activeCount = Math.max(1, Math.min(moderatorPurchaseCount || 1, moderatorCount));
    for (let i = 0; i < activeCount; i++) {
        if (MODERATOR_SLOT_ORDER[i] === index) return true;
    }
    return false;
}

function getModeratorActiveIndices() {
    const indices = [];
    for (let i = 0; i < moderatorCount; i++) {
        if (isModeratorActive(i)) indices.push(i);
    }
    return indices;
}

function getModeratorMaxPercent(index) {
    const centerIndex = getModeratorCenterIndex();
    if (index === centerIndex) return 1.0;
    const level = moderatorUpgradeLevels[index] || 0;
    return Math.min(MODERATOR_SIDE_CAP, MODERATOR_SIDE_BASE + level * MODERATOR_STEP);
}

function clampModeratorHandleY(index, desiredY) {
    if (!isModeratorActive(index)) return 0;
    const maxPercent = getModeratorMaxPercent(index);
    const maxY = screenHeight * maxPercent;
    const clamped = Math.min(Math.max(desiredY, 0), maxY);
    return clamped;
}

function getMaxModeratorPurchases() {
    return moderatorCount;
}

function getMaxModeratorUpgradePurchases() {
    const maxPerModerator = Math.max(0, Math.floor((MODERATOR_SIDE_CAP - MODERATOR_SIDE_BASE) / MODERATOR_STEP));
    return (moderatorCount - 1) * maxPerModerator;
}

function getNextModeratorUpgradeIndex(startOffset = 0) {
    const centerIndex = getModeratorCenterIndex();
    const maxPerModerator = Math.max(0, Math.floor((MODERATOR_SIDE_CAP - MODERATOR_SIDE_BASE) / MODERATOR_STEP));
    const seq = MODERATOR_UPGRADE_SEQUENCE;
    if (!seq.length) return -1;

    for (let i = 0; i < seq.length; i++) {
        const idx = seq[(startOffset + i) % seq.length];
        if (idx < 0 || idx >= moderatorCount) continue;
        if (idx === centerIndex) continue;
        if (!isModeratorActive(idx)) continue;
        const level = moderatorUpgradeLevels[idx] || 0;
        if (level < maxPerModerator) return idx;
    }

    return -1;
}

function applyModeratorPurchase() {
    const maxPurchases = getMaxModeratorPurchases();
    const current = moderatorPurchaseCount || 0;
    if (current >= maxPurchases) return false;

    moderatorPurchaseCount = current + 1;
    player.moderatorCount = moderatorPurchaseCount;
    if (ui.controlSlider && typeof ui.controlSlider.ensureHandleLength === 'function') {
        ui.controlSlider.ensureHandleLength();
    }
    return true;
}

function applyModeratorUpgradePurchase() {
    const maxPurchases = getMaxModeratorUpgradePurchases();
    if ((moderatorUpgradePurchaseCount || 0) >= maxPurchases) return false;
    if (!MODERATOR_UPGRADE_SEQUENCE.length) return false;

    if (!moderatorUpgradeLevels || moderatorUpgradeLevels.length !== moderatorCount) {
        moderatorUpgradeLevels = new Array(moderatorCount).fill(0);
    }
    const seqIndex = (moderatorUpgradePurchaseCount || 0) % MODERATOR_UPGRADE_SEQUENCE.length;
    const modIndex = getNextModeratorUpgradeIndex(seqIndex);
    if (modIndex === -1) return false;

    moderatorUpgradeLevels[modIndex] = (moderatorUpgradeLevels[modIndex] || 0) + 1;
    moderatorUpgradePurchaseCount = (moderatorUpgradePurchaseCount || 0) + 1;

    if (ui.controlSlider && typeof ui.controlSlider.ensureHandleLength === 'function') {
        ui.controlSlider.ensureHandleLength();
    }

    return true;
}

function initModeratorUpgrades() {
    moderatorUpgradeLevels = new Array(moderatorCount).fill(0);

    const requestedMods = Math.max(1, Math.min(player.moderatorCount || 1, getMaxModeratorPurchases()));
    moderatorPurchaseCount = requestedMods;
    player.moderatorCount = requestedMods;

    const requestedUpgradePurchases = Math.min(player.moderatorUpgradeCount || 0, getMaxModeratorUpgradePurchases());
    moderatorUpgradePurchaseCount = 0;

    if (MODERATOR_UPGRADE_SEQUENCE.length) {
        for (let i = 0; i < requestedUpgradePurchases; i++) {
            const seqIndex = moderatorUpgradePurchaseCount % MODERATOR_UPGRADE_SEQUENCE.length;
            const modIndex = getNextModeratorUpgradeIndex(seqIndex);
            if (modIndex === -1) break;
            moderatorUpgradeLevels[modIndex] = (moderatorUpgradeLevels[modIndex] || 0) + 1;
            moderatorUpgradePurchaseCount++;
        }
    }

    player.moderatorUpgradeCount = moderatorUpgradePurchaseCount;

    if (ui.controlSlider && typeof ui.controlSlider.ensureHandleLength === 'function') {
        ui.controlSlider.ensureHandleLength();
    }
}


class ModeratorsSlider {
    constructor() {
        this.x = 15 * globalScale;
        this.y = moderatorsStartPos;
        this.handleY = [];
        this.draggingIndex = -1;

        this.ensureHandleLength();
    }

    ensureHandleLength() {
        const prev = this.handleY || [];
        this.handleY = new Array(moderators.length).fill(null);
        for (let i = 0; i < moderators.length; i++) {
            const mod = moderators[i];
            if (!isModeratorActive(i)) {
                this.handleY[i] = 0;
                mod.y = mod.initialY;
                mod.targetY = mod.initialY;
                continue;
            }
            const prevVal = prev[i];
            const rawHandle = (typeof prevVal === 'number') ? prevVal : (mod.y + mod.height);
            const clampedHandle = clampModeratorHandleY(i, rawHandle);
            this.handleY[i] = clampedHandle;
            mod.targetY = this.handleY[i] - mod.height;
        }
    }

    draw(ctx, offsetX, skipDraw = false) {
        const simMousePos = scaleMouse(mouseX, mouseY);
        this.ensureHandleLength();

        const HANDLE_RADIUS = 10 * globalScale;

        ctx.save();

        const scramActive = ui.canvas.scramActive;
        const scramPressedOnce = !!(window.tutorialManager
            && typeof window.tutorialManager.hasCompleted === 'function'
            && window.tutorialManager.hasCompleted('scram_pressed_once'));
        if (scramActive && this.draggingIndex !== -1) {
            this.draggingIndex = -1;
        }

        if (mouseIsPressed && this.draggingIndex === -1 && (!ui.canvas.activeDrag || ui.canvas.activeDrag.type === 'moderator')) {
            if (!paused && !scramActive && scramPressedOnce) {
                for (let i = 0; i < moderators.length; i++) {
                    if (!isModeratorActive(i)) continue;
                    const mod = moderators[i];
                    const handleX = mod.x + mod.width / 2;
                    const handleY = (typeof this.handleY[i] === 'number') ? this.handleY[i] : (mod.y + mod.height);
                    const dx = simMousePos.x - handleX;
                    const dy = simMousePos.y - handleY;
                    if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS + 4 * globalScale) {
                        this.draggingIndex = i;
                        ui.canvas.activeDrag = { type: 'moderator', index: i };
                        if (window.tutorialManager && typeof window.tutorialManager.onModeratorDragged === 'function') {
                            window.tutorialManager.onModeratorDragged();
                        }
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
                    if (!isModeratorActive(j)) continue;
                    this.handleY[j] = clampModeratorHandleY(j, newY);
                    moderators[j].targetY = this.handleY[j] - moderators[j].height;
                }
            } else {
                this.handleY[i] = clampModeratorHandleY(i, newY);
                moderators[i].targetY = this.handleY[i] - moderators[i].height;
            }
        }

        if (!mouseIsPressed && this.draggingIndex !== -1) {
            this.draggingIndex = -1;
            if (ui.canvas && ui.canvas.activeDrag && ui.canvas.activeDrag.type === 'moderator') ui.canvas.activeDrag = null;
        }

        if (skipDraw) {
            ctx.restore();
            return;
        }

        for (let i = 0; i < moderators.length; i++) {
            if (!isModeratorActive(i)) continue;
            const mod = moderators[i];
            const drawX = offsetX + mod.x + mod.width / 2;
            const drawY = (typeof this.handleY[i] === 'number') ? this.handleY[i] : (mod.y + mod.height);

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

window.applyModeratorPurchase = applyModeratorPurchase;
window.applyModeratorUpgradePurchase = applyModeratorUpgradePurchase;
window.initModeratorUpgrades = initModeratorUpgrades;
window.getMaxModeratorPurchases = getMaxModeratorPurchases;
window.getMaxModeratorUpgradePurchases = getMaxModeratorUpgradePurchases;
window.isModeratorActive = isModeratorActive;
window.getModeratorActiveIndices = getModeratorActiveIndices;
