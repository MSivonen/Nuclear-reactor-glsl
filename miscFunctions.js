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

        if (energyOutput >= game.boomValue) boom = true;

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
    
    // Reset atom heat and visual state
    for (let atom of uraniumAtoms) {
        if (atom) {
            atom.heat = 25;
            atom.isHit = false;
            atom.flash = 0;
        }
    }
    // Reset water cell temperatures
    if (waterSystem && waterSystem.waterCells) {
        for (let wc of waterSystem.waterCells) {
            if (wc) wc.temperature = 25;
        }
    }
    controlRods.forEach((rod, i) => {
        rod.y = rod.initialY;
        rod.targetY = rod.initialY;
    });
    ui.controlSlider.draggingIndex = -1;
    ui.controlSlider.ensureHandleLength();
    settings = { ...defaultSettings };
    settings.waterFlowSpeed = player.waterFlowStart;
    settings.waterFlowSpeed = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowSpeed));
    // Initialize neutron size target to default scaled value
    settings.neutronSize = defaultSettings.neutronSize * globalScale;
    settings.targetNeutronSize = settings.neutronSize;
    boom = false;
    boomStartTime = 0;
    energyOutput = 0;
    energyOutputCounter = 0;
}

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

