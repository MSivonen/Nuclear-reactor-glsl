function mousePressed() {
  if (ui && ui.canvas && typeof ui.canvas.handleMouseClick === 'function') {
    ui.canvas.handleMouseClick(mouseX, mouseY);
  }
  // Resume audio context on user interaction
  if (audioManager.audioContext && audioManager.audioContext.state === 'suspended') {
    audioManager.audioContext.resume();
  }
}

function mouseDragged() {
  if (ui && ui.canvas && typeof ui.canvas.handleMouseDrag === 'function') {
    ui.canvas.handleMouseDrag(mouseX, mouseY);
  }
}

function mouseReleased() {
  if (ui && ui.canvas && typeof ui.canvas.handleMouseRelease === 'function') {
    ui.canvas.handleMouseRelease();
  }
}

function keyPressed() {
  if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
    paused = !paused;
    if (!paused) {
      if (typeof ui !== 'undefined') ui.lastUpdateTime = performance.now();
    }
  }

  if (settings.cheatMode) {
    if (key === 'm' || key === 'M') {
      if (player) player.addMoney(player.getBalance() * 0.1 + 10000);
      console.log("Cheat: Added money");
    }
    // 'C' to clear/cool reactor for testing?
    if (key === 'c' || key === 'C') {
      uraniumAtoms.forEach(u => u.temperature = 0);
      console.log("Cheat: Temperature reset");
    }
  }
}
