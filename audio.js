class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
        } catch (e) {
            console.warn('Web Audio not supported:', e);
        }
    }

    // Placeholder for future sound methods
    // playSound(soundType, volume = 1.0) {
    //     // Implementation for other sounds
    // }
}

const audioManager = new AudioManager();