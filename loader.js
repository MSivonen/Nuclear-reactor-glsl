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
    
    // Add Start overlay
    const overlay = document.createElement('div');
    overlay.id = 'start-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = 'white';
    overlay.style.zIndex = '1000';
    overlay.style.fontFamily = "'UIFont1', monospace";

    const splash = document.createElement('div');
    splash.style.textAlign = 'center';
    splash.style.padding = '20px 30px';
    splash.style.border = '2px solid #444';
    splash.style.background = 'rgba(10,10,10,0.95)';
    splash.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';

    const title = document.createElement('div');
    title.innerText = "Atom's Blessing";
    title.style.fontSize = '48px';
    title.style.letterSpacing = '2px';
    title.style.marginBottom = '8px';

    const subtitle = document.createElement('div');
    subtitle.innerText = "-a fission management-";
    subtitle.style.fontSize = '20px';
    subtitle.style.opacity = '0.8';
    subtitle.style.marginBottom = '20px';

    const startBtn = document.createElement('button');
    startBtn.innerText = 'Start';
    startBtn.style.padding = '12px 28px';
    startBtn.style.fontSize = '18px';
    startBtn.style.cursor = 'pointer';
    startBtn.style.background = '#2a2';
    startBtn.style.color = 'white';
    startBtn.style.border = '1px solid #6b6';
    startBtn.style.fontFamily = "'UIFont1', monospace";

    splash.appendChild(title);
    splash.appendChild(subtitle);
    splash.appendChild(startBtn);
    overlay.appendChild(splash);
    
    // Ensure it's on top of loading screen
    const container = document.getElementById('canvas-container');
    container.appendChild(overlay);

    startBtn.addEventListener('click', () => {
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
        
        // Ensure game is not paused
        if (typeof paused !== 'undefined') {
            paused = false;
        }
        
        container.removeChild(overlay);
        onComplete();
    });
  }
};