function oncePerSecond() {
    if (millis() - prevTime >= 1000) {
        energyOutput = energyOutputCounter / framesCounted;
        energyOutputCounter = 0;
        avgfps = framesCounted;
        framesCounted = 0;
        prevTime = millis();
    } else {
        framesCounted++;
    }
}

function resetSimulation() {
    for (let atom of uraniumAtoms) {
        atom.temperature = 25;
    }

    controlRods.forEach(rod => rod.targetY = -100);

    collisionProbability = 0.08;
    initializeControls();

    neutrons = [];
    boom = false;
}

function gameOver() {
    if (!boom) return;
    if (mouseIsPressed && mouseButton === LEFT) {
        resetSimulation();
    }

    collisionProbability = 0;
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

function updateShit(shit) {
    shit.forEach(s => s.update());
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