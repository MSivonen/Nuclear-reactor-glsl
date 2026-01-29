// Steam is rendered on the dedicated WebGL core layer (coreCanvas).
// This file retains no CPU/p5 steam fallback.

function drawBorders() {
    fill(0);
    noStroke();
    rectMode(CORNERS);
    rect(0, 0, -200, screenSimHeight);
    rect(screenSimWidth, 0, screenSimWidth + 200, screenSimHeight);
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