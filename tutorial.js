class TutorialManager {
    constructor() {
        this.isEnabled = true;
        this.completed = {};
        this.queue = [];
        this.activeSequence = null;
        this.activeStepIndex = -1;
        this.activeStep = null;
        this.buttonRect = null;
        this.firstPowerTutorialAt = null;
        this.plutoniumIntroAt = null;
        this.plutoniumScheduledAt = Infinity;
        this.neutronScheduledAt = Infinity;
        this.endlessLoopStart = 6;
        this.lastKnownLoop = 1;

        this.shopUnlocked = true;
        this.itemUnlocks = {
            atom: true,
            group: true,
            controlRod: true,
            waterFlow: true,
            californium: true,
            plutonium: false
        };
    }

    loadFromSave(saveData) {
        this.isEnabled = saveData && typeof saveData.tutorialEnabled === 'boolean'
            ? saveData.tutorialEnabled
            : true;

        const loadedCompleted = (saveData && saveData.tutorialCompleted && typeof saveData.tutorialCompleted === 'object')
            ? saveData.tutorialCompleted
            : {};

        this.completed = { ...loadedCompleted };

        const defaultUnlocked = true;
        this.shopUnlocked = (saveData && typeof saveData.tutorialShopUnlocked === 'boolean')
            ? saveData.tutorialShopUnlocked
            : defaultUnlocked;

        const loadedItemUnlocks = (saveData && saveData.tutorialItemUnlocks && typeof saveData.tutorialItemUnlocks === 'object')
            ? saveData.tutorialItemUnlocks
            : null;

        this.itemUnlocks = {
            atom: loadedItemUnlocks && typeof loadedItemUnlocks.atom === 'boolean' ? loadedItemUnlocks.atom : defaultUnlocked,
            group: loadedItemUnlocks && typeof loadedItemUnlocks.group === 'boolean' ? loadedItemUnlocks.group : defaultUnlocked,
            controlRod: loadedItemUnlocks && typeof loadedItemUnlocks.controlRod === 'boolean' ? loadedItemUnlocks.controlRod : defaultUnlocked,
            waterFlow: loadedItemUnlocks && typeof loadedItemUnlocks.waterFlow === 'boolean' ? loadedItemUnlocks.waterFlow : defaultUnlocked,
            californium: loadedItemUnlocks && typeof loadedItemUnlocks.californium === 'boolean' ? loadedItemUnlocks.californium : defaultUnlocked,
            plutonium: loadedItemUnlocks && typeof loadedItemUnlocks.plutonium === 'boolean' ? loadedItemUnlocks.plutonium : false
        };

        this.firstPowerTutorialAt = Number.isFinite(saveData && saveData.tutorialFirstPowerAt) ? saveData.tutorialFirstPowerAt : null;
        this.lastKnownLoop = (typeof prestigeManager !== 'undefined' && Number.isFinite(prestigeManager.loopNumber)) ? prestigeManager.loopNumber : 1;

        this.resetTransientState();
        this.applyUnlocksToShop();
    }

    getSaveData() {
        return {
            tutorialEnabled: !!this.isEnabled,
            tutorialCompleted: { ...this.completed },
            tutorialShopUnlocked: !!this.shopUnlocked,
            tutorialItemUnlocks: { ...this.itemUnlocks },
            tutorialFirstPowerAt: Number.isFinite(this.firstPowerTutorialAt) ? this.firstPowerTutorialAt : null
        };
    }

    setEnabled(isEnabled) {
        this.isEnabled = !!isEnabled;
        if (!this.isEnabled) {
            this.resetTransientState();
            if (typeof paused !== 'undefined') paused = false;
        }
    }

    resetTransientState() {
        this.queue = [];
        this.activeSequence = null;
        this.activeStepIndex = -1;
        this.activeStep = null;
        this.buttonRect = null;
        this.plutoniumIntroAt = null;
        this.plutoniumScheduledAt = Infinity;
        this.neutronScheduledAt = Infinity;
        this.setUiInteractivityForTutorial(false);
    }

    hasCompleted(id) {
        return !!this.completed[id];
    }

    markCompleted(id) {
        this.completed[id] = true;
    }

    isActive() {
        return !!this.activeStep;
    }

    isShopUnlocked() {
        return !!this.shopUnlocked;
    }

    isItemUnlocked(itemName) {
        return !!this.itemUnlocks[itemName];
    }

    setShopUnlocked(unlocked) {
        this.shopUnlocked = !!unlocked;
    }

    setItemUnlocked(itemName, unlocked) {
        if (!Object.prototype.hasOwnProperty.call(this.itemUnlocks, itemName)) return;
        const wasUnlocked = !!this.itemUnlocks[itemName];
        this.itemUnlocks[itemName] = !!unlocked;
        if (itemName === 'plutonium' && this.itemUnlocks[itemName] && typeof plutonium !== 'undefined' && plutonium && typeof plutonium.syncFromPlayer === 'function') {
            plutonium.syncFromPlayer();
        }
        if (itemName === 'californium' && !wasUnlocked && this.itemUnlocks[itemName] && !this.hasCompleted('unlock_californium')) {
            this.showTutorial('unlock_californium');
        }
        this.applyUnlocksToShop();
    }

    applyUnlocksToShop() {
        if (!window.shop || typeof shop.setItemUnlocked !== 'function') return;
        Object.keys(this.itemUnlocks).forEach((itemName) => {
            shop.setItemUnlocked(itemName, !!this.itemUnlocks[itemName]);
        });
    }

    hasBlinkLayer(layerName) {
        if (!this.activeStep || !this.activeStep.blinkLayer) return false;
        return this.activeStep.blinkLayer === layerName;
    }

    shouldRenderLayer(layerName) {
        if (!this.hasBlinkLayer(layerName)) return true;
        const t = (typeof millis === 'function' ? millis() : Date.now()) / 1000;
        return Math.sin(t * 8.5) > -0.15;
    }

    getTutorialPagesById(id) {
        const pages = window.TUTORIAL_PAGES || {};
        const sequences = window.TUTORIAL_SEQUENCES || {};
        if (!id || typeof id !== 'string') return [];

        if (Array.isArray(sequences[id])) {
            return sequences[id]
                .map((pageId) => pages[pageId])
                .filter((page) => page && typeof page === 'object')
                .map((page) => ({ ...page }));
        }

        const page = pages[id];
        if (page && typeof page === 'object') {
            return [{ ...page }];
        }

        return [];
    }

    normalizeTutorialInput(idOrIdsOrSteps, stepsOrOptions, maybeOptions) {
        let entryId = null;
        let steps = [];
        let options = {};
        let completionIds = [];

        const isDirectStepsCall = typeof idOrIdsOrSteps === 'string' && Array.isArray(stepsOrOptions);
        if (isDirectStepsCall) {
            entryId = idOrIdsOrSteps;
            steps = stepsOrOptions.map((step) => ({ ...step }));
            options = (maybeOptions && typeof maybeOptions === 'object') ? maybeOptions : {};
            completionIds = [entryId];
            return { entryId, steps, options, completionIds };
        }

        if (typeof idOrIdsOrSteps === 'string') {
            entryId = idOrIdsOrSteps;
            steps = this.getTutorialPagesById(idOrIdsOrSteps);
            options = (stepsOrOptions && typeof stepsOrOptions === 'object') ? stepsOrOptions : {};
            completionIds = [entryId];
            return { entryId, steps, options, completionIds };
        }

        if (Array.isArray(idOrIdsOrSteps)) {
            const optionsInput = (stepsOrOptions && typeof stepsOrOptions === 'object') ? stepsOrOptions : {};
            options = optionsInput;
            const ids = [];

            idOrIdsOrSteps.forEach((entry) => {
                if (typeof entry === 'string') {
                    ids.push(entry);
                    const resolved = this.getTutorialPagesById(entry);
                    steps.push(...resolved);
                } else if (entry && typeof entry === 'object') {
                    steps.push({ ...entry });
                }
            });

            completionIds = ids.length ? Array.from(new Set(ids)) : [];
            entryId = typeof options.sequenceId === 'string' && options.sequenceId
                ? options.sequenceId
                : (completionIds.length
                    ? completionIds.join('__')
                    : `custom_sequence_${Date.now()}_${Math.floor(Math.random() * 9999)}`);

            return { entryId, steps, options, completionIds };
        }

        return { entryId: null, steps: [], options: {}, completionIds: [] };
    }

    queueTutorial(id, steps, options = {}) {
        return this.showTutorial(id, steps, options);
    }

    showTutorial(idOrIdsOrSteps, stepsOrOptions, maybeOptions) {
        if (!this.isEnabled) return false;

        const normalized = this.normalizeTutorialInput(idOrIdsOrSteps, stepsOrOptions, maybeOptions);
        const id = normalized.entryId;
        const steps = normalized.steps;
        const options = normalized.options;
        const completionIds = normalized.completionIds;

        if (!id || !Array.isArray(steps) || steps.length === 0) return false;

        const repeatable = !!options.allowRepeat;
        if (!repeatable && completionIds.length > 0 && completionIds.every((completedId) => this.hasCompleted(completedId))) {
            return false;
        }

        const inQueue = this.queue.some(entry => entry.id === id);
        const isActive = this.activeSequence && this.activeSequence.id === id;
        if (inQueue || isActive) return false;

        this.queue.push({ id, steps, options, completionIds });
        this.tryOpenNext();
        return true;
    }

    tryOpenNext() {
        if (!this.isEnabled || this.activeStep || this.queue.length === 0) return;

        this.activeSequence = this.queue.shift();
        this.activeStepIndex = 0;
        this.activeStep = this.activeSequence.steps[0];
        this.buttonRect = null;
        if (typeof paused !== 'undefined') paused = true;
        this.setUiInteractivityForTutorial(true);
    }

    advanceStep() {
        if (!this.activeSequence || !this.activeStep) return;

        if (typeof this.activeStep.onAfterStep === 'function') {
            this.activeStep.onAfterStep();
        }

        this.activeStepIndex += 1;
        if (this.activeStepIndex >= this.activeSequence.steps.length) {
            this.finishActiveSequence();
            return;
        }

        this.activeStep = this.activeSequence.steps[this.activeStepIndex];
        this.buttonRect = null;
    }

    finishActiveSequence() {
        if (!this.activeSequence) return;
        const { id, options, completionIds } = this.activeSequence;
        if (!options.allowRepeat) {
            if (Array.isArray(completionIds) && completionIds.length > 0) {
                completionIds.forEach((completionId) => this.markCompleted(completionId));
            } else {
                this.markCompleted(id);
            }
        }
        if (typeof options.onComplete === 'function') {
            options.onComplete();
        }

        // Schedule chained tutorial timings when a sequence is finished
        try {
            const finishedIds = Array.isArray(completionIds) && completionIds.length > 0 ? completionIds : [id];
            // scram -> plutonium after 30s
            if (finishedIds.includes('scram_intro')) {
                this.plutoniumScheduledAt = Number.isFinite(renderTime) ? (renderTime + 30) : Infinity;
            }
            // plutonium -> neutron after 10s
            if (finishedIds.includes('plutonium_intro')) {
                this.neutronScheduledAt = Number.isFinite(renderTime) ? (renderTime + 10) : Infinity;
            }
        } catch (e) {
            // renderTime or other globals may be undefined in some contexts; fail silently
        }

        this.activeSequence = null;
        this.activeStep = null;
        this.activeStepIndex = -1;
        this.buttonRect = null;

        if (typeof paused !== 'undefined') paused = false;
        this.setUiInteractivityForTutorial(false);
        this.tryOpenNext();
    }

    setUiInteractivityForTutorial(isTutorialActive) {
        if (typeof ui === 'undefined' || !ui.canvas) return;

        if (ui.canvas.shopOverlay) {
            ui.canvas.shopOverlay.style.pointerEvents = isTutorialActive ? 'none' : 'auto';
        }

        if (ui.canvas.sidebar) {
            ui.canvas.sidebar.style.pointerEvents = isTutorialActive ? 'none' : 'auto';
        }
    }

    handleMouseClick(x, y) {
        if (!this.isActive()) return false;

        if (this.buttonRect) {
            const inside = x >= this.buttonRect.x && x <= this.buttonRect.x + this.buttonRect.w && y >= this.buttonRect.y && y <= this.buttonRect.y + this.buttonRect.h;
            if (inside) {
                this.advanceStep();
                return true;
            }
        }

        return true;
    }

    onRunStarted() {
        this.applyUnlocksToShop();
        this.showTutorial('start_welcome');
    }

    onScramPressed() {
        if (!this.hasCompleted('scram_pressed_once')) {
            this.markCompleted('scram_pressed_once');
        }
        if (!this.hasCompleted('scram_intro')) {
            this.showTutorial('scram_intro');
        }
    }

    onControlRodDragged() {
        if (!this.isEnabled) return;
        if (!this.hasCompleted('scram_pressed_once')) return;
        if (!this.hasCompleted('shop_control_rod_purchase')) {
            this.showTutorial('shop_control_rod_purchase');
        }
    }

    onSecondTick() {
        if (!this.isEnabled && typeof gameState !== 'undefined' && gameState === 'PLAYING') {
            this.applyUnlocksWithoutTutorial();
            return;
        }

        if (typeof gameState !== 'undefined' && gameState !== 'PLAYING') return;
        if (typeof paused !== 'undefined' && paused) return;
        if (typeof boom !== 'undefined' && boom) return;

        const currentLoop = (typeof prestigeManager !== 'undefined' && prestigeManager && Number.isFinite(prestigeManager.loopNumber))
            ? prestigeManager.loopNumber
            : 1;
        const powerValue = Number.isFinite(energyOutput) ? energyOutput : 0;
        const money = (typeof player !== 'undefined' && player && typeof player.getBalance === 'function') ? player.getBalance() : 0;

        if (!this.shopUnlocked && money >= 5) {
            this.setShopUnlocked(true);
            if (!this.hasCompleted('shop_unlock_10_money')) {
                this.showTutorial([ 'shop_unlock_10_money', 'shop_unlock_10_money_2', 'shop_unlock_10_money_3' ]);
            }
        }

        if (!this.isItemUnlocked('plutonium') && Number.isFinite(this.plutoniumScheduledAt) && Number.isFinite(renderTime) && renderTime >= this.plutoniumScheduledAt) this.setItemUnlocked('plutonium', true);
        if (!this.isItemUnlocked('atom') && currentLoop >= 2) {
            this.setItemUnlocked('atom', true);
            if (!this.hasCompleted('unlock_atom')) {
                this.showTutorial('unlock_atom');
            }
        }
        if (!this.isItemUnlocked('californium') && currentLoop >= 2) {
            this.setItemUnlocked('californium', true);
        }
        if (!this.isItemUnlocked('group') && currentLoop >= 3) this.setItemUnlocked('group', true);
        if (!this.isItemUnlocked('waterFlow') && currentLoop >= 3) this.setItemUnlocked('waterFlow', true);
        if (!this.isItemUnlocked('controlRod') && currentLoop >= 4) this.setItemUnlocked('controlRod', true);

        if (this.hasCompleted('scram_intro') && !this.hasCompleted('plutonium_intro') && Number.isFinite(this.plutoniumScheduledAt) && Number.isFinite(renderTime) && renderTime >= this.plutoniumScheduledAt) {
            if (!this.isItemUnlocked('plutonium')) {
                this.setItemUnlocked('plutonium', true);
            }
            this.showTutorial('plutonium_intro', {
                onComplete: () => {
                    this.plutoniumIntroAt = Number.isFinite(renderTime) ? renderTime : 0;
                }
            });
        }

        const avgTempValue = Number.isFinite(window.avgTemp) ? window.avgTemp : 0;
        if (!this.hasCompleted('heat_warning') && avgTempValue >= 55) {
            this.showTutorial('heat_warning');
        }

        if (!this.hasCompleted('first_power_output') && powerValue >= 10) {
            this.showTutorial(['first_power_output', 'income_intro']);
        }

        if (!this.hasCompleted('neutron_intro') && Number.isFinite(this.neutronScheduledAt) && Number.isFinite(renderTime) && renderTime >= this.neutronScheduledAt) {
            this.notifyNeutronTutorial();
        }

        if (!this.hasCompleted('first_prestige_available')) {
            const thresholds = (typeof prestigeManager !== 'undefined' && prestigeManager && typeof prestigeManager.getCurrentThresholds === 'function')
                ? prestigeManager.getCurrentThresholds()
                : { money: Infinity, power: Infinity };
            if (money >= thresholds.money && powerValue >= thresholds.power) {
                this.showTutorial('first_prestige_available');
            }
        }

        if (
            currentLoop >= this.endlessLoopStart &&
            this.lastKnownLoop < this.endlessLoopStart &&
            !this.hasCompleted('endless_mode_start')
        ) {
            this.showTutorial('endless_mode_start');
        }

        this.lastKnownLoop = currentLoop;
    }

    applyUnlocksWithoutTutorial() {
        const currentLoop = (typeof prestigeManager !== 'undefined' && prestigeManager && Number.isFinite(prestigeManager.loopNumber))
            ? prestigeManager.loopNumber
            : 1;
        const money = (typeof player !== 'undefined' && player && typeof player.getBalance === 'function') ? player.getBalance() : 0;

        if (!this.shopUnlocked && money >= 5) this.setShopUnlocked(true);
        if (!this.isItemUnlocked('plutonium') && Number.isFinite(this.plutoniumScheduledAt) && Number.isFinite(renderTime) && renderTime >= this.plutoniumScheduledAt) this.setItemUnlocked('plutonium', true);
        if (!this.isItemUnlocked('atom') && currentLoop >= 2) this.setItemUnlocked('atom', true);
        if (!this.isItemUnlocked('californium') && currentLoop >= 2) this.setItemUnlocked('californium', true);
        if (!this.isItemUnlocked('group') && currentLoop >= 3) this.setItemUnlocked('group', true);
        if (!this.isItemUnlocked('waterFlow') && currentLoop >= 3) this.setItemUnlocked('waterFlow', true);
        if (!this.isItemUnlocked('controlRod') && currentLoop >= 4) this.setItemUnlocked('controlRod', true);
    }

    notifyShopItem(itemName) {
        if (!this.isEnabled) return;
        if (itemName === 'atom' && !this.hasCompleted('shop_atom_purchase')) {
            this.showTutorial('shop_atom_purchase');
        }

        if (itemName === 'group' && !this.hasCompleted('shop_group_purchase')) {
            this.showTutorial('shop_group_purchase');
        }

        if (itemName === 'controlRod' && !this.hasCompleted('unlock_control_rod')) {
            this.showTutorial('unlock_control_rod');
        }

        if (itemName === 'waterFlow' && !this.hasCompleted('shop_water_flow_purchase')) {
            this.showTutorial('shop_water_flow_purchase');
        }

        if (itemName === 'plutonium' && !this.hasCompleted('shop_plutonium_purchase')) {
            this.showTutorial('shop_plutonium_purchase');
        }

        if (itemName === 'californium' && !this.hasCompleted('shop_californium_purchase')) {
            this.showTutorial('shop_californium_purchase');
        }
    }

    notifyNeutronTutorial() {
        if (!this.hasCompleted('neutron_intro')) {
            this.showTutorial('neutron_intro');
        }
    }

    notifyFailedPrestige() {
        return;
    }

    on88MphBackwardsButtonPress() {
        this.notifyFailedPrestige();
    }

    notifySuccessfulPrestige() {
        if (!this.hasCompleted('successful_prestige')) {
            this.showTutorial('successful_prestige');
        }
    }

    draw(ctx, simXOffset) {
        if (!this.isActive()) {
            this.buttonRect = null;
            return;
        }

        const rect = this.getWindowRect(this.activeStep, simXOffset);
        const boxX = rect.x;
        const boxY = rect.y;
        const boxW = rect.w;
        const boxH = rect.h;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over'; // Ensure tutorial is drawn on top
        ctx.fillStyle = 'rgba(18, 18, 18, 0.93)';
        ctx.strokeStyle = 'rgba(150, 255, 150, 0.9)';
        ctx.lineWidth = 1.5 * globalScale;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        const title = this.activeStep.title || 'Tutorial';
        const text = this.activeStep.text || '';
        ctx.fillStyle = 'rgba(220, 255, 220, 0.98)';
        ctx.font = `${22 * globalScale}px UIFont1, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, boxX + 16 * globalScale, boxY + 14 * globalScale);

        ctx.font = `${15 * globalScale}px UIFont1, sans-serif`;
        ctx.fillStyle = 'rgba(245, 245, 245, 0.96)';

        const maxTextWidth = boxW - 32 * globalScale;
        const lineHeight = 21 * globalScale;
        const lines = this.wrapText(ctx, text, maxTextWidth);
        let textY = boxY + 52 * globalScale;
        for (const line of lines) {
            ctx.fillText(line, boxX + 16 * globalScale, textY);
            textY += lineHeight;
        }

        const isLastStep = this.activeSequence && this.activeStepIndex >= this.activeSequence.steps.length - 1;
        const btnLabel = isLastStep ? 'Close' : 'Next';
        const btnW = 108 * globalScale;
        const btnH = 36 * globalScale;
        const btnX = boxX + boxW - btnW - 14 * globalScale;
        const btnY = boxY + boxH - btnH - 12 * globalScale;

        this.buttonRect = { x: btnX, y: btnY, w: btnW, h: btnH };
        const hovering = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
        ctx.fillStyle = hovering ? 'rgba(74, 120, 74, 1)' : 'rgba(52, 90, 52, 1)';
        ctx.strokeStyle = 'rgba(220, 255, 220, 0.95)';
        ctx.lineWidth = 1.2 * globalScale;
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = 'white';
        ctx.font = `${16 * globalScale}px UIFont1, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btnLabel, btnX + btnW / 2, btnY + btnH / 2 + 1 * globalScale);

        this.drawHighlight(ctx, simXOffset);

        ctx.restore();
    }

    getWindowRect(step, simXOffset) {
        const layout = step && step.windowLayout ? step.windowLayout : {};
        const relative = layout.relative === 'screen' ? 'screen' : 'sim';

        const areaX = relative === 'screen' ? 0 : simXOffset;
        const areaY = 0;
        const areaW = relative === 'screen' ? screenWidth : (screenWidth - simXOffset);
        const areaH = screenHeight;

        const defaultW = Math.min(520 * globalScale, areaW * 0.72);
        const defaultH = Math.min(210 * globalScale, areaH * 0.32);

        const width = this.resolveDimension(layout.width, areaW, defaultW);
        const height = this.resolveDimension(layout.height, areaH, defaultH);

        const cx = this.resolvePosition(layout.x, areaX, areaW, 0.5);
        const cy = this.resolvePosition(layout.y, areaY, areaH, 0.5);
        const anchorX = Number.isFinite(layout.anchorX) ? layout.anchorX : 0.5;
        const anchorY = Number.isFinite(layout.anchorY) ? layout.anchorY : 0.5;

        let x = cx - width * anchorX;
        let y = cy - height * anchorY;

        const leftBound = Math.max(areaX + 8 * globalScale, simXOffset + 8 * globalScale);
        x = Math.max(leftBound, Math.min(x, areaX + areaW - width - 8 * globalScale));
        y = Math.max(areaY + 8 * globalScale, Math.min(y, areaY + areaH - height - 8 * globalScale));

        return { x, y, w: width, h: height };
    }

    resolveDimension(value, fullSize, fallback) {
        if (!Number.isFinite(value)) return fallback;
        if (value > 0 && value <= 1) return Math.max(120 * globalScale, fullSize * value);
        return Math.max(120 * globalScale, value * globalScale);
    }

    resolvePosition(value, start, fullSize, fallbackNormalized) {
        if (!Number.isFinite(value)) return start + fullSize * fallbackNormalized;
        if (value >= 0 && value <= 1) return start + fullSize * value;
        return start + value * globalScale;
    }

    drawHighlight(ctx, simXOffset) {
        const target = this.activeStep && this.activeStep.highlightTarget;
        if (!target) return;

        const t = (typeof millis === 'function' ? millis() : Date.now()) / 1000;
        const alpha = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 7));
        ctx.save();
        ctx.strokeStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.lineWidth = 3 * globalScale;

        if (target.type === 'sim-object' && target.object === 'plutonium' && typeof plutonium !== 'undefined' && plutonium) {
            ctx.beginPath();
            ctx.arc(simXOffset + plutonium.x, plutonium.y, plutonium.radius * 1.25, 0, Math.PI * 2);
            ctx.stroke();
        } else if (target.type === 'sim-object' && target.object === 'power_meter' && ui && ui.powerMeter) {
            const meterX = simXOffset + ui.powerMeter.x;
            const meterY = ui.powerMeter.y;
            const r = Math.max(ui.powerMeter.width, ui.powerMeter.height) * 0.56;
            ctx.beginPath();
            ctx.arc(meterX, meterY, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (target.type === 'sim-object' && target.object === 'temp_meter' && ui && ui.tempMeter) {
            const meterX = simXOffset + ui.tempMeter.x;
            const meterY = ui.tempMeter.y;
            const r = Math.max(ui.tempMeter.width, ui.tempMeter.height) * 0.56;
            ctx.beginPath();
            ctx.arc(meterX, meterY, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (target.type === 'panel' && target.panel === 'controls') {
            const x = 10 * globalScale;
            const y = 130 * globalScale;
            const w = (simXOffset - 20 * globalScale);
            const h = 180 * globalScale;
            ctx.strokeRect(x, y, w, h);
        }

        ctx.restore();
    }

    wrapText(ctx, text, maxWidth) {
        if (!text) return [''];
        const words = String(text).split(/\s+/);
        const lines = [];
        let line = '';

        for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width <= maxWidth) {
                line = candidate;
            } else {
                if (line) lines.push(line);
                line = word;
            }
        }
        if (line) lines.push(line);
        return lines;
    }
}

window.tutorialManager = new TutorialManager();
