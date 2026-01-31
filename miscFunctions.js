function oncePerSecond() {
    if (millis() - ui.prevTime >= 1000) {
        energyOutput = energyOutputCounter / ui.framesCounted;
        energyOutputCounter = 0;
        ui.avgFps = ui.framesCounted;
        ui.framesCounted = 0;
        ui.prevTime = millis();
    } else {
        ui.framesCounted++;
    }
}

function resetSimulation() {
    for (let atom of uraniumAtoms) {
        atom.temperature = 25;
    }
    // Reset control rods to their initial positions and reset slider handles
    controlRods.forEach((rod, i) => {
        if (typeof rod.initialY !== 'undefined') {
            rod.y = rod.initialY;
            rod.targetY = rod.initialY;
        } else {
            rod.targetY = -100;
        }
    });
    if (ui && ui.controlSlider) {
        ui.controlSlider.draggingIndex = -1;
        if (ui.controlSlider.handleY && ui.controlSlider.handleY.length === controlRods.length) {
            for (let i = 0; i < controlRods.length; i++) {
                ui.controlSlider.handleY[i] = controlRods[i].y + controlRods[i].height;
            }
        }
    }
    Object.assign(settings, defaultSettings);
    initializeControls();
    boom = false;
}

function eventListeners() {
    //-----pause-----
    document.addEventListener("visibilitychange", () => {
        paused = document.hidden;
        if (!paused) last = performance.now();
    });
    window.addEventListener("blur", () => paused = true);
    window.addEventListener("focus", () => {
        paused = false;
        last = performance.now();
    });
    //-----pause-----



}

function scaleMouse(xx, yy) {
    // Translate to the center of the canvas
    let translatedX = xx - screenRenderWidth / 2;
    let translatedY = yy - screenHeight / 2;

    // Scale by the inverse of the scaling factor
    let scaleFactor = 1; // (screenHeight / screenHeight);
    let scaledX = translatedX / scaleFactor;
    let scaledY = translatedY / scaleFactor;

    // Translate back to the original position
    let finalX = scaledX + screenSimWidth / 2;
    let finalY = scaledY + screenHeight / 2;

    return {
        x: finalX,
        y: finalY
    };
}

