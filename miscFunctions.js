function oncePerSecond() {
    if (millis() - ui.prevTime >= 1000) {
        const elapsed = ui.accumulatedTime || 0;
        const avgPhysicalKW = (elapsed > 0) ? (energyOutputCounter / elapsed) : 0;
        energyOutput = avgPhysicalKW;

        let moneyThisSecond = 0;
        if (energyOutput >= 1) {
            moneyThisSecond = Math.pow(energyOutput / 100.0, settings.moneyExponent);
        }
        lastMoneyPerSecond = moneyThisSecond;
        player.addMoney(moneyThisSecond);

        energyOutputCounter = 0;
        ui.accumulatedTime = 0;

        ui.avgFps = ui.framesCounted;
        ui.framesCounted = 0;
        ui.prevTime = millis();

        const collisionsThisSecond = ui.collisionsThisSecond;

        // Autosave every 60 seconds to the selected slot
        ui.autosaveCounter = (ui.autosaveCounter || 0) + 1;
        try {
            const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
            if (ui.autosaveCounter >= 60) {
                ui.autosaveCounter = 0;
                if (playerState && typeof playerState.saveGame === 'function') {
                    playerState.saveGame(selected);
                    try { if (ui && ui.canvas && typeof ui.canvas.showToast === 'function') ui.canvas.showToast(`Autosaved to slot ${selected + 1}`, 2000); } catch (e) { }
                }
            }
        } catch (e) { console.log("Autosave error:", e); }

        const tempLimit = (ui && ui.tempMeter && Number.isFinite(ui.tempMeter.max))
            ? ui.tempMeter.max
            : 500;
        const avgTempValue = Number.isFinite(window.avgTemp) ? window.avgTemp : 0;
        if (energyOutput >= game.boomValue || avgTempValue >= tempLimit) triggerBoom();

        const collisionFactor = Math.min(1, collisionsThisSecond / settings.neutronsDownSizeMaxAmount); // 0 at 0 collisions, 1 at 500+
        const targetMultiplier = 1 - (collisionFactor * 0.7); // 1.0 to 0.3
        // Set target size; actual `settings.neutronSize` will smoothly interpolate towards this.
        settings.targetNeutronSize = defaultSettings.neutronSize * targetMultiplier * globalScale;
        // Reset the per-second collision counter so size can recover next second
        ui.collisionsThisSecond = 0;

        if (window.tutorialManager && typeof window.tutorialManager.onSecondTick === 'function') {
            window.tutorialManager.onSecondTick();
        }
    } else {
        ui.framesCounted++;
    }
}

function setBoomInputLock(isLocked) {
    boomInputLocked = !!isLocked;
    ui.canvas.uiLayer.style.pointerEvents = boomInputLocked ? 'none' : '';
}

function resetThermalState() {
    for (let atom of uraniumAtoms) {
        atom.heat = 25;
        atom.isHit = false;
        atom.flash = 0;
    }

    if (waterSystem && waterSystem.waterCells) {
        for (let wc of waterSystem.waterCells) {
            wc.temperature = 25;
        }
    }
    if (waterSystem && waterSystem.temperatureChanges && typeof waterSystem.temperatureChanges.fill === 'function') {
        waterSystem.temperatureChanges.fill(0);
    }
}

