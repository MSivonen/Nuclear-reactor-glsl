function drawSteam() {
    if (glShit.useGpuSteam && typeof steamRenderer !== 'undefined') {
        const count = steamRenderer.updateInstances(waterCells);
        steamRenderer.renderImage(count);
        return;
    }

    steamImage.clear();
    steamImage.push();
    waterCells.forEach(s => s.draw(steamImage));
    steamImage.pop();
    image(steamImage, 0, 0, screenDrawWidth, screenDrawHeight);
}

function drawBorders() {
    fill(0);
    noStroke();
    rectMode(CORNERS);
    rect(0, 0, -200, screenDrawHeight);
    rect(screenDrawWidth, 0, screenDrawWidth + 200, screenDrawHeight);
}

function drawFPS() {
    ui.fpsText = Math.floor(ui.avgFps);
    textSize(20);
    textStyle(BOLD);
    fill(0, 0, 0);
    text(ui.fpsText, 11, 27);
    fill(0, 255, 0);
    text(ui.fpsText, 10, 26);
}