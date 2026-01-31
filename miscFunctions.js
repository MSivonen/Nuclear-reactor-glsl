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
    controlRods.forEach(rod => rod.targetY = -100);
    Object.assign(settings, defaultSettings);
    initializeControls();
    boom = false;
}

function eventListeners(){
    document.addEventListener("visibilitychange", () => {
        paused = document.hidden;
        if (!paused) last = performance.now();
    });
    window.addEventListener("blur", () => paused = true);
    window.addEventListener("focus", () => {
        paused = false;
        last = performance.now();
    });
}

function gameOver(ctx, offsetX = 0) {
    if (!boom) return;
    if (mouseIsPressed && mouseButton === LEFT) {
        resetSimulation();
    }

    settings.collisionProbability = 0;
    const boomText = 'Boom mathafuka';

    const centerX = offsetX + screenSimWidth / 2;
    const centerY = screenHeight / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Layered glow/blur approximation by rendering multiple stroked/filled texts
    ctx.font = '142px HarryP, sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 10, centerY + (Math.random() - 0.5) * 10);

    ctx.font = '134px HarryP, sans-serif';
    ctx.fillStyle = 'rgba(144,238,144,0.9)';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 8, centerY + (Math.random() - 0.5) * 8);

    ctx.font = '132px HarryP, sans-serif';
    ctx.fillStyle = 'rgba(255,77,11,0.95)';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 6, centerY + (Math.random() - 0.5) * 6);

    ctx.font = '120px HarryP, sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 4, centerY + (Math.random() - 0.5) * 4);

    ctx.restore();
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

function atomCollisions() {
    for (let i = 0; i < collisionReport.count; i++) {
        const atomIndex = collisionReport.atomIndices[i];
        const atom = uraniumAtoms[atomIndex];

        atom.heat += settings.heatingRate;
        atom.flash = 10;

        for (let n = 0; n < 2; n++) {
            addNeutron(
                atom.position.x,
                atom.position.y,
                atom.radius
            );
        }
    }
}