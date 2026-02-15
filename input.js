function getRelativeMouseCoords() {
  const gameCanvas = document.getElementById('gameCanvas');
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    return {
      x: (mouseX - rect.left) * scaleX,
      y: (mouseY - rect.top) * scaleY
    };
  return { x: mouseX, y: mouseY };
}

function mousePressed() {
  const coords = getRelativeMouseCoords();
  if (gameState === 'PRESTIGE') {
    if (window.prestigeScreen && typeof window.prestigeScreen.handleClick === 'function') {
      window.prestigeScreen.handleClick(coords.x, coords.y);
    }
    return;
  }
  if (gameState === 'PRESTIGE_TRANSITION') {
    return;
  }
  if (boomInputLocked) {
    if (ui && ui.canvas && typeof ui.canvas.handleBoomOverlayClick === 'function') {
      ui.canvas.handleBoomOverlayClick(coords.x, coords.y);
    }
    return;
  }
  ui.canvas.handleMouseClick(coords.x, coords.y);
  if (audioManager.audioContext.state === 'suspended') {
    audioManager.audioContext.resume();
  }
}

function mouseDragged() {
  if (gameState === 'PRESTIGE' || gameState === 'PRESTIGE_TRANSITION') return;
  if (window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.isActive()) return;
  if (boomInputLocked) return;
  const coords = getRelativeMouseCoords();
  ui.canvas.handleMouseDrag(coords.x, coords.y);
}

function mouseReleased() {
  if (gameState === 'PRESTIGE' || gameState === 'PRESTIGE_TRANSITION') return;
  if (window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.isActive()) return;
  if (boomInputLocked) return;
  ui.canvas.handleMouseRelease();
}

function keyPressed() {
  if (gameState === 'PRESTIGE' || gameState === 'PRESTIGE_TRANSITION') return;
  if (window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.isActive()) return;
  if (boomInputLocked) return;
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