function triggerBoom() {
    if (boom) return;

    const thresholds = (prestigeManager && typeof prestigeManager.getCurrentThresholds === 'function')
        ? prestigeManager.getCurrentThresholds()
        : { money: Infinity, power: Infinity };

    const moneyThreshold = Number.isFinite(thresholds.money) ? thresholds.money : Infinity;
    const powerThreshold = Number.isFinite(thresholds.power) ? thresholds.power : Infinity;
    const currentMoney = (player && typeof player.getBalance === 'function') ? player.getBalance() : 0;
    const currentPower = Number.isFinite(energyOutput) ? energyOutput : 0;
    const qualifiesForPrestige = currentMoney >= moneyThreshold && currentPower >= powerThreshold;

    boom = true;
    boomStartTime = renderTime;
    boomPrestigePopupShown = false;
    setBoomInputLock(true);

    neutron.reset(glShit.simGL);
    reportSystem.reset(glShit.simGL);
    resetThermalState();
    ui.collisionsThisSecond = 0;

    ui.canvas.resetModeratorHandles();

    settings.linkRods = false;

    ui.canvas.updateLinkModeratorsButton && ui.canvas.updateLinkModeratorsButton();

    audioManager.playSfx('boom');

    if (Array.isArray(moderators)) {
        moderators.forEach((rod) => {
            rod.y = rod.initialY;
            rod.targetY = rod.initialY; // Ensure targets are reset
        });
    }

    if (qualifiesForPrestige) {
        boomOutcome = 'PRESTIGE';
        boomSetbackLoss = 0;
        return;
    }

    boomOutcome = 'SETBACK';
    boomSetbackLoss = Math.max(0, currentMoney * 0.25);

    boomShowFailedPrestigeLore = false;
    if (window.tutorialManager && typeof window.tutorialManager.hasCompleted === 'function' && typeof window.tutorialManager.markCompleted === 'function') {
        if (!window.tutorialManager.hasCompleted('failed_prestige_story_seen')) {
            boomShowFailedPrestigeLore = true;
            window.tutorialManager.markCompleted('failed_prestige_story_seen');
        }
    }

    try {
        const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
        if (playerState && typeof playerState.saveGame === 'function') {
            playerState.saveGame(selected);
            if (ui && ui.canvas && typeof ui.canvas.showToast === 'function') {
                ui.canvas.showToast(`Setback autosaved to slot ${selected + 1}`, 2200);
            }
        }
    } catch (e) { console.log("Setback autosave error:", e); }

}

function resetRunForPrestige() {
    if (!boom || boomOutcome !== 'PRESTIGE') return;

    prestigeManager.advanceLoop();
    if (player && typeof prestigeManager.saveToPlayer === 'function') {
        prestigeManager.saveToPlayer(player);
    }

    const freshPlayer = new Player();
    const freshShop = new Shop();
    const nextPrestige = player && player.prestige ? player.prestige : { loopNumber: 1, currentLevelData: null };

    player.deserialize(freshPlayer.serialize());
    player.prestige = nextPrestige;
    prestigeManager.loadFromPlayer(player);

    shop.deserialize(freshShop.serialize());

    resetSimulation();
    initializePlayerAtomGroups(player);
    initModeratorUpgrades();

    try {
        const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
        if (playerState && typeof playerState.saveGame === 'function') {
            playerState.saveGame(selected);
            if (ui && ui.canvas && typeof ui.canvas.showToast === 'function') {
                ui.canvas.showToast(`Prestige autosaved to slot ${selected + 1}`, 2200);
            }
        }
    } catch (e) { console.log("Prestige autosave error:", e); }

    if (typeof transitionToPlayingFromPrestige === 'function') {
        transitionToPlayingFromPrestige();
    } else {
        gameState = 'PLAYING';
        setUiVisibility(true);
        paused = false;
    }

    if (window.tutorialManager && typeof window.tutorialManager.notifySuccessfulPrestige === 'function') {
        window.tutorialManager.notifySuccessfulPrestige();
    }
}

window.resetRunForPrestige = resetRunForPrestige;

function rollbackSetback() {
    if (!boom || boomOutcome !== 'SETBACK') return;

    player.applySetbackPenalty(0.75);

    try {
        const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
        if (playerState && typeof playerState.saveGame === 'function') {
            playerState.saveGame(selected);
        }
    } catch (e) { /* ignore setback save errors */ }

    resetSimulation();
    initializePlayerAtomGroups(player);
    initModeratorUpgrades();
    paused = false;

}

function formatLarge(amount, unit, decimals = 2) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(decimals).replace(/\.00$/, '') + 'G' + unit;
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(decimals).replace(/\.00$/, '') + 'M' + unit;
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(decimals).replace(/\.00$/, '') + 'k' + unit;
    return sign + amount.toFixed(decimals).replace(/\.00$/, '') + unit;
}

