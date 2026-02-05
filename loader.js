// loader.js - Handles the loading screen and progress updates

const loader = {
  updateLoadingProgress: function(progress) {
    document.getElementById('loading-bar').style.width = progress + '%';
    document.getElementById('loading-percentage').textContent = progress + '%';
  },

  startLoading: async function(loadingTasks, onComplete) {
    const progressIncrement = 100 / loadingTasks.length;
    let loadingProgress = 0;

    for (let i = 0; i < loadingTasks.length; i++) {
      const task = loadingTasks[i];
      document.getElementById('loading-task').textContent = task.name;
      await task.func();
      loadingProgress += progressIncrement;
      this.updateLoadingProgress(Math.round(loadingProgress));
    }

    this.updateLoadingProgress(100);
    // onComplete(); // Wait for user interaction
    
    // Add "Click to Start" overlay
    const overlay = document.createElement('div');
    overlay.id = 'start-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = 'white';
    overlay.style.fontSize = '24px';
    overlay.style.cursor = 'pointer';
    overlay.style.zIndex = '1000';
    overlay.innerHTML = '<h1>Click anywhere to start</h1>';
    
    // Ensure it's on top of loading screen
    const container = document.getElementById('canvas-container');
    container.appendChild(overlay);

    overlay.addEventListener('click', () => {
        // Resume Audio Code
        if (audioManager.audioContext) {
             audioManager.audioContext.resume().then(() => {
                 console.log("Audio Context Resumed via Start Overlay");
             });
             // Also try p5.sound specific resume if audioManager wrapper fails
             if (getAudioContext().state !== 'running') {
                 getAudioContext().resume();
             }
        }
        
        container.removeChild(overlay);
        onComplete();
    });
  }
};