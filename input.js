function getRelativeMouseCoords() {
  const gameCanvas = document.getElementById('gameCanvas');
  if (gameCanvas) {
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    return {
      x: (mouseX - rect.left) * scaleX,
      y: (mouseY - rect.top) * scaleY
    };
  }
  return { x: mouseX, y: mouseY };
}

function mousePressed() {
  const coords = getRelativeMouseCoords();
  ui.canvas.handleMouseClick(coords.x, coords.y);
  if (audioManager.audioContext.state === 'suspended') {
    audioManager.audioContext.resume();
  }
}

function mouseDragged() {
  const coords = getRelativeMouseCoords();
  ui.canvas.handleMouseDrag(coords.x, coords.y);
}

function mouseReleased() {
  ui.canvas.handleMouseRelease();
}

function keyPressed() {
  if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
    paused = !paused;
    if (!paused) {
      ui.lastUpdateTime = performance.now();
    }
  }

  if (settings.cheatMode) {
    if (key === 'm' || key === 'M') {
      player.addMoney(player.getBalance() * 0.1 + 10000);
      console.log("Cheat: Added money");
    }
    // 'C' to clear/cool reactor for testing?
    if (key === 'c' || key === 'C') {
      uraniumAtoms.forEach(u => u.temperature = 0);
      console.log("Cheat: Temperature reset");
    }
  }
}
