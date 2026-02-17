const CURRENCY_UNIT = String.fromCharCode(7745);

class UICanvas {
    constructor() {
        this.width = screenWidth;
        this.height = screenHeight;
        this.simWidth = screenSimWidth;
        this.simXOffset = SHOP_WIDTH;
        this.lastFrame = -1;
        this.uiSettings = {
            audio: {
                master: { vol: 1.0, enabled: true },
                sfx: { vol: 1.0, enabled: true },
                steam: { vol: 1.0, enabled: true },
                water: { vol: 1.0, enabled: true },
                ambience: { vol: 1.0, enabled: true },
                alarms: { vol: 1.0, enabled: true },
                explosions: { vol: 1.0, enabled: true },
                scram: { vol: 1.0, enabled: true }
            },
            video: { // Simplified checks for now
                bubbles: true,
                waterEffect: true,
                steam: true,
                atomGlow: true,
                lighting: true,
                neutrons: { vol: 1.0, enabled: true },
                resolution: 0
            }
        };

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.display = 'none'; // Initially hidden
        this.canvas.id = "UI-Canvas";

        const tutorialLayer = document.getElementById('layer-tutorial');
        const container = document.getElementById('canvas-container');
        if (tutorialLayer) {
            tutorialLayer.appendChild(this.canvas);
        } else if (container) {
            container.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
        
        this.modifiers = [1, 5, 10, 'MAX'];
        this.currentModifierIndex = 0;
        this.modifierKeyState = { shift: false, ctrl: false };

        this.sidebar = document.getElementById('ui-sidebar');
        this.shopOverlay = document.getElementById('ui-shop-overlay');
        this.shopItemsContainer = document.getElementById('ui-shop-items');
        this.pauseMenu = document.getElementById('ui-pause-menu');
        this.slotMenu = document.getElementById('ui-slot-menu');
        this.settingsMenu = document.getElementById('ui-settings-menu');
        this.uiLayer = document.getElementById('ui-layer');
        this.devToolsPanel = document.getElementById('dev-tools-panel');

        this.devInfiniteMoneyEnabled = false;
        this.devInfiniteMoneyValue = 1e15;

        this.devInputs = {
            jumpLoop: document.getElementById('dev-jump-loop'),
            setMoney: document.getElementById('dev-set-money'),
            infiniteMoney: document.getElementById('dev-infinite-money'),
            settingHeatingRate: document.getElementById('dev-setting-heating-rate'),
            settingCollisionProb: document.getElementById('dev-setting-collision-prob'),
            settingDecayProb: document.getElementById('dev-setting-decay-prob'),
            settingMoneyExponent: document.getElementById('dev-setting-money-exp'),
            settingWaterFlow: document.getElementById('dev-setting-water-flow'),
            thresholdMoney: document.getElementById('dev-prestige-threshold-money'),
            thresholdPower: document.getElementById('dev-prestige-threshold-power'),
            bonusMaxHeat: document.getElementById('dev-prestige-max-heat'),
            bonusMaxPower: document.getElementById('dev-prestige-max-power'),
            applyLoopBtn: document.getElementById('dev-apply-loop'),
            applyMoneyBtn: document.getElementById('dev-apply-money'),
            applyValuesBtn: document.getElementById('dev-apply-values'),
            printConfigBtn: document.getElementById('dev-print-config')
        };

        this.initDOM();

        this.pauseMenuState = 'MAIN';
        this.pendingSaveSlot = null;
        this.activeDrag = null; // { type: 'plutonium'|'moderator', index?: number }
        this.boomOverlayButton = null;
        this.toastTimeouts = [];
    }

    ensureFrame() {
        if (this.lastFrame === frameCount) return;
        this.lastFrame = frameCount;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    showToast(msg, duration = 2000) {
            const container = document.getElementById('ui-toast-container');
            if (!container) return;
            const t = document.createElement('div');
            t.className = 'ui-toast';
            t.innerText = msg;
            container.appendChild(t);
            // Force reflow
            t.getBoundingClientRect();
            t.classList.add('show');
            const timeout = setTimeout(() => {
                t.classList.remove('show');
                setTimeout(() => { try { container.removeChild(t); } catch (e) {} }, 220);
            }, duration);
            this.toastTimeouts.push(timeout);
    }

    initDOM() {
        const playUiClick = (success = true) => {
            audioManager.playSfx(success ? 'click' : 'click_fail');
        };

        const bindButtonSound = (btn) => {
            btn.addEventListener('click', () => {
                const disabled = btn.dataset.disabled === 'true' || btn.disabled;
                playUiClick(!disabled);
            });
        };

        this.sidebar.style.width = `${this.simXOffset}px`;

        const overlap = 140;
        const leftPos = Math.max(0, this.simXOffset - overlap);
        this.shopOverlay.style.left = `${leftPos}px`;

        const statsDiv = document.createElement('div');
        statsDiv.id = 'ui-stats';
        statsDiv.style.textAlign = 'center';
        statsDiv.style.marginTop = '20px';
        statsDiv.style.marginBottom = '20px';
        statsDiv.innerHTML = `
            <div style="font-size: 14px; color: #aaa;">Atom's Blessing<br>-the great glow-</div>
            <div id="stat-money" style="font-size: 24px; color: #90EE90; margin: 5px 0;">0€</div>
            <div id="stat-income" style="font-size: 14px; color: #777;">0€/s</div>
        `;
        this.sidebar.appendChild(statsDiv);
 
        // Expose resetModeratorHandles on the instance so other code can call it
        this.resetModeratorHandles = () => {
                const slider = (typeof ui !== 'undefined' && ui) ? ui.controlSlider : null;
                if (slider && Array.isArray(moderators)) {
                    slider.handleY = new Array(moderators.length).fill(0);
                    for (let i = 0; i < moderators.length; i++) {
                        slider.handleY[i] = clampModeratorHandleY(i, moderators[i].initialY + moderators[i].height);
                    }
                    slider.draggingIndex = -1;
                    slider.ensureHandleLength();
                }
        };
        // Compatibility alias for older code referencing resetRodHandles
        this.resetRodHandles = () => { return this.resetModeratorHandles(); };

        const controlsDiv = document.createElement('div');
        controlsDiv.style.background = '#444';
        controlsDiv.style.padding = '10px';
        controlsDiv.style.marginBottom = '20px';
        
        const controlsTitle = document.createElement('div');
        controlsTitle.innerText = "CONTROLS";
        controlsTitle.style.fontSize = '12px';
        controlsTitle.style.marginBottom = '10px';
        controlsDiv.appendChild(controlsTitle);

          const linkBtn = document.createElement('button');
          linkBtn.id = 'btn-link-moderators';
        linkBtn.style.marginBottom = '15px';
              this.linkModeratorsBtn = linkBtn;
              this.updateLinkModeratorsButton = () => {
                  if (!this.linkModeratorsBtn) return;
                  this.linkModeratorsBtn.innerText = `Link Moderators: ${settings.linkRods ? 'ON' : 'OFF'}`;
                  this.linkModeratorsBtn.style.background = settings.linkRods ? '#5cb85c' : '#d9534f';
                  this.linkModeratorsBtn.style.color = '#fff';
              };
              this.updateLinkModeratorsButton();
        linkBtn.onclick = () => {
             settings.linkRods = !settings.linkRods;
                    this.updateLinkModeratorsButton();
        };
           bindButtonSound(linkBtn);
        controlsDiv.appendChild(linkBtn);
        
        const waterDiv = document.createElement('div');
        waterDiv.innerHTML = `<label>Water Flow</label>`;
        this.waterControlDiv = waterDiv;
        const waterSlider = document.createElement('input');
        waterSlider.type = 'range';
        waterSlider.min = '1';
        waterSlider.max = '100';
        waterSlider.step = '1';
        waterSlider.style.width = '100%';
        const initialFlow = settings.waterFlowSpeed;
        waterSlider.value = Math.round(initialFlow * 100);
        waterSlider.oninput = (e) => {
            if (this.scramActive) {
                this.waterSliderDOM.value = Math.round(settings.waterFlowSpeed * 100);
                return;
            }
            const raw = parseFloat(e.target.value) / 100;
            const min = player.waterFlowMin;
            const max = player.waterFlowMax;
            const clamped = Math.max(min, Math.min(max, raw));
            settings.waterFlowSpeed = clamped;
            waterSlider.value = Math.round(clamped * 100);
        };
        this.waterSliderDOM = waterSlider;
        waterDiv.appendChild(waterSlider);
        controlsDiv.appendChild(waterDiv);

        const scramBtn = document.createElement('button');
        scramBtn.id = 'btn-scram';
        scramBtn.className = 'scram-btn';
        scramBtn.innerText = 'SCRAM';
        scramBtn.onclick = () => {
            this.activateScram(scramBtn);
        };
        bindButtonSound(scramBtn);
        controlsDiv.appendChild(scramBtn);

        this.sidebar.appendChild(controlsDiv);

        const shopBtn = document.createElement('button');
        this.shopBtn = shopBtn;
        shopBtn.innerText = "Open Shop";
        shopBtn.onclick = () => {
            this.toggleShop();
        };
        bindButtonSound(shopBtn);
        this.sidebar.appendChild(shopBtn);

        const sideSetBtn = document.createElement('button');
        sideSetBtn.innerText = "Menu";
        sideSetBtn.onclick = () => {
            paused = true;
            this.pauseMenu.classList.remove('hidden');
            this.settingsMenu.classList.add('hidden');
            this.slotMenu.classList.add('hidden');

            const saveName = playerState.getSaveName ? playerState.getSaveName() : 'Unnamed Save';
            const pauseTitle = document.getElementById('pause-title');
            if (pauseTitle) {
                pauseTitle.innerText = `Paused\n${saveName}`;
            }

            this.updateDOM();
        };
        bindButtonSound(sideSetBtn);
        this.sidebar.appendChild(sideSetBtn);

        const devToolsBtn = document.createElement('button');
        devToolsBtn.id = 'btn-dev-tools';
        devToolsBtn.innerText = 'Dev Tools';
        devToolsBtn.style.marginTop = 'auto';
        devToolsBtn.onclick = () => {
            this.toggleDevToolsPanel();
        };
        bindButtonSound(devToolsBtn);
        this.sidebar.appendChild(devToolsBtn);

        this.initDevTools();

        document.getElementById('ui-shop-close').onclick = () => this.toggleShop();
        bindButtonSound(document.getElementById('ui-shop-close'));

        const radios = document.querySelectorAll('input[name="buyAmount"]');
        radios.forEach(radio => {
            radio.onchange = (e) => {
                if(e.target.checked) {
                    let val = e.target.value;
                    if (val !== 'MAX') val = parseInt(val);
                    this.setBuyAmount(val);
                }
            };
        });

        this.atomGroupSelect = null;

        const onKeyChange = (e) => {
            if (e.key !== 'Shift' && e.key !== 'Control') return;
            this.modifierKeyState.shift = e.shiftKey;
            this.modifierKeyState.ctrl = e.ctrlKey;
            this.applyModifierKeys();
        };
        document.addEventListener('keydown', onKeyChange);
        document.addEventListener('keyup', onKeyChange);

        this.renderShopItemsDOM();
        this.renderAtomGroupRadios();
        this.setBuyAmount(shop.buyAmount);

        const bind = (id, fn) => { const el = document.getElementById(id); el.onclick = fn; };
        
        bind('btn-resume', () => { paused = false; this.updateDOM(); });
        bind('btn-settings', () => { this.openSettingsMenu(); });
        bind('btn-quit', () => {
            // Save and quit to title screen
            const slot = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
            const didSave = (playerState && typeof playerState.saveGame === 'function') ? playerState.saveGame(slot) : false;
            if (!didSave) {
                this.showToast(`Save failed in Slot ${slot + 1}`);
                audioManager.playSfx('click_fail');
                return;
            }

            paused = true;
            const fadeOverlay = document.getElementById('fade-overlay');
            if (fadeOverlay) fadeOverlay.style.opacity = '1';

            // Wait for fade out
            setTimeout(() => {
                audioManager.stopAllImmediate && audioManager.stopAllImmediate();
                resetSimulation();
                this.pauseMenu.classList.add('hidden');
                this.slotMenu.classList.add('hidden');
                this.settingsMenu.classList.add('hidden');
                this.shopOpen = false;
                this.shopOverlay.classList.add('hidden');
                paused = false;
                setUiVisibility(false);
                gameState = 'TITLE';
                if (window.titleRenderer && typeof window.titleRenderer.resetNeutrons === 'function') {
                    window.titleRenderer.resetNeutrons();
                }
                
                // Show loading/title overlay and slot selector
                    const loadingScreen = document.getElementById('loading-screen');
                    loadingScreen.style.display = 'flex';
                    this.showTitleSlotMenu();
                    
                    const loadingStart = document.getElementById('loading-start');
                         loadingStart.style.bottom = '8%';
                         loadingStart.style.opacity = '1'; // Reset opacity
                    
                    const startBtn = document.getElementById('loading-start-btn');
                    startBtn.disabled = false; // Re-enable

                    // Fade back in to title
                    if (fadeOverlay) fadeOverlay.style.opacity = '0';
            }, 1000);
        });
                ['btn-resume','btn-settings','btn-quit'].forEach(id => bindButtonSound(document.getElementById(id)));
        
        bind('btn-slot-cancel', () => { 
            this.slotMenu.classList.add('hidden'); 
            this.pauseMenu.classList.remove('hidden'); 
        });
        bindButtonSound(document.getElementById('btn-slot-cancel'));

        const views = ['settings-view-main', 'settings-view-audio', 'settings-view-video'];
        const switchView = (id) => {
            views.forEach(v => document.getElementById(v).classList.add('hidden'));
            document.getElementById(id).classList.remove('hidden');
        };

        bind('btn-set-audio', () => switchView('settings-view-audio'));
        bind('btn-set-video', () => switchView('settings-view-video'));
        
        bind('btn-audio-back', () => switchView('settings-view-main'));
        bind('btn-video-back', () => switchView('settings-view-main'));
        
        bind('btn-settings-close', () => {
             this.settingsMenu.classList.add('hidden');
             this.pauseMenu.classList.remove('hidden');
             switchView('settings-view-main');
        });
          ['btn-set-audio','btn-set-video','btn-audio-back','btn-video-back','btn-settings-close'].forEach(id => bindButtonSound(document.getElementById(id)));

        this.syncSettingsDOM();

        // Title screen slot buttons (Start/Save UI in loading-start area)
        const titleButtonsContainer = document.getElementById('title-slot-buttons');
        const titleStart = document.getElementById('loading-start-btn');
        const titleDelete = document.getElementById('title-delete-btn');
        const titleSaveBtn = document.getElementById('title-save-btn');
        const titleSaveInput = document.getElementById('title-save-name');
            titleStart.addEventListener('click', () => {
                const slot = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
                if (playerState.hasSave(slot)) {
                    const ok = playerState.loadGame(slot);
                    if (!ok) {
                        this.showToast('Failed to load save. Starting new.');
                        startFreshGame();
                    }
                } else {
                    // Start a fresh game in the selected slot
                    startFreshGame();
                }
                if (window.tutorialManager && typeof window.tutorialManager.onRunStarted === 'function') {
                    window.tutorialManager.onRunStarted();
                }
                // Transition logic is handled by loader.js
            });
            titleDelete.onclick = () => {
                const slot = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
                if (playerState.hasSave(slot)) {
                    if (confirm(`Delete save in Slot ${slot + 1}?`)) {
                        playerState.deleteSave(slot);
                        this.populateTitleSlotButtons();
                        this.showToast(`Deleted Slot ${slot + 1}`);
                    }
                } else {
                    this.showToast('No save in selected slot');
                }
            };

            titleSaveBtn.onclick = () => {
                const slot = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
                let name = titleSaveInput.value ? String(titleSaveInput.value).trim().substring(0,12) : null;
                if (name === '') name = null;
                const ok = playerState.saveGame(slot, name);
                if (ok) {
                    this.populateTitleSlotButtons();
                    this.showToast(`Saved to Slot ${slot+1}`);
                    audioManager.playSfx('click');
                } else {
                    console.log('Failed to save');
                    audioManager.playSfx('click_fail');
                }
            };
    }

    isScramComplete() {
        for (let i = 0; i < moderators.length; i++) {
            if (typeof isModeratorActive === 'function' && !isModeratorActive(i)) continue;
            const mod = moderators[i];
            const topY = -mod.height;
            if (Math.abs(mod.y - topY) > 1 || Math.abs(mod.targetY - topY) > 1) {
                return false;
            }
        }
        return true;
    }

    setBuyAmount(amount) {
        const idx = this.modifiers.indexOf(amount);
        if (idx >= 0) this.currentModifierIndex = idx;
        shop.setBuyAmount(amount);
        this.syncBuyAmountRadios(amount);
        this.updateShopButtons();
    }

    syncBuyAmountRadios(amount) {
        const radios = document.querySelectorAll('input[name="buyAmount"]');
        radios.forEach(r => {
            const val = (r.value === 'MAX') ? 'MAX' : parseInt(r.value);
            r.checked = val === amount;
        });
    }

    applyModifierKeys() {
        let amount = 1;
        if (this.modifierKeyState.shift && this.modifierKeyState.ctrl) amount = 'MAX';
        else if (this.modifierKeyState.ctrl) amount = 10;
        else if (this.modifierKeyState.shift) amount = 5;
        this.setBuyAmount(amount);
    }
    
    syncSettingsDOM() {
        const tutorialCheck = document.getElementById('chk-tutorial-enabled');
        if (tutorialCheck && window.tutorialManager) {
            tutorialCheck.checked = !!window.tutorialManager.isEnabled;
            tutorialCheck.onchange = (e) => {
                window.tutorialManager.setEnabled(!!e.target.checked);
            };
        }

        const audioKeys = ['master', 'sfx', 'ambience', 'steam', 'water', 'alarms', 'explosions', 'scram'];
        audioKeys.forEach(key => {
            const slider = document.getElementById(`set-audio-${key}`);
            const check = document.getElementById(`chk-audio-${key}`);
            const obj = this.uiSettings.audio[key];
            slider.value = obj.vol;
            slider.oninput = (e) => { 
                obj.vol = parseFloat(e.target.value);
                if (key === 'scram' && this.scramActive && audioManager.sounds['scram'] && audioManager.sounds['scram'].isPlaying()) {
                    const sfxEnabled = this.uiSettings.audio.sfx.enabled;
                    const sfxVol = this.uiSettings.audio.sfx.vol;
                    const masterVol = this.uiSettings.audio.master.enabled ? this.uiSettings.audio.master.vol : 0;
                    const scramSet = this.uiSettings.audio.scram;
                    if (sfxEnabled && scramSet.enabled) {
                        const vol = sfxVol * scramSet.vol * masterVol;
                        audioManager.sounds['scram'].setVolume(vol);
                    }
                } else if ((key === 'master' || key === 'sfx') && this.scramActive && audioManager.sounds['scram'] && audioManager.sounds['scram'].isPlaying()) {
                    const sfxEnabled = this.uiSettings.audio.sfx.enabled;
                    const sfxVol = this.uiSettings.audio.sfx.vol;
                    const masterVol = this.uiSettings.audio.master.enabled ? this.uiSettings.audio.master.vol : 0;
                    const scramSet = this.uiSettings.audio.scram;
                    if (sfxEnabled && scramSet.enabled) {
                        const vol = sfxVol * scramSet.vol * masterVol;
                        audioManager.sounds['scram'].setVolume(vol);
                    }
                }
            };
            check.checked = obj.enabled;
            check.onchange = (e) => { 
                obj.enabled = e.target.checked;
                if ((key === 'scram' || key === 'master' || key === 'sfx') && this.scramActive && audioManager.sounds['scram'] && audioManager.sounds['scram'].isPlaying()) {
                    const sfxEnabled = this.uiSettings.audio.sfx.enabled;
                    const masterVol = this.uiSettings.audio.master.enabled ? this.uiSettings.audio.master.vol : 0;
                    const scramSet = this.uiSettings.audio.scram;
                    if (sfxEnabled && scramSet.enabled && this.uiSettings.audio.master.enabled) {
                        const sfxVol = this.uiSettings.audio.sfx.vol;
                        const vol = sfxVol * scramSet.vol * masterVol;
                        audioManager.sounds['scram'].setVolume(vol);
                    } else {
                        audioManager.sounds['scram'].setVolume(0);
                    }
                }
            };
        });

        const bindCheck = (id, obj, key) => {
            const el = document.getElementById(id);
            el.checked = obj[key];
            el.onchange = (e) => { obj[key] = e.target.checked; };
        };
        
        bindCheck('set-video-bubbles', this.uiSettings.video, 'bubbles');
        bindCheck('set-video-steam', this.uiSettings.video, 'steam');
        bindCheck('set-video-glow', this.uiSettings.video, 'atomGlow');
        bindCheck('set-video-lighting', this.uiSettings.video, 'lighting');
        
        const nSlider = document.getElementById('set-video-neutrons');
        const nCheck = document.getElementById('chk-video-neutrons');
        nSlider.value = this.uiSettings.video.neutrons.vol; 
        nSlider.oninput = (e) => { this.uiSettings.video.neutrons.vol = parseFloat(e.target.value); };
        nCheck.checked = this.uiSettings.video.neutrons.enabled;
        nCheck.onchange = (e) => { this.uiSettings.video.neutrons.enabled = e.target.checked; };

        document.querySelectorAll('.res-btn').forEach(btn => {
            btn.onclick = () => {
                const resIndex = parseInt(btn.getAttribute('data-res'));
                this.uiSettings.video.resolution = resIndex;
                console.log("Resolution set to index: " + resIndex);
                window.setResolution(resIndex);
            };
        });
    }

    openSlotMenu(mode) {
        this.pauseMenu.classList.add('hidden');
        this.slotMenu.classList.remove('hidden');
        document.getElementById('slot-menu-title').innerText = mode === 'SAVE' ? "Save Game" : "Load Game";
        
        const container = document.getElementById('slot-buttons');
        container.innerHTML = ''; // Clear
        
        // Create 3 slots
        for(let i=0; i<3; i++) {
            const btn = document.createElement('button');
            let slotInfo = (playerState && playerState.saveSlots && playerState.saveSlots[i]) ? playerState.saveSlots[i] : `Slot ${i + 1} - empty`;
            const info = playerState.getSaveInfo(i);
            if (info && info.version && !slotInfo.includes(`v${info.version}`)) {
                slotInfo = `${slotInfo} (v${info.version})`;
            }
            btn.innerText = `Slot ${i+1}: ${slotInfo}`;
            btn.style.padding = "10px";
            btn.style.cursor = "pointer";
            btn.onclick = () => {
                audioManager.playSfx('click');
                if (mode === 'SAVE') {
                    playerState.saveGame(i);
                    console.log(`Saved to Slot ${i+1}`);
                    btn.innerText = `Slot ${i+1}: ${playerState.saveSlots[i]}`;
                } else {
                    playerState.loadGame(i);
                    paused = false;
                    this.updateDOM();
                }
            };
            container.appendChild(btn);
        }
    }
    
    openSettingsMenu() {
        this.pauseMenu.classList.add('hidden');
        this.settingsMenu.classList.remove('hidden');
        this.syncSettingsDOM(); 
    }

    initDevTools() {
        if (!this.devToolsPanel) return;

        this.devToolsPanel.style.width = `${screenWidth}px`;
        this.syncDevToolsUI();

        const parseFinite = (value) => {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        if (this.devInputs.applyLoopBtn) {
            this.devInputs.applyLoopBtn.onclick = () => {
                const raw = parseInt(this.devInputs.jumpLoop ? this.devInputs.jumpLoop.value : '1', 10);
                const loop = Number.isFinite(raw) ? Math.max(1, raw) : 1;

                prestigeManager.loopNumber = loop;
                prestigeManager.currentLevelData = prestigeManager.getLoopData(loop);
                prestigeManager.applyCurrentLoopScaling();
                if (player && typeof prestigeManager.saveToPlayer === 'function') {
                    prestigeManager.saveToPlayer(player);
                }

                this.syncDevToolsUI();
                this.showToast(`Jumped to loop ${loop}`);
            };
        }

        if (this.devInputs.applyMoneyBtn) {
            this.devInputs.applyMoneyBtn.onclick = () => {
                const money = parseFinite(this.devInputs.setMoney ? this.devInputs.setMoney.value : '0');
                if (money === null) {
                    this.showToast('Invalid money value');
                    return;
                }
                player.balance = Math.max(0, money);
                this.syncDevToolsUI();
                this.showToast('Money updated');
            };
        }

        if (this.devInputs.infiniteMoney) {
            this.devInputs.infiniteMoney.onchange = (e) => {
                this.devInfiniteMoneyEnabled = !!e.target.checked;
                if (this.devInfiniteMoneyEnabled) {
                    player.balance = Math.max(player.balance, this.devInfiniteMoneyValue);
                    settings.cheatMode = true;
                }
            };
        }

        if (this.devInputs.applyValuesBtn) {
            this.devInputs.applyValuesBtn.onclick = () => {
                const heatingRate = parseFinite(this.devInputs.settingHeatingRate ? this.devInputs.settingHeatingRate.value : '');
                const collisionProbability = parseFinite(this.devInputs.settingCollisionProb ? this.devInputs.settingCollisionProb.value : '');
                const decayProbability = parseFinite(this.devInputs.settingDecayProb ? this.devInputs.settingDecayProb.value : '');
                const moneyExponent = parseFinite(this.devInputs.settingMoneyExponent ? this.devInputs.settingMoneyExponent.value : '');
                const waterFlowSpeed = parseFinite(this.devInputs.settingWaterFlow ? this.devInputs.settingWaterFlow.value : '');

                const levelData = prestigeManager.ensureCurrentLevelData();
                levelData.thresholds = levelData.thresholds || {};
                levelData.bonuses = levelData.bonuses || {};

                if (heatingRate !== null) settings.heatingRate = Math.max(0, heatingRate);
                if (collisionProbability !== null) settings.collisionProbability = Math.max(0, collisionProbability);
                if (decayProbability !== null) settings.decayProbability = Math.max(0, decayProbability);
                if (moneyExponent !== null) settings.moneyExponent = Math.max(0, moneyExponent);
                if (waterFlowSpeed !== null) {
                    const min = player.waterFlowMin;
                    const max = player.waterFlowMax;
                    settings.waterFlowSpeed = Math.max(min, Math.min(max, waterFlowSpeed));
                }

                if (heatingRate !== null) levelData.bonuses.heatingRate = Math.max(0, heatingRate);
                if (collisionProbability !== null) levelData.bonuses.collisionProbability = Math.max(0, collisionProbability);
                if (decayProbability !== null) levelData.bonuses.decayProbability = Math.max(0, decayProbability);

                const thresholdMoney = parseFinite(this.devInputs.thresholdMoney ? this.devInputs.thresholdMoney.value : '');
                const thresholdPower = parseFinite(this.devInputs.thresholdPower ? this.devInputs.thresholdPower.value : '');
                const bonusMaxHeat = parseFinite(this.devInputs.bonusMaxHeat ? this.devInputs.bonusMaxHeat.value : '');
                const bonusMaxPower = parseFinite(this.devInputs.bonusMaxPower ? this.devInputs.bonusMaxPower.value : '');

                if (thresholdMoney !== null) levelData.thresholds.money = Math.max(0, Math.floor(thresholdMoney));
                if (thresholdPower !== null) levelData.thresholds.power = Math.max(0, Math.floor(thresholdPower));
                if (bonusMaxHeat !== null) levelData.bonuses.maxHeatCap = Math.max(1, Math.floor(bonusMaxHeat));
                if (bonusMaxPower !== null) levelData.bonuses.maxPowerCap = Math.max(1, Math.floor(bonusMaxPower));

                prestigeManager.currentLevelData = levelData;
                prestigeManager.applyCurrentLoopScaling();
                if (player && typeof prestigeManager.saveToPlayer === 'function') {
                    prestigeManager.saveToPlayer(player);
                }

                this.syncDevToolsUI();
                this.showToast('Dev values applied');
            };
        }

        if (this.devInputs.printConfigBtn) {
            this.devInputs.printConfigBtn.onclick = () => {
                const payload = {
                    loopNumber: prestigeManager.loopNumber,
                    currentLevelData: prestigeManager.ensureCurrentLevelData(),
                    settings: {
                        heatingRate: settings.heatingRate,
                        collisionProbability: settings.collisionProbability,
                        decayProbability: settings.decayProbability,
                        moneyExponent: settings.moneyExponent,
                        waterFlowSpeed: settings.waterFlowSpeed,
                        cheatMode: settings.cheatMode
                    }
                };

                const toJsLiteral = (obj) => {
                    const json = JSON.stringify(obj, null, 2);
                    return json.replace(/"([a-zA-Z_$][\w$]*)":/g, '$1:');
                };

                console.log('DEV CONFIG (copy/paste):\nconst DEV_CONFIG = ' + toJsLiteral(payload) + ';');
                this.showToast('Configuration printed to console');
            };
        }
    }

    toggleDevToolsPanel() {
        if (!this.devToolsPanel) return;
        this.devToolsPanel.classList.toggle('hidden');
        this.devToolsPanel.style.width = `${screenWidth}px`;
        this.syncDevToolsUI();
    }

    syncDevToolsUI() {
        const levelData = prestigeManager.ensureCurrentLevelData() || {};
        const thresholds = levelData.thresholds || {};
        const bonuses = levelData.bonuses || {};

        if (this.devInputs.jumpLoop) this.devInputs.jumpLoop.value = Math.max(1, prestigeManager.loopNumber || 1);
        if (this.devInputs.setMoney) this.devInputs.setMoney.value = Number.isFinite(player.balance) ? player.balance : 0;
        if (this.devInputs.infiniteMoney) this.devInputs.infiniteMoney.checked = this.devInfiniteMoneyEnabled;

        if (this.devInputs.settingHeatingRate) this.devInputs.settingHeatingRate.value = Number.isFinite(bonuses.heatingRate) ? bonuses.heatingRate : settings.heatingRate;
        if (this.devInputs.settingCollisionProb) this.devInputs.settingCollisionProb.value = Number.isFinite(bonuses.collisionProbability) ? bonuses.collisionProbability : settings.collisionProbability;
        if (this.devInputs.settingDecayProb) this.devInputs.settingDecayProb.value = Number.isFinite(bonuses.decayProbability) ? bonuses.decayProbability : settings.decayProbability;
        if (this.devInputs.settingMoneyExponent) this.devInputs.settingMoneyExponent.value = settings.moneyExponent;
        if (this.devInputs.settingWaterFlow) this.devInputs.settingWaterFlow.value = settings.waterFlowSpeed;

        if (this.devInputs.thresholdMoney) this.devInputs.thresholdMoney.value = Number.isFinite(thresholds.money) ? thresholds.money : 0;
        if (this.devInputs.thresholdPower) this.devInputs.thresholdPower.value = Number.isFinite(thresholds.power) ? thresholds.power : 0;
        if (this.devInputs.bonusMaxHeat) this.devInputs.bonusMaxHeat.value = Number.isFinite(bonuses.maxHeatCap) ? bonuses.maxHeatCap : 200;
        if (this.devInputs.bonusMaxPower) this.devInputs.bonusMaxPower.value = Number.isFinite(bonuses.maxPowerCap) ? bonuses.maxPowerCap : 200;
    }

    populateTitleSlotButtons() {
        const container = document.getElementById('title-slot-buttons');
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const btn = document.createElement('button');
            const info = playerState.getSaveInfo(i);
            btn.className = 'title-slot-button';
            // Primary label: save name if present, otherwise slot label
            const label = (info && info.name) ? info.name : `Slot ${i+1} - empty`;
            btn.innerText = label;
            // Tooltip: timestamp and version when available
            if (info && info.timestamp) {
                try {
                    const t = new Date(info.timestamp).toLocaleString();
                    btn.title = `${t} (v${info.version})`;
                } catch (e) { btn.title = `${info.timestamp} (v${info.version})`; }
            } else {
                btn.title = 'Empty slot';
            }
            btn.dataset.slotIndex = String(i);
            btn.onclick = () => {
                playerState.setSelectedSlot(i);
                // Update input with current name for this slot
                const nameInput = document.getElementById('title-save-name');
                const inf = playerState.getSaveInfo(i);
                if (nameInput) nameInput.value = (inf && inf.name) ? inf.name : '';
                this.populateTitleSlotButtons();
                audioManager.playSfx('click');
            };
            if (playerState.getSelectedSlot && playerState.getSelectedSlot() === i) {
                btn.classList.add('selected-down');
            }
            container.appendChild(btn);
        }
    }

    showTitleSlotMenu() {
        // Ensure loading start and slot container are visible on title
        const loadingStart = document.getElementById('loading-start');
        const loadingStartBtn = document.getElementById('loading-start-btn');
        const slotContainer = document.getElementById('title-slot-buttons-container');
        this.populateTitleSlotButtons();
        // Show the whole loading/title overlay so Start and slots are visible
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.display = 'flex';
        loadingStartBtn.style.display = 'inline-block';
        slotContainer.style.display = 'block';
        // Also show the save name input and save/delete buttons which are hidden by default
        const saveInput = document.getElementById('title-save-name');
        const saveBtn = document.getElementById('title-save-btn');
        const deleteBtn = document.getElementById('title-delete-btn');
        saveInput.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        // Fade in the title buttons when they are shown later than the initial loader fade.
            if (!loadingStart.style.transition) loadingStart.style.transition = 'opacity 1s ease-in-out';
            loadingStart.style.opacity = '0';
            loadingStart.getBoundingClientRect();
            setTimeout(() => { loadingStart.style.opacity = '1'; }, 50);
        // Prefill save name input with selected slot's name
        const nameInput = document.getElementById('title-save-name');
        try {
            const sel = (playerState && typeof playerState.getSelectedSlot === 'function') ? playerState.getSelectedSlot() : 0;
            const info = playerState.getSaveInfo(sel);
            if (nameInput) nameInput.value = (info && info.name) ? info.name : '';
        } catch (e) {}
        // Nudge buttons downward a bit
        const loadingStartDiv = document.getElementById('loading-start');
        if (loadingStartDiv) loadingStartDiv.style.bottom = '4%';
    }

    hideTitleSlotMenu() {
        const el = document.getElementById('title-slot-menu');
        if (!el) return;
        el.classList.add('hidden');
    }

    activateScram(btn) {
        if (this.scramActive) {
            // Deactivate only when moderators are fully up
            if (this.isScramComplete()) {
                this.scramActive = false;
                if (btn) {
                    btn.classList.remove('scram-active');
                    btn.innerText = 'SCRAM';
                }
                audioManager.fadeOutSfx('scram', 1);
            }
            return;
        }

        this.scramActive = true;
            btn.classList.add('scram-active');
            btn.innerText = '!!SCRAM!!';

        if (window.tutorialManager && typeof window.tutorialManager.onScramPressed === 'function') {
            window.tutorialManager.onScramPressed();
        }

        try {
            const sfxEnabled = ui.canvas.uiSettings.audio.sfx.enabled;
            const sfxVol = ui.canvas.uiSettings.audio.sfx.vol;
            const masterVol = ui.canvas.uiSettings.audio.master.vol;
            const scramSet = ui.canvas.uiSettings.audio.scram;
            if (sfxEnabled && scramSet.enabled) {
                const vol = sfxVol * scramSet.vol * masterVol;
                audioManager.sounds['scram'].setVolume(vol);
                audioManager.sounds['scram'].loop();
            }
        } catch (e) {
            audioManager.playSfx('scram');
        }

        const maxFlow = player.waterFlowMax;
        settings.waterFlowSpeed = maxFlow;
        this.waterSliderDOM.value = Math.round(maxFlow * 100);

        for (let i = 0; i < moderators.length; i++) {
            const mod = moderators[i];
            const handleY = clampModeratorHandleY(i, 0);
            ui.controlSlider.handleY[i] = handleY;
            mod.targetY = handleY - mod.height;
        }
    }

    renderShopItemsDOM() {
        this.shopItemsContainer.innerHTML = ''; // Clear

        Object.keys(shop.items).forEach(key => {
            const item = shop.items[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.id = `shop-item-${key}`;
            
            const title = document.createElement('h3');
            title.id = `shop-title-${key}`;
            title.innerText = item.name || key;
            itemDiv.appendChild(title);

            const desc = document.createElement('p');
            desc.id = `shop-desc-${key}`;
            desc.innerText = item.description || "No description";
            itemDiv.appendChild(desc);

            const btn = document.createElement('button');
            btn.id = `shop-btn-${key}`;
            btn.innerText = "Buy";
            btn.onclick = () => {
                if (btn.dataset.disabled === 'true') {
                    audioManager.playSfx('click_fail');
                    return;
                }
                shop.setBuyAmount(this.modifiers[this.currentModifierIndex]);
                shop.buy(key);
                this.updateShopButtons(); 
            };
            btn.addEventListener('click', () => {
                if (btn.dataset.disabled !== 'true') {
                    audioManager.playSfx('click');
                }
            });
            if (key === 'atom') {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '8px';
                row.style.alignItems = 'center';

                const groupSelect = document.createElement('select');
                groupSelect.id = 'ui-atom-group-select';
                groupSelect.style.flex = '1 1 auto';
                groupSelect.style.minWidth = '96px';
                groupSelect.style.height = '34px';
                groupSelect.onchange = (e) => {
                    shop.setTargetAtomGroup(e.target.value);
                    this.updateShopButtons();
                };
                this.atomGroupSelect = groupSelect;

                btn.style.flex = '1 1 auto';
                row.appendChild(groupSelect);
                row.appendChild(btn);
                itemDiv.appendChild(row);
            } else {
                itemDiv.appendChild(btn);
            }

            this.shopItemsContainer.appendChild(itemDiv);
        });
        
        this.updateShopButtons();
        this.renderAtomGroupRadios();
    }

    renderAtomGroupRadios() {
        if (!this.atomGroupSelect) return;

        const owned = new Set(player.ownedGroups);
        const ownedIndices = Array.from(owned).sort((a,b) => a - b);

        this.atomGroupSelect.innerHTML = '';
        for (let idx of ownedIndices) {
            const option = document.createElement('option');
            option.value = String(idx);
            option.text = `G${idx + 1}`;
            this.atomGroupSelect.appendChild(option);
        }

        const hasTarget = ownedIndices.includes(Number(shop.targetAtomGroupIndex));
        if (!hasTarget && ownedIndices.length > 0) {
            shop.setTargetAtomGroup(ownedIndices[0]);
        }
        this.atomGroupSelect.value = String(shop.targetAtomGroupIndex);
    }

    updateShopButtons() {
        if (this.shopOverlay.classList.contains('hidden')) return;

        shop.setBuyAmount(this.modifiers[this.currentModifierIndex]);

        // Update atom group radios if owned groups changed
        const owned = new Set(player.ownedGroups);
        const ownedIndices = Array.from(owned).sort((a,b) => a - b);
        if (this.atomGroupSelect && this.atomGroupSelect.options.length !== ownedIndices.length) {
            this.renderAtomGroupRadios();
        } else if (this.atomGroupSelect) {
            // Ensure current target is one of the owned indices (compare as numbers)
            const targetNum = Number(shop.targetAtomGroupIndex);
            if (ownedIndices.length > 0 && !ownedIndices.includes(targetNum)) {
                const firstOwned = ownedIndices[0];
                shop.setTargetAtomGroup(firstOwned);
            }
            this.atomGroupSelect.value = String(shop.targetAtomGroupIndex);
        }

        Object.keys(shop.items).forEach(key => {
            const itemDiv = document.getElementById(`shop-item-${key}`);
            const btn = document.getElementById(`shop-btn-${key}`);
            const title = document.getElementById(`shop-title-${key}`);
            const desc = document.getElementById(`shop-desc-${key}`);

            const unlocked = shop.isItemUnlocked ? shop.isItemUnlocked(key) : true;
            const modUpgradeVisible = key !== 'moderatorUpgrade' || moderatorPurchaseCount > 1;
            const showItem = unlocked && modUpgradeVisible;
            if (itemDiv) {
                itemDiv.style.display = showItem ? '' : 'none';
            }

            if (!showItem) {
                return;
            }

            if (btn) {
                // getPurchaseInfo uses internal shop.buyAmount
                const info = shop.getPurchaseInfo(key); 
                const costText = formatLarge(info.cost, CURRENCY_UNIT, 2);

                const isMax = shop.buyAmount === 'MAX';
                let isMaxed = false;
                if (key === 'waterFlow') {
                    const current = player.waterFlowUpgradeCount;
                    const max = player.waterFlowUpgradeMax;
                    isMaxed = current >= max && max > 0;
                } else if (key === 'plutonium') {
                    const current = player.plutoniumUpgradeCount;
                    const max = player.plutoniumUpgradeMax;
                    isMaxed = current >= max && max > 0;
                } else if (key === 'californium') {
                    const current = player.californiumUpgradeCount;
                    const max = player.californiumUpgradeMax;
                    isMaxed = current >= max && max > 0;
                } else if (key === 'moderator') {
                    const current = moderatorPurchaseCount;
                    const max = getMaxModeratorPurchases();
                    isMaxed = current >= max && max > 0;
                } else if (key === 'moderatorUpgrade') {
                    const current = moderatorUpgradePurchaseCount;
                    const max = getMaxModeratorUpgradePurchases();
                    isMaxed = current >= max && max > 0;
                } else if (key === 'group') {
                    const current = player.ownedGroups.length;
                    const max = getAtomGroupCount();
                    isMaxed = current >= max && max > 0;
                } else if (key === 'atom') {
                    const groupIndex = shop.targetAtomGroupIndex;
                    const owned = player.ownedGroups.includes(groupIndex);
                    const available = getGroupAvailableSlots(groupIndex);
                    isMaxed = owned && available <= 0;
                }

                if (info.count === 0 && isMaxed) {
                    const name = (shop.items[key] && shop.items[key].name) ? shop.items[key].name : key;
                    btn.innerText = `${name} MAX`;
                    btn.style.background = '#d7b600';
                    btn.style.color = '#111';
                    btn.dataset.disabled = 'true';
                    btn.classList.add('btn-disabled');
                } else if (info.count === 0) {
                    btn.innerText = 'Unavailable';
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.dataset.disabled = 'true';
                    btn.classList.add('btn-disabled');
                } else {
                    btn.innerText = `Buy ${info.count} (${costText})`;
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.dataset.disabled = 'false';
                    btn.classList.remove('btn-disabled');
                }
                
                const cheatMode = settings.cheatMode;
                if (!(isMax && info.count === 0) && info.count > 0) {
                    const canAfford = cheatMode ? true : player.balance >= info.cost;
                    if (!canAfford) {
                        btn.dataset.disabled = 'true';
                        btn.classList.add('btn-disabled');
                    }
                }
            }

            if (title) {
                if (key === 'waterFlow') {
                    const current = player.waterFlowUpgradeCount;
                    const max = player.waterFlowUpgradeMax;
                    title.innerText = `Water flow ${current}/${max}`;
                } else if (key === 'plutonium') {
                    const current = player.plutoniumUpgradeCount;
                    const max = player.plutoniumUpgradeMax;
                    title.innerText = `Plutonium ${current}/${max}`;
                } else if (key === 'californium') {
                    const current = player.californiumUpgradeCount;
                    const max = player.californiumUpgradeMax;
                    title.innerText = `Californium ${current}/${max}`;
                } else if (key === 'moderator') {
                    const current = moderatorPurchaseCount;
                    const max = getMaxModeratorPurchases();
                    title.innerText = `Moderator ${current}/${max}`;
                } else if (key === 'moderatorUpgrade') {
                    const current = moderatorUpgradePurchaseCount;
                    const max = getMaxModeratorUpgradePurchases();
                    title.innerText = `Moderator Upgrade ${current}/${max}`;
                } else if (key === 'group') {
                    const current = player.ownedGroups.length;
                    const max = getAtomGroupCount();
                    title.innerText = `Uranium Group ${current}/${max}`;
                } else if (key === 'atom') {
                    const groupIndex = shop.targetAtomGroupIndex;
                    const current = getGroupAtomCount(groupIndex);
                    const max = getGroupCapacity(groupIndex);
                    title.innerText = `Uranium ${current}/${max}`;
                } else {
                    title.innerText = shop.items[key].name || key;
                }
            }

            if (desc && key === 'atom') {
                const groupIndex = shop.targetAtomGroupIndex;
                const owned = player.ownedGroups.includes(groupIndex);
                desc.innerText = owned ? `Target group: ${groupIndex + 1}` : `Target group: ${groupIndex + 1} (Locked)`;
            }
        });
    }

    toggleShop() {
        const shopUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isShopUnlocked === 'function')
            || window.tutorialManager.isShopUnlocked();
        if (!shopUnlocked) {
            this.shopOpen = false;
            this.shopOverlay.classList.add('hidden');
            return;
        }

        this.shopOpen = !this.shopOpen;
        if (this.shopOpen) {
            this.shopOverlay.classList.remove('hidden');
            this.updateShopButtons();
        } else {
            this.shopOverlay.classList.add('hidden');
        }
    }

    updateDOM() {
        const tutorialActive = !!(window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.isActive());

        if (this.scramActive && this.isScramComplete()) {
            this.scramActive = false;
            const scramBtn = document.getElementById('btn-scram');
            if (scramBtn) {
                scramBtn.classList.remove('scram-active');
                scramBtn.innerText = 'SCRAM';
            }
            audioManager.fadeOutSfx('scram', 1);
        }

        if (tutorialActive) {
            this.pauseMenu.classList.add('hidden');
            this.slotMenu.classList.add('hidden');
            this.settingsMenu.classList.add('hidden');
        }

        if (!paused) {
            this.pauseMenu.classList.add('hidden');
            this.slotMenu.classList.add('hidden');
            this.settingsMenu.classList.add('hidden');
        } else if (!tutorialActive) {
            const pHidden = this.pauseMenu.classList.contains('hidden');
            const sHidden = this.slotMenu.classList.contains('hidden');
            const settHidden = this.settingsMenu.classList.contains('hidden');
            
            if (pHidden && sHidden && settHidden) {
                this.pauseMenu.classList.remove('hidden');
            }
        }
        
        const mStat = document.getElementById('stat-money');
        const iStat = document.getElementById('stat-income');
        mStat.innerText = formatLarge(player.getBalance(), CURRENCY_UNIT, 2);
        iStat.innerText = `${formatLarge(lastMoneyPerSecond, CURRENCY_UNIT, 2)}/s`;

        const showMoneyStats = !window.tutorialManager
            || !window.tutorialManager.hasCompleted
            || window.tutorialManager.hasCompleted('first_power_output')
            || (Number.isFinite(energyOutput) && energyOutput >= 10);
        mStat.style.display = showMoneyStats ? '' : 'none';
        iStat.style.display = showMoneyStats ? '' : 'none';

        const linkModeratorsUnlocked = !window.tutorialManager
            || !window.tutorialManager.isItemUnlocked
            || window.tutorialManager.isItemUnlocked('moderator');
        const hasMultipleModerators = Number.isFinite(moderatorPurchaseCount) && moderatorPurchaseCount > 1;
        const scramCompleted = !window.tutorialManager
            || !window.tutorialManager.hasCompleted
            || window.tutorialManager.hasCompleted('scram_pressed_once');
        const showLinkModerators = linkModeratorsUnlocked && scramCompleted && hasMultipleModerators;
        if (this.linkModeratorsBtn) {
            this.linkModeratorsBtn.style.display = showLinkModerators ? '' : 'none';
            if (!showLinkModerators && settings.linkRods) {
                settings.linkRods = false;
                this.updateLinkModeratorsButton();
            }
        }

        const shopUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isShopUnlocked === 'function')
            || window.tutorialManager.isShopUnlocked();
        if (this.shopBtn) {
            this.shopBtn.style.display = shopUnlocked ? '' : 'none';
        }
        if (!shopUnlocked && this.shopOpen) {
            this.shopOpen = false;
            this.shopOverlay.classList.add('hidden');
        }

        const waterUnlocked = shop && typeof shop.isItemUnlocked === 'function' ? shop.isItemUnlocked('waterFlow') : true;
        if (this.waterControlDiv) {
            this.waterControlDiv.style.display = waterUnlocked ? '' : 'none';
        }

        if (this.devInfiniteMoneyEnabled) {
            player.balance = Math.max(player.balance, this.devInfiniteMoneyValue);
        }
        
        const min = player.waterFlowMin;
        const max = player.waterFlowMax;
        const clamped = Math.max(min, Math.min(max, settings.waterFlowSpeed));
        if (clamped !== settings.waterFlowSpeed) {
            settings.waterFlowSpeed = clamped;
        }

        const targetValue = Math.round(clamped * 100);
        if (Math.abs(parseFloat(this.waterSliderDOM.value) - targetValue) > 0.5) {
            this.waterSliderDOM.value = targetValue;
        }
        
        if (this.shopOpen) {
            this.updateShopButtons();
        }

        if (this.devToolsPanel && !this.devToolsPanel.classList.contains('hidden')) {
            this.devToolsPanel.style.width = `${screenWidth}px`;
        }
    }

    drawBorders() {
        this.ensureFrame();
        drawBorders(this.ctx, this.simXOffset);
    }

    drawUi() {
        this.ensureFrame();
        
        // Update DOM state
        this.updateDOM();

        // Moderators moved to GL renderer
        // moderators.forEach(r => r.draw(this.ctx, this.simXOffset));

        const showPowerMeter = !window.tutorialManager
            || !window.tutorialManager.hasCompleted
            || window.tutorialManager.hasCompleted('first_power_output')
            || (Number.isFinite(energyOutput) && energyOutput >= 10);
        const showTempMeter = !window.tutorialManager
            || !window.tutorialManager.hasCompleted
            || window.tutorialManager.hasCompleted('heat_warning')
            || (Number.isFinite(window.avgTemp) && window.avgTemp >= 55);

        if (showPowerMeter) {
            ui.powerMeter.draw(this.ctx, this.simXOffset);
        }
        if (showTempMeter) {
            ui.tempMeter.draw(this.ctx, this.simXOffset);
        }

        // Slider handles moved to GL renderer, but logic still needs to run
        ui.controlSlider.draw(this.ctx, this.simXOffset, true); // Added skipDraw flag
        
        drawFPS(this.ctx, this.simXOffset);
        gameOver(this.ctx, this.simXOffset);
        if (window.tutorialManager && typeof window.tutorialManager.draw === 'function') {
            window.tutorialManager.draw(this.ctx, this.simXOffset);
        }
    }

    handleMouseClick(x, y) {
        if (window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.isActive()) {
            if (window.tutorialManager.handleMouseClick(x, y)) return;
        }

        if (boomInputLocked) {
            this.handleBoomOverlayClick(x, y);
            return;
        }

        const m = scaleMouse(x, y);
        // Clicks outside simulation area are ignored
        if (m.x < 0) return;

        const scramCompleted = !!(window.tutorialManager
            && typeof window.tutorialManager.hasCompleted === 'function'
            && window.tutorialManager.hasCompleted('scram_pressed_once'));

        // Check moderator handles first (highest priority)
        const HANDLE_RADIUS = 10 * globalScale;
        if (scramCompleted && moderators && ui.controlSlider) {
            for (let i = 0; i < moderators.length; i++) {
                if (typeof isModeratorActive === 'function' && !isModeratorActive(i)) continue;
                const mod = moderators[i];
                const handleX = mod.x + mod.width / 2;
                const handleY = (typeof ui.controlSlider.handleY[i] === 'number') ? ui.controlSlider.handleY[i] : (mod.y + mod.height);
                const dx = m.x - handleX;
                const dy = m.y - handleY;
                if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS + 4 * globalScale) {
                    if (window.tutorialManager && typeof window.tutorialManager.onModeratorDragged === 'function') {
                        window.tutorialManager.onModeratorDragged();
                    }
                    this.activeDrag = { type: 'moderator', index: i };
                    ui.controlSlider.draggingIndex = i;
                    return;
                }
            }
        }

        // Check plutonium
        const plutoniumUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isItemUnlocked === 'function')
            || window.tutorialManager.isItemUnlocked('plutonium');
        if (plutoniumUnlocked && typeof plutonium !== 'undefined' && plutonium) {
            const dx = m.x - plutonium.x;
            const dy = m.y - plutonium.y;
            if (Math.sqrt(dx * dx + dy * dy) <= plutonium.radius) {
                this.activeDrag = { type: 'plutonium' };
                plutonium.dragging = true;
                plutonium.dragOffset.x = plutonium.x - m.x;
                plutonium.dragOffset.y = plutonium.y - m.y;
                return;
            }
        }

