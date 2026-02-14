function oncePerSecond() {
    if (millis() - ui.prevTime >= 1000) {
        const elapsed = ui.accumulatedTime || 0;
        const avgPhysicalKW = (elapsed > 0) ? (energyOutputCounter / elapsed) : 0;
        energyOutput = avgPhysicalKW;

        let moneyThisSecond = 0;
        if (energyOutput >= 10) {
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
                    try { if (ui && ui.canvas && typeof ui.canvas.showToast === 'function') ui.canvas.showToast(`Autosaved to slot ${selected + 1}`, 2000); } catch (e) {}
                }
            }
        } catch (e) { /* ignore autosave errors */ }

        if (energyOutput >= game.boomValue) triggerBoom();

        const collisionFactor = Math.min(1, collisionsThisSecond / settings.neutronsDownSizeMaxAmount); // 0 at 0 collisions, 1 at 500+
        const targetMultiplier = 1 - (collisionFactor * 0.7); // 1.0 to 0.3
        // Set target size; actual `settings.neutronSize` will smoothly interpolate towards this.
        settings.targetNeutronSize = defaultSettings.neutronSize * targetMultiplier * globalScale;
        // Reset the per-second collision counter so size can recover next second
        ui.collisionsThisSecond = 0;
    } else {
        ui.framesCounted++;
    }
}

function setBoomInputLock(isLocked) {
    boomInputLocked = !!isLocked;
    if (ui && ui.canvas && ui.canvas.uiLayer) {
        ui.canvas.uiLayer.style.pointerEvents = boomInputLocked ? 'none' : '';
    }
}

function resetThermalState() {
    for (let atom of uraniumAtoms) {
        if (atom) {
            atom.heat = 25;
            atom.isHit = false;
            atom.flash = 0;
        }
    }

    if (waterSystem && waterSystem.waterCells) {
        for (let wc of waterSystem.waterCells) {
            if (wc) wc.temperature = 25;
        }
    }
    if (waterSystem && waterSystem.temperatureChanges && typeof waterSystem.temperatureChanges.fill === 'function') {
        waterSystem.temperatureChanges.fill(0);
    }
}

function triggerBoom() {
    if (boom) return;

    boom = true;
    boomStartTime = renderTime;
    boomPrestigePopupShown = false;
    setBoomInputLock(true);

    if (typeof neutron !== 'undefined' && neutron && typeof neutron.reset === 'function') {
        neutron.reset(glShit.simGL);
    }
    if (typeof reportSystem !== 'undefined' && reportSystem && typeof reportSystem.reset === 'function') {
        reportSystem.reset(glShit.simGL);
    }
    resetThermalState();
    ui.collisionsThisSecond = 0;

    if (typeof controlRod !== 'undefined' && controlRod && typeof controlRod.resetAll === 'function') {
        controlRod.resetAll();
    }
    if (typeof ui !== 'undefined' && ui && typeof ui.resetRodHandles === 'function') {
        ui.resetRodHandles();
    }

    audioManager.playSfx('boom');

    const thresholds = (prestigeManager && typeof prestigeManager.getCurrentThresholds === 'function')
        ? prestigeManager.getCurrentThresholds()
        : { money: Infinity, power: Infinity };

    const moneyThreshold = Number.isFinite(thresholds.money) ? thresholds.money : Infinity;
    const powerThreshold = Number.isFinite(thresholds.power) ? thresholds.power : Infinity;
    const currentMoney = (player && typeof player.getBalance === 'function') ? player.getBalance() : 0;
    const currentPower = Number.isFinite(energyOutput) ? energyOutput : 0;

    if (currentMoney >= moneyThreshold && currentPower >= powerThreshold) {
        boomOutcome = 'PRESTIGE';
        boomSetbackLoss = 0;
        return;
    }

    boomOutcome = 'SETBACK';
    boomSetbackLoss = Math.max(0, currentMoney * 0.25);

    try {
        const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
        if (playerState && typeof playerState.saveGame === 'function') {
            playerState.saveGame(selected);
            if (ui && ui.canvas && typeof ui.canvas.showToast === 'function') {
                ui.canvas.showToast(`Setback autosaved to slot ${selected + 1}`, 2200);
            }
        }
    } catch (e) { /* ignore setback autosave errors */ }
}

