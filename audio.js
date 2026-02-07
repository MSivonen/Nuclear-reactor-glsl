class AmbientTrack {
    constructor(soundFile, baseVolume = 1.0, basePitch = 1.0, volVar = 0.0, pitchVar = 0.0, rate = 0.01) {
        this.sound = soundFile;
        this.baseVolume = (typeof baseVolume === 'number' && Number.isFinite(baseVolume)) ? baseVolume : 1.0; // 0.0 to 1.0
        this.basePitch = (typeof basePitch === 'number' && Number.isFinite(basePitch)) ? basePitch : 1.0;
        this.volVariation = (typeof volVar === 'number' && Number.isFinite(volVar)) ? volVar : 0.0; // Percentage (e.g., 0.3 for 30%)
        this.pitchVariation = (typeof pitchVar === 'number' && Number.isFinite(pitchVar)) ? pitchVar : 0.0;
        this.noiseOffset = Math.random() * 1000;
        this.rate = (typeof rate === 'number' && Number.isFinite(rate)) ? rate : 0.01; // Speed of variation
        this.targetVolume = 0.0; // For fading in/out via game logic
        this.currentFadeVol = 0.0;
        
        // Settings/Category multiplier (pointer to settings object)
        this.categorySettings = null; 

        if (this.sound) {
            this.sound.setLoop(true);
            this.sound.playMode('sustain');
        }
    }

    setCategory(settingsObj) {
        this.categorySettings = settingsObj;
    }

    play() {
        if (this.sound && !this.sound.isPlaying()) {
            this.sound.loop();
            this.sound.setVolume(0);
        }
    }

    stop() {
        if (this.sound) {
            this.sound.stop();
        }
    }

    update(masterVol) {
        if (!this.sound || !this.sound.isPlaying()) return;

        // Smooth fade to target
        this.currentFadeVol = lerp(this.currentFadeVol, this.targetVolume, 0.05);

        // Calculate "breathing" variation using Perlin noise
        this.noiseOffset += this.rate;
        const n = noise(this.noiseOffset); // 0 to 1
        
        // Variation centered around 0 (-1 to 1) * magnitude
        const volVar = (n * 2 - 1) * this.volVariation; 
        const pitchVar = (noise(this.noiseOffset + 500) * 2 - 1) * this.pitchVariation;

        // Category volume (e.g., Water slider)
        const catVol = this.categorySettings ? (this.categorySettings.enabled ? this.categorySettings.vol : 0) : 1.0;

        // Final calculation
        // Base * Fade * Category * Master * Variation
        // Variation applies to the base "level", keeping it somewhat organic
        let finalVol = this.baseVolume * (1.0 + volVar) * this.currentFadeVol * catVol * masterVol;
        // Protect against NaN / non-finite values coming from bad inputs
        if (!Number.isFinite(finalVol)) {
            finalVol = 0;
        } else {
            finalVol = constrain(finalVol, 0, 1.0);
        }

        let finalPitch = this.basePitch * (1.0 + pitchVar);
        if (!Number.isFinite(finalPitch)) finalPitch = this.basePitch;

        this.sound.setVolume(finalVol, 0.1); // 0.1s ramp for smoothness
        this.sound.rate(finalPitch);
    }
}

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.ambientTracks = [];
        this.isInitialized = false;
        this.alarmIntensity = 0;
        this.prevPaused = false;

        // Configuration for all sound assets
        this.assets = [
            // SFX
            { key: 'alarm', path: 'assets/Sounds/alarm.mp3', type: 'sfx' },
            { key: 'boom', path: 'assets/Sounds/boom.mp3', type: 'sfx' },
            { key: 'click', path: 'assets/Sounds/click.mp3', type: 'sfx' },
            
            // Ambience (Hums) - Group: 'ambience'
            { key: 'hum_electric', path: 'assets/Sounds/electric-hum-141075.mp3', type: 'ambient', group: 'ambience', vol: 0.2, pitch: 1.0, vVar: 1, pVar: 0.25 },
            { key: 'hum_high', path: 'assets/Sounds/high-energy-buzzing-ambience-195142.mp3', type: 'ambient', group: 'ambience', vol: 0.8, pitch: 1.0, vVar: 1, pVar: 0.15 }, 
            { key: 'hum_industrial', path: 'assets/Sounds/industrial-hum-29639.mp3', type: 'ambient', group: 'ambience', vol: 0.5, pitch: 0.8, vVar: 1, pVar: 0.12 },
            { key: 'hum_scifi', path: 'assets/Sounds/sci-fi-generator-or-motor-or-forcefield-loop-31130.mp3', type: 'ambient', group: 'ambience', vol: 0.6, pitch: 1.0, vVar: 1, pVar: 0.12 },

            // Steam - Group: 'steam'
            { key: 'steam_low', path: 'assets/Sounds/steam1_low.mp3', type: 'ambient', group: 'steam', vol: 0.8, pitch: 1.0, vVar: 0.2, pVar: 0.1 },
            { key: 'steam_mid', path: 'assets/Sounds/steam3_mid.mp3', type: 'ambient', group: 'steam', vol: 0.8, pitch: 1.0, vVar: 0.2, pVar: 0.1 },
            { key: 'steam_high', path: 'assets/Sounds/steam2_highPitch.mp3', type: 'ambient', group: 'steam', vol: 0.7, pitch: 1.0, vVar: 0.1, pVar: 0.2 },
            { key: 'steam_bubbles1', path: 'assets/Sounds/steam_bubbles.mp3', type: 'ambient', group: 'steam', vol: 0.6, pitch: 1.0, vVar: 0.3, pVar: 0.1 },

            // Water - Group: 'water'
            { key: 'water_low', path: 'assets/Sounds/water_low.mp3', type: 'ambient', group: 'water', vol: 1, pitch: 1.0, vVar: 0.1, pVar: 0.15 },
            { key: 'water_high', path: 'assets/Sounds/water_high.mp3', type: 'ambient', group: 'water', vol: 1, pitch: 1.0, vVar: 0.1, pVar: 0.15 },
        ];

        // Mappings for updating game state
        this.groups = {
            ambience: [],
            steam: [],
            water: []
        };
    }

    async init() {
        if (this.isInitialized) return;
        try {
            // p5.sound usually creates context automatically, but we grab it reference
            this.audioContext = getAudioContext();
            this.isInitialized = true; // Mark as init, but it might be suspended
            console.log("Audio initialized, state:", this.audioContext.state);
        } catch (e) {
            console.warn('Web Audio init failed:', e);
        }
    }

    // Called by loading tasks
    loadSoundPromise(key, path) {
        return new Promise((resolve, reject) => {
            const s = loadSound(path, 
                (loadedSound) => {
                    this.sounds[key] = loadedSound;
                    resolve(loadedSound);
                },
                (err) => {
                    console.error(`Failed to load ${path}`, err);
                    // Resolve anyway to not block loading, but sound will be missing
                    resolve(null); 
                }
            );
        });
    }

    setupTracks(uiSettings) {
        // Initialize AmbientTracks after loading
        this.assets.forEach(asset => {
            if (asset.type === 'ambient' && this.sounds[asset.key]) {
                const track = new AmbientTrack(
                    this.sounds[asset.key],
                    asset.vol,
                    asset.pitch,
                    asset.vVar,
                    asset.pVar
                );
                
                // Link to UI settings based on group
                // uiSettings should have: master, sfx, ambience, steam, water
                if (asset.group === 'ambience') track.setCategory(uiSettings.ambience);
                if (asset.group === 'steam') track.setCategory(uiSettings.steam);
                if (asset.group === 'water') track.setCategory(uiSettings.water);

                this.ambientTracks.push(track);
                
                // Add to quick lookup group
                if (this.groups[asset.group]) {
                    this.groups[asset.group].push({ key: asset.key, track: track });
                }
            }
        });
    }

    startAmbience() {
        this.ambientTracks.forEach(t => t.play());
    }

    stopAmbience() {
        this.ambientTracks.forEach(t => t.stop());
    }

    fadeOutSfx(key, duration) {
        if (this.sounds[key] && this.sounds[key].isPlaying()) {
            this.sounds[key].setVolume(0, duration);
            setTimeout(() => {
                this.sounds[key].stop();
                // Restore volume for next play (will be set by playSfx anyway but good practice)
            }, duration * 1000); 
        }
    }

    playSfx(key) {
        // If the game is paused, do not play SFX
        if (this.prevPaused) return;

        if (this.sounds[key]) {
             // Fallback default volumes if UI is not ready yet
             let sfxEnabled = true;
             let sfxVol = 1.0;
             let masterVol = 1.0;
             let specificVol = 1.0; // For new categories

             if (ui && ui.canvas && ui.canvas.uiSettings) {
                 sfxEnabled = ui.canvas.uiSettings.audio.sfx.enabled;
                 sfxVol = ui.canvas.uiSettings.audio.sfx.vol;
                 masterVol = ui.canvas.uiSettings.audio.master.vol;
                 
                 // Handle specific categories
                 if (key === 'boom' && ui.canvas.uiSettings.audio.explosions) {
                     const boomSet = ui.canvas.uiSettings.audio.explosions;
                     if (!boomSet.enabled) sfxEnabled = false;
                     specificVol = boomSet.vol;
                 }
             }
             
             if (sfxEnabled) {
                const vol = sfxVol * specificVol * masterVol;
                this.sounds[key].setVolume(vol);
                this.sounds[key].play();
             }
        }
    }

    // Main update loop
    update(dt, settings, currentPower, isPaused, maxPowerRef) {
        // Access settings via ui.canvas.uiSettings
        if (typeof ui === 'undefined' || !ui.canvas || !ui.canvas.uiSettings) return;

        // If paused, stop all ambient and persistent SFX immediately (no fades)
        if (isPaused) {
            this.ambientTracks.forEach(track => {
                track.targetVolume = 0;
                track.currentFadeVol = 0; // Force instant internal state
                if (track.sound && track.sound.isPlaying()) track.sound.stop();
            });

            // Stop persistent SFX
            this.alarmIntensity = 0;
            if (this.sounds['alarm'] && this.sounds['alarm'].isPlaying()) {
                this.sounds['alarm'].stop();
            }
            if (this.sounds['boom'] && this.sounds['boom'].isPlaying()) {
                this.sounds['boom'].stop();
            }
            this.prevPaused = true;
            return;
        } else if (this.prevPaused && !isPaused) {
            // Transitioning from paused -> unpaused: restart ambience tracks
            this.ambientTracks.forEach(track => {
                if (track.sound && !track.sound.isPlaying()) track.play();
            });
            this.prevPaused = false;
        }
        
        // If BOOM (Game Over), stopping ambience is fine, but we might want the boom sound to play!
        // The original code muted ambience on boom.
        if (boom) {
             this.ambientTracks.forEach(track => {
                track.targetVolume = 0;
                track.update(0.2);
            });
            // Don't return, allow alarm/boom logic potentially? 
            // Actually original code returned. But playSfx('boom') is called in sketch.js.
            // Let's keep existing boom behavior for now but respect pause.
            // If boom is true, game is over.
             this.alarmIntensity = 0;
             if (this.sounds['alarm'] && this.sounds['alarm'].isPlaying()) {
                this.fadeOutSfx('alarm', 0.2);
             }
             return;
        }

        const masterVol = (ui.canvas.uiSettings.audio.master && ui.canvas.uiSettings.audio.master.enabled) ? ui.canvas.uiSettings.audio.master.vol : 0;

        // Drive game state logic for volumes
        this.updateMixLogic(settings, currentPower, maxPowerRef);

        // Alarm SFX (ramped by intensity)
        this.updateAlarm(masterVol);

        // Update all tracks
        this.ambientTracks.forEach(track => track.update(masterVol));
    }

    updateMixLogic(settings, currentPower, maxPowerRef) {
        
        // --- Water Logic ---
        // water_low -> water_high blender
        // flowSpeed is usually 0.3 to 1.5 or so based on default settings, but can go higher
        const flow = settings ? Math.abs(settings.waterFlowSpeed) : 0.3;
        
        // Volume scaling: 0 flow = 0 volume. 
        // Start hearing it at 0.1, Max volume at flow >= 3.0
        const volumeScale = constrain(map(flow, 0.1, 3.0, 0, 1), 0, 1);

        // Tone mixing: Mix from low to high character
        // 0.2 flow -> mostly low
        // 2.0 flow -> mix of high
        const toneMix = constrain(map(flow, 0.2, 2.0, 0, 1), 0, 1);
        
        this.setGroupTarget('water', 'water_low', volumeScale * (1.0 - (toneMix * 0.5))); // Retain base rumble
        this.setGroupTarget('water', 'water_high', volumeScale * toneMix);

        // --- Steam Logic ---
        // Scale audio by temperature. Max intensity when close to max temp.
        // Steam starts at 100C, full intensity at 80% of max temp (400C)
        const tempLimit = 500;
        const fadeStart = 100; 
        const fadeEnd = tempLimit * 0.8; // Full steam slightly before max temp
        
        const steamIntensity = constrain(map(window.avgTemp || 0, fadeStart, fadeEnd, 0, 1), 0, 1);

        // steam_low (cool) -> steam_mid -> steam_high
        // 0.0 - 0.4: Low
        // 0.3 - 0.7: Mid
        // 0.6 - 1.0: High
        
        let sLow = 0, sMid = 0, sHigh = 0, sBubbles = 0;

        if (steamIntensity > 0.05) {
            sBubbles = steamIntensity; // Bubbles always present when steam is on, getting louder

            if (steamIntensity < 0.4) {
                sLow = map(steamIntensity, 0, 0.4, 0.5, 1);
            } else if (steamIntensity < 0.7) {
                sLow = map(steamIntensity, 0.4, 0.7, 1, 0.3); // Fade out low
                sMid = map(steamIntensity, 0.3, 0.7, 0, 1);
            } else {
                sLow = 0.3;
                sMid = map(steamIntensity, 0.7, 1.0, 1, 0.5);
                sHigh = map(steamIntensity, 0.6, 1.0, 0, 1);
            }
        }

        this.setGroupTarget('steam', 'steam_low', sLow);
        this.setGroupTarget('steam', 'steam_mid', sMid);
        this.setGroupTarget('steam', 'steam_high', sHigh);
        this.setGroupTarget('steam', 'steam_bubbles1', sBubbles * 0.8);

        // --- Alarm ---
        const alarmLimit = maxPowerRef || 1000;
        const powerRatio = constrain((currentPower || 0) / alarmLimit, 0, 1);
        const tempRatio = (typeof window.avgTemp !== 'undefined') ? constrain(window.avgTemp / 500, 0, 1) : 0;
        const alarmRatio = Math.max(powerRatio, tempRatio);
        this.alarmIntensity = constrain(map(alarmRatio, 0.8, 1.0, 0, 1), 0, 1);

        // --- General Ambience ---
        // Scale with power output: 10% at 0 power, 100% at max power
        const ambientIntensity = constrain(map(currentPower || 0, 0, maxPowerRef || 1000, 0.1, 1.0), 0.1, 1.0);
        this.groups['ambience'].forEach(item => item.track.targetVolume = ambientIntensity);
    }

    setGroupTarget(groupName, key, target) {
        const group = this.groups[groupName];
        if (!group) return;
        const t = (typeof target === 'number') ? constrain(target, 0, 1) : 0;
        for (let i = 0; i < group.length; i++) {
            const item = group[i];
            if (item.key === key && item.track) {
                item.track.targetVolume = t;
                return;
            }
        }
    }

    updateAlarm(masterVol) {
        const s = this.sounds['alarm'];
        if (!s) return;

        const sfxSettings = ui.canvas.uiSettings.audio.sfx;
        // Use specific alarm settings if available
        let alarmVolMod = 1.0;
        let alarmEnabled = true;
        if (ui.canvas.uiSettings.audio.alarms) {
            alarmVolMod = ui.canvas.uiSettings.audio.alarms.vol;
            alarmEnabled = ui.canvas.uiSettings.audio.alarms.enabled;
        }

        const enabled = sfxSettings.enabled && alarmEnabled;
        const baseVol = sfxSettings.vol * alarmVolMod * masterVol;
        const intensity = this.alarmIntensity || 0;

        if (!enabled || intensity <= 0) {
            if (s.isPlaying()) {
                // Instant stop if disabled or 0 intensity (or fallback to quick fade if preferred, user said instant stop when pausing, but here it's logic update)
                // If intensity is 0, we can stop or fade. Existing was fade.
                // But user wants "all audio stop instantly when pausing". This logic runs when NOT paused.
                // So fade here is fine for gameplay dynamic changes.
                this.fadeOutSfx('alarm', 0.2);
            }
            return;
        }

        if (!s.isPlaying()) {
            s.setLoop(true);
            s.playMode('sustain');
            s.play();
        }

        const vol = constrain(baseVol * intensity, 0, 1);
        s.setVolume(vol, 0.1);
    }

    getAlarmPhase() {
        const s = this.sounds['alarm'];
        if (s && s.isPlaying()) {
            const dur = s.duration();
            if (dur > 0) {
                return (s.currentTime() % dur) / dur;
            }
        }
        return 0;
    }

    stopAlarm() {
        if (this.sounds['alarm']) {
            this.sounds['alarm'].stop();
        }
    }

    stopSfx(key) {
        if (this.sounds[key]) {
            this.sounds[key].stop();
        }
    }

    stopAllImmediate() {
        this.ambientTracks.forEach(track => {
            track.targetVolume = 0;
            track.currentFadeVol = 0;
            if (track.sound) track.sound.stop();
        });

        Object.keys(this.sounds).forEach(key => {
            const s = this.sounds[key];
            if (s && s.isPlaying && s.isPlaying()) s.stop();
        });

        this.alarmIntensity = 0;
        this.prevPaused = true;
    }
}

const audioManager = new AudioManager();