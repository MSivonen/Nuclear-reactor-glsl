// Steam is rendered on the dedicated WebGL core layer (coreCanvas).
// This file retains no CPU/p5 steam fallback.

function drawBorders(ctx, offsetX = 0) {
    ctx.save();
    ctx.fillStyle = 'black';
    // Left border: covers negative X area
    ctx.fillRect(offsetX - screenRenderWidth, 0, screenRenderWidth, screenHeight);
    // Right border: area to the right of sim
    ctx.fillRect(offsetX + screenSimWidth, 0, screenRenderWidth, screenHeight);
    ctx.restore();
}

function drawFPS(ctx, offsetX) {
    ui.fpsText = Math.floor(ui.avgFps);
    
    // In p5: text(ui.fpsText, 11, 27);
    // Sim coords? p5 was transformed.
    // So 11, 27 are Sim coords.
    
    const x = offsetX + 11;
    const y = 27;

    ctx.font = '30px HarryP, sans-serif';
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic'; // default
    
    // Shadow effect
    ctx.fillStyle = 'black';
    ctx.fillText(ui.fpsText, x + 1, y + 1);
    
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillText(ui.fpsText, x, y);
}