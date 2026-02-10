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
    const loadingProgressElement = document.getElementById('loading-progress');
    loadingProgressElement.style.display = 'none';

    const startBtn = document.getElementById('loading-start-btn');
    const loadingStartDiv = document.getElementById('loading-start');
    const fadeOverlay = document.getElementById('fade-overlay');

    // Prepare Fade In
    loadingStartDiv.style.opacity = '0';
    loadingStartDiv.style.transition = 'opacity 1s ease-in-out';

    startBtn.style.display = 'inline-block';
    // Position start button at 15% from bottom of canvas
    loadingStartDiv.style.position = 'absolute';
    loadingStartDiv.style.bottom = '15%';
    loadingStartDiv.style.left = '50%';
    loadingStartDiv.style.transform = 'translateX(-50%)';
    loadingStartDiv.style.display = 'block';
    loadingStartDiv.style.width = 'auto';
    loadingStartDiv.style.flex = '0 0 auto';
    loadingStartDiv.style.alignItems = 'center';

    // Execute Fade In (Title & Buttons)
    // Small timeout to ensure display:block is applied before transition
    setTimeout(() => {
        if (fadeOverlay) fadeOverlay.style.opacity = '0';
        loadingStartDiv.style.opacity = '1';
    }, 50);

    startBtn.addEventListener('click', () => {
      startBtn.disabled = true; // Prevent double clicks
      audioManager.playSfx('click');
      audioManager.audioContext.resume().then(() => {
        console.log("Audio Context Resumed via Start Overlay");
      });
      if (getAudioContext().state !== 'running') {
        getAudioContext().resume();
      }
      
      // Start Fade Out (Title -> Black)
      // loadingStartDiv.style.opacity = '0'; // Removed: Let overlay cover them instead
      if (fadeOverlay) fadeOverlay.style.opacity = '1';

      setTimeout(() => {
        paused = false;
        
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.display = 'none';
        onComplete();

        // Start Fade In (Black -> Game)
        setTimeout(() => {
            if (fadeOverlay) fadeOverlay.style.opacity = '0';
        }, 100);

      }, 1000); // Wait for 1s fade
    });
  }
};