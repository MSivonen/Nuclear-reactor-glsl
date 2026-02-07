function oncePerSecond() {
    if (millis() - ui.prevTime >= 1000) {
        // Compute per-second average physical power (kW)
        const elapsed = ui.accumulatedTime || 0;
        const avgPhysicalKW = (elapsed > 0) ? (energyOutputCounter / elapsed) : 0;
        energyOutput = avgPhysicalKW; // store as physical kW

        // Money: exponential mapping with threshold (discard under 10 kW)
        let moneyThisSecond = 0;
        if (energyOutput >= 10) {
            moneyThisSecond = Math.pow(energyOutput / 100.0, settings.moneyExponent);
        }
        lastMoneyPerSecond = moneyThisSecond;
        if (typeof player !== 'undefined' && player && typeof player.addMoney === 'function') {
            player.addMoney(moneyThisSecond);
        }

        // Reset accumulators
        energyOutputCounter = 0;
        ui.accumulatedTime = 0;

        // FPS bookkeeping
        ui.avgFps = ui.framesCounted;
        ui.framesCounted = 0;
        ui.prevTime = millis();

        // Capture collisions before reset
        const collisionsThisSecond = ui.collisionsThisSecond;

        if (typeof updateCountersHTML === 'function') updateCountersHTML();
        // Bomb check: energyOutput is in physical kW, boomValue is kW
        if (energyOutput >= game.boomValue) boom = true;

        // Calculate neutron size based on collisions per second
        const collisionFactor = Math.min(1, collisionsThisSecond / settings.neutronsDownSizeMaxAmount); // 0 at 0 collisions, 1 at 500+
        const targetMultiplier = 1 - (collisionFactor * 0.7); // 1.0 to 0.3
        settings.neutronSize = defaultSettings.neutronSize * targetMultiplier * globalScale;
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
    // Fade out boom if active
    audioManager.fadeOutSfx('boom', 2.0); // 1.0 second fade out
    
    for (let atom of uraniumAtoms) {
        atom.temperature = 25;
    }
    // Reset control rods to their initial positions and reset slider handles
    controlRods.forEach((rod, i) => {
        if (!rod) return;
        if (typeof rod.initialY !== 'undefined') {
            rod.y = rod.initialY;
            rod.targetY = rod.initialY;
        } else {
            rod.targetY = -100;
        }
    });
    if (ui && ui.controlSlider) {
        ui.controlSlider.draggingIndex = -1;
        ui.controlSlider.ensureHandleLength();
    }
    settings = { ...defaultSettings };
    if (typeof player !== 'undefined' && player) {
        if (typeof player.waterFlowStart === 'number') {
            settings.waterFlowSpeed = player.waterFlowStart;
        }
        settings.waterFlowSpeed = Math.max(player.waterFlowMin || 0, Math.min(player.waterFlowMax || 1, settings.waterFlowSpeed));
    }
    initializeControls();
    boom = false;
    boomStartTime = 0; // Reset the boom animation timer
    energyOutput = 0;
    energyOutputCounter = 0;
}

function eventListeners() {
    //-----pause-----
    const pauseForVisibility = () => {
        paused = true;
        if (ui && ui.canvas) ui.canvas.pauseMenuState = 'MAIN';
        if (typeof audioManager !== 'undefined' && audioManager && typeof audioManager.stopAllImmediate === 'function') {
            audioManager.stopAllImmediate();
        } else if (typeof audioManager !== 'undefined' && audioManager) {
            audioManager.update(0, settings, energyOutput, true, game ? game.boomValue : undefined);
        }
        if (typeof last !== 'undefined') last = performance.now();
    };

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            pauseForVisibility();
        } else {
            // Keep paused when returning to the tab; user must resume manually.
            paused = true;
            if (typeof last !== 'undefined') last = performance.now();
        }
    });
    window.addEventListener("blur", pauseForVisibility);
    window.addEventListener("focus", () => {
        // Keep paused on focus; user must resume manually.
        paused = true;
        if (typeof last !== 'undefined') last = performance.now();
    });
    //-----pause-----



}

function scaleMouse(xx, yy) {
    const finalX = xx - SHOP_WIDTH;
    const finalY = yy;

    return { x: finalX, y: finalY };
}

