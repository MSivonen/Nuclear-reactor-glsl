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
    onComplete();
  }
};