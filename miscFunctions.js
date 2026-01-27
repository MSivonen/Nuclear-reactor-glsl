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

function gameOver() {
    if (!boom) return;
    if (mouseIsPressed && mouseButton === LEFT) {
        resetSimulation();
    }

    settings.collisionProbability = 0;
    const boomText = 'Boom mathafuka';

    fill(0, 0, 0);
    textSize(142);
    textAlign(CENTER, CENTER);
    text(boomText, screenDrawWidth / (2 + random(0, 0.03)), screenDrawHeight / (2 + random(0, 0.03)));
    filter(BLUR, 25);
    fill(144, 238, 144);
    textSize(134);
    text(boomText, screenDrawWidth / (2 + random(0, 0.04)), screenDrawHeight / (2 + random(0, 0.04)));
    filter(BLUR, 15);
    textSize(132);
    fill(255, 77, 11);
    text(boomText, screenDrawWidth / (2 + random(0, 0.02)), screenDrawHeight / (2 + random(0, 0.02)));
    filter(BLUR, 5);
    fill(255, 255, 255);
    text(boomText, screenDrawWidth / (2 + random(0, 0.02)), screenDrawHeight / (2 + random(0, 0.02)));
}

function scaleMouse(xx, yy) {
    // Translate to the center of the canvas
    let translatedX = xx - screenRenderWidth / 2;
    let translatedY = yy - screenRenderHeight / 2;

    // Scale by the inverse of the scaling factor
    let scaleFactor = (screenRenderHeight / screenDrawHeight);// * 0.9;
    let scaledX = translatedX / scaleFactor;
    let scaledY = translatedY / scaleFactor;

    // Translate back to the original position
    let finalX = scaledX + screenDrawWidth / 2;
    let finalY = scaledY + screenDrawHeight / 2;

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