function resetSimulation() {
    audioManager.fadeOutSfx('boom', 2.0);

    neutron.reset(glShit.simGL);
    reportSystem.reset(glShit.simGL);

    if (typeof plutonium !== 'undefined' && plutonium) {
        plutonium.resetPosition();
        if (typeof plutonium.syncFromPlayer === 'function') {
            plutonium.syncFromPlayer();
        }
        plutonium.dragging = false;
    }
    if (typeof californium !== 'undefined' && californium) {
        californium.resetPosition();
        if (typeof californium.syncFromPlayer === 'function') {
            californium.syncFromPlayer();
        }
        californium.dragging = false;
        californium.spawnTimer = 0;
    }

    resetThermalState();
    if (Array.isArray(moderators)) {
        moderators.forEach((rod) => {
            rod.y = rod.initialY;
            rod.targetY = rod.initialY;
        });
    }
    if (ui && ui.canvas && typeof ui.canvas.resetModeratorHandles === 'function') {
        ui.canvas.resetModeratorHandles();
    } else if (ui && ui.controlSlider) {
        ui.controlSlider.handleY = new Array((moderators && moderators.length) ? moderators.length : 0).fill(0);
        for (let i = 0; i < ((moderators && moderators.length) ? moderators.length : 0); i++) {
            ui.controlSlider.handleY[i] = clampModeratorHandleY(i, moderators[i].initialY + moderators[i].height);
        }
        ui.controlSlider.draggingIndex = -1;
        ui.controlSlider.ensureHandleLength();
    }
    settings = { ...defaultSettings };
    settings.waterFlowSpeed = player.waterFlowStart;
    settings.waterFlowTarget = player.waterFlowStart;
    settings.waterFlowSpeed = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowSpeed));
    settings.waterFlowTarget = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowTarget));
    prestigeManager.applyCurrentLoopScaling();
    settings.neutronSize = defaultSettings.neutronSize * globalScale;
    settings.targetNeutronSize = settings.neutronSize;
    boom = false;
    boomStartTime = 0;
    boomOutcome = 'NONE';
    boomPrestigePopupShown = false;
    boomSetbackLoss = 0;
    boomShowFailedPrestigeLore = false;
    setBoomInputLock(false);
    energyOutput = 0;
    energyOutputCounter = 0;
    ui.collisionsThisSecond = 0;
    renderTime = 0;
}

function startFreshGame() {
    const defaultPlayer = new Player();
    const defaultShop = new Shop();

    player.deserialize(defaultPlayer.serialize());
    shop.deserialize(defaultShop.serialize());
    if (typeof plutonium !== 'undefined' && plutonium && typeof plutonium.syncFromPlayer === 'function') {
        plutonium.syncFromPlayer();
    }

    resetSimulation();
    initializePlayerAtomGroups(player);
    initModeratorUpgrades();
    if (prestigeManager && typeof prestigeManager.loadFromPlayer === 'function') {
        prestigeManager.loadFromPlayer(player);
    }

    if (window.tutorialManager && typeof window.tutorialManager.loadFromSave === 'function') {
        window.tutorialManager.loadFromSave({
            tutorialEnabled: true,
            tutorialCompleted: {},
            tutorialShopUnlocked: false,
            tutorialItemUnlocks: {
                atom: false,
                group: false,
                moderator: false,
                waterFlow: false,
                californium: false,
                plutonium: false
            },
            tutorialMode: 'new'
        });
    }
}

window.startFreshGame = startFreshGame;

function eventListeners() {
    const pauseForVisibility = () => {
        paused = true;
        ui.canvas.pauseMenuState = 'MAIN';
        audioManager.stopAllImmediate();
    };

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            pauseForVisibility();
        } else {
            paused = true;
        }
    });
    window.addEventListener("blur", pauseForVisibility);
    window.addEventListener("focus", () => {
        paused = true;
    });
}

function scaleMouse(xx, yy) {
    const finalX = xx - SHOP_WIDTH;
    const finalY = yy;

    return { x: finalX, y: finalY };
}