function resetRunForPrestige() {
    if (!boom || boomOutcome !== 'PRESTIGE') return;

    if (prestigeManager && typeof prestigeManager.advanceLoop === 'function') {
        prestigeManager.advanceLoop();
        if (player && typeof prestigeManager.saveToPlayer === 'function') {
            prestigeManager.saveToPlayer(player);
        }
    }

    const freshPlayer = new Player();
    const freshShop = new Shop();
    const nextPrestige = player && player.prestige ? player.prestige : { loopNumber: 1, currentLevelData: null };

    player.deserialize(freshPlayer.serialize());
    player.prestige = nextPrestige;
    if (prestigeManager && typeof prestigeManager.loadFromPlayer === 'function') {
        prestigeManager.loadFromPlayer(player);
    }

    shop.deserialize(freshShop.serialize());

    resetSimulation();
    initializePlayerAtomGroups(player);
    initControlRodUpgrades();

    try {
        const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
        if (playerState && typeof playerState.saveGame === 'function') {
            playerState.saveGame(selected);
            if (ui && ui.canvas && typeof ui.canvas.showToast === 'function') {
                ui.canvas.showToast(`Prestige autosaved to slot ${selected + 1}`, 2200);
            }
        }
    } catch (e) { /* ignore prestige save errors */ }

    if (typeof transitionToPlayingFromPrestige === 'function') {
        transitionToPlayingFromPrestige();
    } else {
        gameState = 'PLAYING';
        setUiVisibility(true);
        paused = false;
    }
}

window.resetRunForPrestige = resetRunForPrestige;

function rollbackSetback() {
    if (!boom || boomOutcome !== 'SETBACK') return;

    if (player && typeof player.applySetbackPenalty === 'function') {
        player.applySetbackPenalty(0.75);
    }

    try {
        const selected = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
        if (playerState && typeof playerState.saveGame === 'function') {
            playerState.saveGame(selected);
        }
    } catch (e) { /* ignore setback save errors */ }

    resetSimulation();
    initializePlayerAtomGroups(player);
    initControlRodUpgrades();
    paused = false;
}

function formatLarge(amount, unit, decimals=2) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(decimals).replace(/\.00$/, '') + 'G' + unit;
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(decimals).replace(/\.00$/, '') + 'M' + unit;
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(decimals).replace(/\.00$/, '') + 'k' + unit;
    return sign + amount.toFixed(decimals).replace(/\.00$/, '') + unit;
}

function resetSimulation() {
    audioManager.fadeOutSfx('boom', 2.0);

    if (typeof neutron !== 'undefined' && neutron && typeof neutron.reset === 'function') {
        neutron.reset(glShit.simGL);
    }
    if (typeof reportSystem !== 'undefined' && reportSystem && typeof reportSystem.reset === 'function') {
        reportSystem.reset(glShit.simGL);
    }

    if (typeof plutonium !== 'undefined' && plutonium) {
        plutonium.resetPosition();
        plutonium.dragging = false;
    }
    if (typeof californium !== 'undefined' && californium) {
        californium.resetPosition();
        californium.dragging = false;
        californium.spawnTimer = 0;
    }
    
    resetThermalState();
    controlRods.forEach((rod, i) => {
        rod.y = rod.initialY;
        rod.targetY = rod.initialY;
    });
    ui.controlSlider.draggingIndex = -1;
    ui.controlSlider.ensureHandleLength();
    settings = { ...defaultSettings };
    settings.waterFlowSpeed = player.waterFlowStart;
    settings.waterFlowSpeed = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowSpeed));
    if (prestigeManager && typeof prestigeManager.applyCurrentLoopScaling === 'function') {
        prestigeManager.applyCurrentLoopScaling();
    }
    // Initialize neutron size target to default scaled value
    settings.neutronSize = defaultSettings.neutronSize * globalScale;
    settings.targetNeutronSize = settings.neutronSize;
    boom = false;
    boomStartTime = 0;
    boomOutcome = 'NONE';
    boomPrestigePopupShown = false;
    boomSetbackLoss = 0;
    setBoomInputLock(false);
    energyOutput = 0;
    energyOutputCounter = 0;
    ui.collisionsThisSecond = 0;
}

function startFreshGame() {
    const defaultPlayer = new Player();
    const defaultShop = new Shop();

    player.deserialize(defaultPlayer.serialize());
    shop.deserialize(defaultShop.serialize());

    resetSimulation();
    initializePlayerAtomGroups(player);
    initControlRodUpgrades();
    if (prestigeManager && typeof prestigeManager.loadFromPlayer === 'function') {
        prestigeManager.loadFromPlayer(player);
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

