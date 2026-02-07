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
        this.canvas.style.zIndex = '15'; 
        this.canvas.style.pointerEvents = 'none';
        this.canvas.id = "UI-Canvas";

        const container = document.getElementById('canvas-container');
        container.appendChild(this.canvas);

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

        this.initDOM();

        this.pauseMenuState = 'MAIN';
        this.pendingSaveSlot = null;
    }

    ensureFrame() {
        if (this.lastFrame === frameCount) return;
        this.lastFrame = frameCount;
        this.ctx.clearRect(0, 0, this.width, this.height);
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
            <div style="font-size: 14px; color: #aaa;">REACTOR CONTROL</div>
            <div id="stat-money" style="font-size: 24px; color: #90EE90; margin: 5px 0;">0€</div>
            <div id="stat-income" style="font-size: 14px; color: #777;">0€/s</div>
        `;
        this.sidebar.appendChild(statsDiv);

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
        linkBtn.id = 'btn-link-rods';
        linkBtn.innerText = `Link Rods: ${settings.linkRods ? 'ON' : 'OFF'}`;
        linkBtn.style.marginBottom = '15px';
        linkBtn.onclick = () => {
             settings.linkRods = !settings.linkRods;
             linkBtn.innerText = `Link Rods: ${settings.linkRods ? 'ON' : 'OFF'}`;
             linkBtn.style.background = settings.linkRods ? '#5cb85c' : '#d9534f';
        };
           bindButtonSound(linkBtn);
        controlsDiv.appendChild(linkBtn);
        
        const waterDiv = document.createElement('div');
        waterDiv.innerHTML = `<label>Water Flow</label>`;
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
            this.updateDOM();
        };
        bindButtonSound(sideSetBtn);
        this.sidebar.appendChild(sideSetBtn);

        const devBtn = document.createElement('button');
        devBtn.id = 'btn-devmode';
        devBtn.innerText = settings.cheatMode ? "DEV MODE: ON" : "DEV MODE: OFF";
        devBtn.style.marginTop = "auto"; // Push to bottom if sidebar uses flex column
        devBtn.onclick = () => {
            settings.cheatMode = !settings.cheatMode;
            devBtn.innerText = settings.cheatMode ? "DEV MODE: ON" : "DEV MODE: OFF";
            devBtn.style.color = settings.cheatMode ? '#5cb85c' : 'white';
        };
        bindButtonSound(devBtn);
        this.sidebar.appendChild(devBtn);

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

        const amountControls = document.getElementById('shop-amount-controls');
        const groupControls = document.createElement('div');
        groupControls.id = 'shop-group-controls';
        groupControls.style.marginBottom = '15px';
        groupControls.style.display = 'flex';
        groupControls.style.flexDirection = 'column';
        groupControls.style.gap = '6px';

        const groupLabel = document.createElement('span');
        groupLabel.innerText = 'Uranium Group:';
        groupControls.appendChild(groupLabel);

        const groupRadios = document.createElement('div');
        groupRadios.id = 'ui-atom-group-radios';
        groupRadios.style.display = 'flex';
        groupRadios.style.flexWrap = 'wrap';
        groupRadios.style.gap = '8px';
        groupControls.appendChild(groupRadios);

        amountControls.insertAdjacentElement('afterend', groupControls);
        this.atomGroupRadiosContainer = groupRadios;

        const onKeyChange = (e) => {
            if (e.key !== 'Shift' && e.key !== 'Control') return;
            this.modifierKeyState.shift = e.shiftKey;
            this.modifierKeyState.ctrl = e.ctrlKey;
            this.applyModifierKeys();
        };
        document.addEventListener('keydown', onKeyChange);
        document.addEventListener('keyup', onKeyChange);

        this.renderShopItemsDOM();
        this.setBuyAmount(shop.buyAmount);

        const bind = (id, fn) => { const el = document.getElementById(id); el.onclick = fn; };
        
        bind('btn-resume', () => { paused = false; this.updateDOM(); });
        bind('btn-save', () => { this.openSlotMenu('SAVE'); });
        bind('btn-load', () => { this.openSlotMenu('LOAD'); });
        bind('btn-settings', () => { this.openSettingsMenu(); });
        ['btn-resume','btn-save','btn-load','btn-settings'].forEach(id => bindButtonSound(document.getElementById(id)));
        
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
    }

    isScramComplete() {
        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
            const topY = -rod.height;
            if (Math.abs(rod.y - topY) > 1 || Math.abs(rod.targetY - topY) > 1) {
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
        bindCheck('set-video-water', this.uiSettings.video, 'waterEffect');
        bindCheck('set-video-steam', this.uiSettings.video, 'steam');
        bindCheck('set-video-glow', this.uiSettings.video, 'atomGlow');
        
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
            let slotInfo = (playerState && playerState.saveSlots && playerState.saveSlots[i]) ? playerState.saveSlots[i] : "Empty";
            const info = playerState.getSaveInfo(i);
            if (info && info.version && slotInfo !== 'Empty' && !slotInfo.includes(`v${info.version}`)) {
                slotInfo = `${slotInfo} (v${info.version})`;
            }
            btn.innerText = `Slot ${i+1}: ${slotInfo}`;
            btn.style.padding = "10px";
            btn.style.cursor = "pointer";
            btn.onclick = () => {
                audioManager.playSfx('click');
                if (mode === 'SAVE') {
                    playerState.saveGame(i);
                    alert(`Saved to Slot ${i+1}`);
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

    activateScram(btn) {
        if (this.scramActive) {
            // Deactivate only when rods are fully up
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
        if (btn) {
            btn.classList.add('scram-active');
            btn.innerText = '!!SCRAM!!';
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

        for (let i = 0; i < controlRods.length; i++) {
            const rod = controlRods[i];
            const handleY = clampControlRodHandleY(i, 0);
            ui.controlSlider.handleY[i] = handleY;
            rod.targetY = handleY - rod.height;
        }
    }

    renderShopItemsDOM() {
        this.shopItemsContainer.innerHTML = ''; // Clear

        Object.keys(shop.items).forEach(key => {
            const item = shop.items[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            
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
            itemDiv.appendChild(btn);

            this.shopItemsContainer.appendChild(itemDiv);
        });
        
        this.updateShopButtons();
    }

    updateShopButtons() {
        if (this.shopOverlay.classList.contains('hidden')) return;

        shop.setBuyAmount(this.modifiers[this.currentModifierIndex]);

        if (this.atomGroupRadiosContainer) {
            const maxGroups = getAtomGroupCount();
            const owned = new Set(player.ownedGroups);
            this.atomGroupRadiosContainer.innerHTML = '';

            for (let i = 0; i < maxGroups; i++) {
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '4px';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'atomGroupRadio';
                input.value = i;
                input.onchange = (e) => {
                    shop.setTargetAtomGroup(e.target.value);
                    this.updateShopButtons();
                };

                const text = document.createElement('span');
                const ownedText = owned.has(i) ? 'Owned' : 'Locked';
                text.innerText = `Group ${i + 1} (${ownedText})`;

                label.appendChild(input);
                label.appendChild(text);
                this.atomGroupRadiosContainer.appendChild(label);
            }

            if (owned.size > 0 && !owned.has(shop.targetAtomGroupIndex)) {
                const firstOwned = player.ownedGroups[0];
                shop.setTargetAtomGroup(firstOwned);
            }
            const selected = this.atomGroupRadiosContainer.querySelector(`input[value="${shop.targetAtomGroupIndex}"]`);
            selected.checked = true;
        }

        Object.keys(shop.items).forEach(key => {
            const btn = document.getElementById(`shop-btn-${key}`);
            const title = document.getElementById(`shop-title-${key}`);
            const desc = document.getElementById(`shop-desc-${key}`);
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
                } else if (key === 'controlRod') {
                    const current = controlRodPurchaseCount;
                    const max = getMaxControlRodPurchases();
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
                } else if (key === 'controlRod') {
                    const current = controlRodPurchaseCount;
                    const max = getMaxControlRodPurchases();
                    title.innerText = `Control Rod ${current}/${max}`;
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
        this.shopOpen = !this.shopOpen;
        if (this.shopOpen) {
            this.shopOverlay.classList.remove('hidden');
            this.updateShopButtons();
        } else {
            this.shopOverlay.classList.add('hidden');
        }
    }

    updateDOM() {
        if (this.scramActive && this.isScramComplete()) {
            this.scramActive = false;
            const scramBtn = document.getElementById('btn-scram');
            if (scramBtn) {
                scramBtn.classList.remove('scram-active');
                scramBtn.innerText = 'SCRAM';
            }
            audioManager.fadeOutSfx('scram', 1);
        }
        if (!paused) {
            this.pauseMenu.classList.add('hidden');
            this.slotMenu.classList.add('hidden');
            this.settingsMenu.classList.add('hidden');
        } else {
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
    }

    drawBorders() {
        this.ensureFrame();
        drawBorders(this.ctx, this.simXOffset);
    }

    drawUi() {
        this.ensureFrame();
        
        // Update DOM state
        this.updateDOM();

        controlRods.forEach(r => r.draw(this.ctx, this.simXOffset));

        if (plutonium) plutonium.draw(this.ctx, this.simXOffset);
        if (californium) californium.draw(this.ctx, this.simXOffset);

        ui.powerMeter.draw(this.ctx, this.simXOffset);
        ui.tempMeter.draw(this.ctx, this.simXOffset);
        ui.controlSlider.draw(this.ctx, this.simXOffset);
        
        drawFPS(this.ctx, this.simXOffset);
        gameOver(this.ctx, this.simXOffset);
    }

    handleMouseClick() {
    }

    handleMouseDrag() {
    }

    handleMouseRelease() {
    }
}

function drawBorders(ctx, offsetX = 0) {
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
    if (mouseIsPressed && mouseButton === RIGHT) {
        resetSimulation();
        return;
    }

    settings.collisionProbability = 0;
    const boomText = 'Boom!!!';

    const centerX = offsetX + screenSimWidth / 2;
    const centerY = screenHeight / 2;

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

    ctx.restore();
}