        // Check californium as well so clicks capture it before draw methods
        const californiumUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isItemUnlocked === 'function')
            || window.tutorialManager.isItemUnlocked('californium');
        if (californiumUnlocked && typeof californium !== 'undefined' && californium) {
            const dx2 = m.x - californium.x;
            const dy2 = m.y - californium.y;
            if (Math.sqrt(dx2 * dx2 + dy2 * dy2) <= californium.radius) {
                this.activeDrag = { type: 'californium' };
                californium.dragging = true;
                californium.dragOffset.x = californium.x - m.x;
                californium.dragOffset.y = californium.y - m.y;
                return;
            }
        }
    }

    handleMouseDrag(x, y) {
        if (boomInputLocked) return;
        const m = scaleMouse(x, y);
        if (!this.activeDrag) return;

        if (this.activeDrag.type === 'moderator') {
            const i = this.activeDrag.index;
            if (typeof i === 'number' && ui.controlSlider) {
                const newY = m.y;
                ui.controlSlider.handleY[i] = clampModeratorHandleY(i, newY);
                moderators[i].targetY = ui.controlSlider.handleY[i] - moderators[i].height;
            }
        } else if (this.activeDrag.type === 'plutonium') {
            if (typeof plutonium !== 'undefined' && plutonium && plutonium.dragging) {
                plutonium.x = m.x + plutonium.dragOffset.x;
                plutonium.y = m.y + plutonium.dragOffset.y;
                plutonium.x = Math.max(plutonium.radius, Math.min(plutonium.x, screenSimWidth - plutonium.radius));
                plutonium.y = Math.max(plutonium.radius, Math.min(plutonium.y, screenHeight - plutonium.radius));
            }
        }
    }

    handleMouseRelease() {
        if (boomInputLocked) return;
        if (this.activeDrag && this.activeDrag.type === 'moderator') {
            ui.controlSlider.draggingIndex = -1;
        }
        if (this.activeDrag && this.activeDrag.type === 'plutonium') {
            if (typeof plutonium !== 'undefined' && plutonium) plutonium.dragging = false;
        }
        this.activeDrag = null;
    }

    handleBoomOverlayClick(x, y) {
        if (!boomInputLocked || boomOutcome !== 'SETBACK') return;
        const btn = this.boomOverlayButton;
        if (!btn || !btn.visible) return;

        if (x >= btn.x && x <= (btn.x + btn.w) && y >= btn.y && y <= (btn.y + btn.h)) {
            rollbackSetback();
        }
    }
}

