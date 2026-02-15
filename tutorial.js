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
        this.endlessLoopStart = 6;
        this.lastKnownLoop = 1;

        this.shopUnlocked = true;
        this.itemUnlocks = {
            atom: true,
            group: true,
            controlRod: true,
            waterFlow: true,
            californium: true,
            plutonium: true
        };
    }

    loadFromSave(saveData) {
        const hasTimestamp = !!(saveData && saveData.timestamp);
        const newGameMode = !!(saveData && saveData.tutorialMode === 'new');
        const legacySave = hasTimestamp && typeof saveData.tutorialShopUnlocked !== 'boolean';

        this.isEnabled = saveData && typeof saveData.tutorialEnabled === 'boolean'
            ? saveData.tutorialEnabled
            : true;

        const loadedCompleted = (saveData && saveData.tutorialCompleted && typeof saveData.tutorialCompleted === 'object')
            ? saveData.tutorialCompleted
            : {};

        this.completed = { ...loadedCompleted };

        const defaultUnlocked = legacySave || !newGameMode;
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
            plutonium: loadedItemUnlocks && typeof loadedItemUnlocks.plutonium === 'boolean' ? loadedItemUnlocks.plutonium : defaultUnlocked
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
        this.itemUnlocks[itemName] = !!unlocked;
        if (itemName === 'plutonium' && this.itemUnlocks[itemName] && typeof plutonium !== 'undefined' && plutonium && typeof plutonium.syncFromPlayer === 'function') {
            plutonium.syncFromPlayer();
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

    queueTutorial(id, steps, options = {}) {
        if (!this.isEnabled) return false;
        if (!id || !Array.isArray(steps) || steps.length === 0) return false;
        if (!options.allowRepeat && this.hasCompleted(id)) return false;

        const inQueue = this.queue.some(entry => entry.id === id);
        const isActive = this.activeSequence && this.activeSequence.id === id;
        if (inQueue || isActive) return false;

        this.queue.push({ id, steps, options });
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
        const { id, options } = this.activeSequence;
        if (!options.allowRepeat) {
            this.markCompleted(id);
        }
        if (typeof options.onComplete === 'function') {
            options.onComplete();
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
        if (!window.ui || !ui.canvas) return;

        if (ui.canvas.canvas) {
            ui.canvas.canvas.style.zIndex = isTutorialActive ? '80' : '15';
        }

        if (ui.canvas.sidebar) {
            ui.canvas.sidebar.style.pointerEvents = isTutorialActive ? 'none' : 'auto';
        }

        if (ui.canvas.shopOverlay) {
            ui.canvas.shopOverlay.style.pointerEvents = isTutorialActive ? 'none' : 'auto';
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
        this.queueTutorial('start_welcome', [
            {
                title: 'Decayed history',
                text: 'You bought a strange industrial building from an Ukrainian auction. As you arrive there, you notice a Swedish car branded Tserno outside. It emits an eerie hum... Or are your ears playing tricks on you? You don\'t waste many thoughts on the car, and step inside the building.',
                windowLayout: { x: 0.5, y: 0.44, width: 0.72, height: 0.30, relative: 'sim' }
            },
            {
                title: 'What does the inside of your nose smell like?',
                text: 'Inside the old building is some weird stuff that you don\'t recognize. It has a weird smell of ozone and burnt metal lingering in the air. You go in to explore.',
                highlightTarget: { type: 'panel', panel: 'controls' },
                windowLayout: { x: 0.5, y: 0.56, width: 0.72, height: 0.30, relative: 'sim' }
            }
        ]);
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

        if (!this.shopUnlocked && money >= 10) {
            this.queueTutorial('shop_unlock_10_money', [{
                title: 'Shop Online',
                text: 'You earned your first money. A dusty terminal unlocks and shows reactor upgrades for sale.',
                windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
            }], {
                onComplete: () => {
                    this.setShopUnlocked(true);
                }
            });
        }

        if (!this.isItemUnlocked('atom') && currentLoop >= 2) {
            this.queueTutorial('unlock_atom', [{
                title: 'Uranium Unlocked',
                text: 'Uranium can now be bought. More uranium means more targets for neutron hits and stronger chain reactions.',
                blinkLayer: 'uranium'
            }], {
                onComplete: () => {
                    this.setItemUnlocked('atom', true);
                }
            });
        }

        if (!this.isItemUnlocked('californium') && currentLoop >= 2) {
            this.queueTutorial('unlock_californium', [{
                title: 'Californium Unlocked',
                text: 'Californium can now be used. It emits neutrons and helps kickstart stronger fission activity.',
                blinkLayer: 'neutrons'
            }], {
                onComplete: () => {
                    this.setItemUnlocked('californium', true);
                }
            });
        }

        if (!this.isItemUnlocked('group') && currentLoop >= 3) {
            this.queueTutorial('unlock_group', [{
                title: 'Uranium Groups Unlocked',
                text: 'You can now expand the reactor with whole uranium groups. Expansion increases both output and risk.',
                blinkLayer: 'uranium'
            }], {
                onComplete: () => {
                    this.setItemUnlocked('group', true);
                }
            });
        }

        if (!this.isItemUnlocked('waterFlow') && currentLoop >= 3) {
            this.queueTutorial('unlock_water_flow', [{
                title: 'Water Valve Control',
                text: 'Manual water flow control is now unlocked. Flow speed directly affects cooling and power behavior.'
            }], {
                onComplete: () => {
                    this.setItemUnlocked('waterFlow', true);
                }
            });
        }

        if (!this.isItemUnlocked('controlRod') && currentLoop >= 4) {
            this.queueTutorial('unlock_control_rod', [{
                title: 'Control Rod Upgrades',
                text: 'Additional control rods are now available. Use them to tame neutron growth and stabilize the core.',
                blinkLayer: 'rods'
            }], {
                onComplete: () => {
                    this.setItemUnlocked('controlRod', true);
                }
            });
        }

        if (!this.hasCompleted('timer_1m') && typeof renderTime === 'number' && renderTime >= 30) {
            this.queueTutorial('timer_1m', [{
                title: 'What Is This Place?',
                text: 'The weird building starts to make sense. This is a retired nuclear reactor facility. Probably unsafe. Definitely useful. You push a button labeled "Don\'t push" and the lights flicker on. A console blinks to life, displaying a single line of text: "Reactor core functional"',
                windowLayout: { x: 0.5, y: 0.40, width: 0.70, height: 0.30, relative: 'sim' }
            }]);
        }

        if (this.hasCompleted('timer_1m') && !this.hasCompleted('timer_2m_plutonium') && typeof renderTime === 'number' && renderTime >= 60) {
            if (!this.isItemUnlocked('plutonium')) {
                this.setItemUnlocked('plutonium', true);
            }
            this.queueTutorial('timer_2m_plutonium', [{
                title: 'Too Weak to Matter',
                text: 'This reactor is currently useless, it generates little to no power. You find a strange glowing green rock, and throw it into the reactor. Some water starts to boil instantly.',
                highlightTarget: { type: 'sim-object', object: 'plutonium' }
            }, {
                title: 'Plutonium',
                text: 'This is plutonium, a highly radioactive element that can\'t sustain a chain reaction. It\'s just a heat source, and doesn\'t emit any neutrons.',
                highlightTarget: { type: 'sim-object', object: 'plutonium' }
            }]);
        }

        const avgTempValue = Number.isFinite(window.avgTemp) ? window.avgTemp : 0;
        if (!this.hasCompleted('first_heat_100c') && avgTempValue >= 100) {
            this.queueTutorial('first_heat_100c', [{
                title: 'Heat Rising',
                text: 'Average core temperature passed 100°C. Monitor the temperature to avoid an expensive and fiery life lesson.',
                highlightTarget: { type: 'sim-object', object: 'temp_meter' }
            }, {
                title: 'Tempting',
                text: 'You feel tempted to push the limits.'
            }]);
        }

        if (!this.hasCompleted('first_power_10kw') && powerValue >= 10) {
            this.queueTutorial('first_power_10kw', [{
                title: 'First Output',
                text: 'Power reached 10 kW. A low hum fills the hall as the reactor begins to feel alive. You notice a power meter. It\'s a simple dial, but it gives you a sense of accomplishment. You wonder how high it can go.',
                highlightTarget: { type: 'sim-object', object: 'power_meter' }
            }], {
                onComplete: () => {
                    this.firstPowerTutorialAt = Number.isFinite(renderTime) ? renderTime : 0;
                }
            });
        }

        if (powerValue >= 10 && !this.hasCompleted('neutron_intro')) {
            this.notifyNeutronTutorial();
        }

        if (
            this.firstPowerTutorialAt !== null &&
            !this.hasCompleted('money_followup_1m') &&
            Number.isFinite(renderTime) &&
            renderTime >= this.firstPowerTutorialAt + 30
        ) {
            this.queueTutorial('money_followup_1m', [{
                title: 'Sell the Output',
                text: 'If this machine makes power, it can make money. Time to get rich.'
            }]);
        }

        if (!this.hasCompleted('first_prestige_available')) {
            const thresholds = (typeof prestigeManager !== 'undefined' && prestigeManager && typeof prestigeManager.getCurrentThresholds === 'function')
                ? prestigeManager.getCurrentThresholds()
                : { money: Infinity, power: Infinity };
            if (money >= thresholds.money && powerValue >= thresholds.power) {
                this.queueTutorial('first_prestige_available', [{
                    title: 'A Strange Device',
                    text: 'Near the reactor wall you spot a Y-shaped rig with three glowing channels and a pulsing central chamber. It looks home made and clumsy, but seems to be functional. This might have been a good time to find it.',
                    windowLayout: { x: 0.5, y: 0.36, width: 0.75, height: 0.30, relative: 'sim' }
                }]);
            }
        }

        if (
            currentLoop >= this.endlessLoopStart &&
            this.lastKnownLoop < this.endlessLoopStart &&
            !this.hasCompleted('endless_mode_start')
        ) {
            this.queueTutorial('endless_mode_start', [{
                title: 'Endless Phase',
                text: 'The Great Glow has taken control of you. You will do this over and over again, without end. May the Atom\'s blessings be upon you.'
            }]);
        }

        this.lastKnownLoop = currentLoop;
    }

    applyUnlocksWithoutTutorial() {
        const currentLoop = (typeof prestigeManager !== 'undefined' && prestigeManager && Number.isFinite(prestigeManager.loopNumber))
            ? prestigeManager.loopNumber
            : 1;
        const money = (typeof player !== 'undefined' && player && typeof player.getBalance === 'function') ? player.getBalance() : 0;

        if (!this.shopUnlocked && money >= 10) this.setShopUnlocked(true);
        if (!this.isItemUnlocked('plutonium') && typeof renderTime === 'number' && renderTime >= 60) this.setItemUnlocked('plutonium', true);
        if (!this.isItemUnlocked('atom') && currentLoop >= 2) this.setItemUnlocked('atom', true);
        if (!this.isItemUnlocked('californium') && currentLoop >= 2) this.setItemUnlocked('californium', true);
        if (!this.isItemUnlocked('group') && currentLoop >= 3) this.setItemUnlocked('group', true);
        if (!this.isItemUnlocked('waterFlow') && currentLoop >= 3) this.setItemUnlocked('waterFlow', true);
        if (!this.isItemUnlocked('controlRod') && currentLoop >= 4) this.setItemUnlocked('controlRod', true);
    }

    notifyShopItem(itemName) {
        if (!this.isEnabled) return;
        if (itemName === 'atom' && !this.hasCompleted('shop_atom_purchase')) {
            this.queueTutorial('shop_atom_purchase', [{
                title: 'Uranium Columns',
                text: 'Uranium pieces are your reactor body. More pieces means more targets for neutrons to hit.',
                blinkLayer: 'uranium'
            }]);
        }

        if (itemName === 'group' && !this.hasCompleted('shop_group_purchase')) {
            this.queueTutorial('shop_group_purchase', [{
                title: 'New Uranium Group',
                text: 'A new group increases reactor footprint and potential output. Expand carefully to keep cooling in control.',
                blinkLayer: 'uranium'
            }]);
        }

        if (itemName === 'controlRod' && !this.hasCompleted('shop_control_rod_purchase')) {
            this.queueTutorial('shop_control_rod_purchase', [{
                title: 'Control Rod Added',
                text: 'Control rods are used to slow down neutrons and make them more probable to hit uranium atoms.',
                blinkLayer: 'rods'
            }]);
        }

        if (itemName === 'waterFlow' && !this.hasCompleted('shop_water_flow_purchase')) {
            this.queueTutorial('shop_water_flow_purchase', [{
                title: 'Water Valve',
                text: 'Control the water flow to keep the reactor hot, but not overheating.'
            }]);
        }

        if (itemName === 'plutonium' && !this.hasCompleted('shop_plutonium_purchase')) {
            this.queueTutorial('shop_plutonium_purchase', [{
                title: 'Denser Heat Source',
                text: 'Upgrading plutonium increases its heating power and size. Use it carefully to push output without tripping into runaway temperatures.',
                highlightTarget: { type: 'sim-object', object: 'plutonium' }
            }]);
        }
    }

    notifyNeutronTutorial() {
        if (!this.hasCompleted('neutron_intro')) {
            this.queueTutorial('neutron_intro', [{
                title: 'Neutron Dynamics',
                text: 'Uranium atoms spontaneously decay, releasing some neutrons slowly. When those neutrons hit other uranium atoms, they can cause them to decay on hit, and release two more neutrons. If there is enough uranium around, this will cause a (controlled) chain reaction.',
                blinkLayer: 'neutrons',
                windowLayout: { x: 0.5, y: 0.30, width: 0.70, height: 0.30, relative: 'sim' }
            }]);
        }
    }

    notifyFailedPrestige() {
        if (!this.hasCompleted('failed_prestige')) {
            this.queueTutorial('failed_prestige', [{
                title: 'Not so great glow',
                text: 'You have failed the Atom\'s calling. The device you found earlier, flickers and the timeline snaps a bit back but not cleanly. You lose part of your progress.'
            }]);
        }
    }

    notifySuccessfulPrestige() {
        if (!this.hasCompleted('successful_prestige')) {
            this.queueTutorial('successful_prestige', [{
                title: 'Prestigeous!',
                text: 'The reactor collapses and reforms around a stronger baseline. You return stronger. You feel a glow inside you.'
            }]);
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

        x = Math.max(areaX + 8 * globalScale, Math.min(x, areaX + areaW - width - 8 * globalScale));
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