function drawBorders(ctx, offsetX = 0) {
    const uiLayer = document.getElementById('ui-layer');
    const sidebar = document.getElementById('ui-sidebar');
    const sidebarVisible = !!(uiLayer && uiLayer.style.display !== 'none' && sidebar);
    if (sidebarVisible) return;

    ctx.save();
    ctx.fillStyle = 'black';
    // Fill anything to the left of simulation (already covered by sidebar usually, but keep for safety)
    ctx.fillRect(0, 0, offsetX, screenHeight);
    ctx.restore();
}

function drawFPS(ctx, offsetX) {
    ui.fpsText = Math.floor(ui.avgFps);

    const x = offsetX + 11 * globalScale;
    const y = 27 * globalScale;

    ctx.font = `${30 * globalScale}px UIFont1, sans-serif`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = 'black';
    ctx.fillText(ui.fpsText, x + 1, y + 1);

    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillText(ui.fpsText, x, y);
}

function gameOver(ctx, offsetX = 0) {
    if (!boom) return;
    const boomText = 'Boom!!!';

    const centerX = offsetX + screenSimWidth / 2;
    const centerY = screenHeight / 2;
    const elapsed = boomStartTime > 0 ? Math.max(0, renderTime - boomStartTime) : 0;
    const fadeInAlpha = Math.max(0, Math.min(1, (elapsed - 2.0) / 0.5));
    const buttonWidth = 290 * globalScale;
    const buttonHeight = 58 * globalScale;
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = centerY + 130 * globalScale;
    const hoverButton = fadeInAlpha > 0 && mouseX >= buttonX && mouseX <= (buttonX + buttonWidth) && mouseY >= buttonY && mouseY <= (buttonY + buttonHeight);

    if (ui && ui.canvas) {
        ui.canvas.boomOverlayButton = {
            x: buttonX,
            y: buttonY,
            w: buttonWidth,
            h: buttonHeight,
            visible: boomOutcome === 'SETBACK' && fadeInAlpha > 0
        };
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `${142 * globalScale}px boom1, sans-serif`;
    ctx.fillStyle = 'black';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 10 * globalScale, centerY + (Math.random() - 0.5) * 10 * globalScale);
    ctx.font = `${142 * globalScale}px boom2, sans-serif`;
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 10 * globalScale, centerY + (Math.random() - 0.5) * 10 * globalScale);

    ctx.font = `${134 * globalScale}px boom1, sans-serif`;
    ctx.fillStyle = 'rgba(144,238,144,0.9)';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 8 * globalScale, centerY + (Math.random() - 0.5) * 8 * globalScale);
    ctx.font = `${134 * globalScale}px boom2, sans-serif`;
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 8 * globalScale, centerY + (Math.random() - 0.5) * 8 * globalScale);

    ctx.font = `${132 * globalScale}px boom1, sans-serif`;
    ctx.fillStyle = 'rgba(255,77,11,0.95)';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 6 * globalScale, centerY + (Math.random() - 0.5) * 6 * globalScale);
    ctx.font = `${132 * globalScale}px boom2, sans-serif`;
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 6 * globalScale, centerY + (Math.random() - 0.5) * 6 * globalScale);

    ctx.font = `${130 * globalScale}px boom1, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 4 * globalScale, centerY + (Math.random() - 0.5) * 4 * globalScale);
    ctx.font = `${130 * globalScale}px boom2, sans-serif`;
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 4 * globalScale, centerY + (Math.random() - 0.5) * 4 * globalScale);

    if (boomOutcome === 'SETBACK' && fadeInAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${fadeInAlpha})`;
        ctx.font = `${24 * globalScale}px UIFont1, sans-serif`;
        ctx.fillText('Reactor Melted - Progress Lost', centerX, centerY + 85 * globalScale);

        if (typeof boomShowFailedPrestigeLore !== 'undefined' && boomShowFailedPrestigeLore) {
            ctx.fillStyle = `rgba(200, 245, 200, ${fadeInAlpha})`;
            ctx.font = `${16 * globalScale}px UIFont1, sans-serif`;
            ctx.fillText('You have failed the Atom\'s calling, the reactor is melting.', centerX, centerY - 220 * globalScale);
            ctx.fillText('You grab the device you found earlier and run to the car. You must escape.', centerX, centerY - 200 * globalScale);
            ctx.fillText('The clock of the car flickers and it snaps a bit backwards.', centerX, centerY - 180 * globalScale);
        }

        const lossText = `Setback loss: -${formatLarge(boomSetbackLoss || 0, CURRENCY_UNIT, 2)}`;
        ctx.fillStyle = `rgba(255, 180, 180, ${fadeInAlpha})`;
        ctx.font = `${18 * globalScale}px UIFont1, sans-serif`;
        ctx.fillText(lossText, centerX, centerY + 112 * globalScale);

        ctx.fillStyle = hoverButton ? `rgba(45, 45, 45, ${fadeInAlpha})` : `rgba(22, 22, 22, ${fadeInAlpha})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${fadeInAlpha})`;
        ctx.lineWidth = 2 * globalScale;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = `rgba(255, 255, 255, ${fadeInAlpha})`;
        ctx.font = `${24 * globalScale}px UIFont1, sans-serif`;
        ctx.fillText('88mph backwards', centerX, buttonY + buttonHeight / 2);

        if (hoverButton) {
            ctx.fillStyle = `rgba(255, 232, 148, ${fadeInAlpha})`;
            ctx.font = `${18 * globalScale}px UIFont1, sans-serif`;
            ctx.fillText('Roll back time and try again', centerX, buttonY + buttonHeight + 28 * globalScale);
        }
    }

    ctx.restore();
}
