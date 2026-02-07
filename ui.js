const CURRENCY_UNIT = String.fromCharCode(7745);

class UICanvas {
    constructor() {
        this.width = screenRenderWidth;
        this.height = screenHeight;
        this.simWidth = screenSimWidth;
        this.simXOffset = SHOP_WIDTH;
        this.lastFrame = -1;

        // Settings (Moved to top to ensure availability for initDOM)
        this.uiSettings = {
            audio: {
                master: { vol: 1.0, enabled: true },
                sfx: { vol: 1.0, enabled: true },
                steam: { vol: 1.0, enabled: true },
                water: { vol: 1.0, enabled: true },
                ambience: { vol: 1.0, enabled: true },
                alarms: { vol: 1.0, enabled: true },
                explosions: { vol: 1.0, enabled: true }
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

        // Keep the canvas for meters, FPS, and control rod visualization
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.zIndex = '15'; 
        this.canvas.style.pointerEvents = 'none'; // IMPORTANT: Allow clicks to pass through to game
        this.canvas.id = "UI-Canvas";

        const container = document.getElementById('canvas-container');
        if (container) {
             if (!document.getElementById('UI-Canvas')) {
                 container.appendChild(this.canvas);
             }
        }

        this.ctx = this.canvas.getContext('2d');
        
        // Shop Modifiers
        this.modifiers = [1, 5, 10, 'MAX'];
        this.currentModifierIndex = 0;

        // DOM Elements
        this.sidebar = document.getElementById('ui-sidebar');
        this.shopOverlay = document.getElementById('ui-shop-overlay');
        this.shopItemsContainer = document.getElementById('ui-shop-items');
        this.pauseMenu = document.getElementById('ui-pause-menu');
        this.slotMenu = document.getElementById('ui-slot-menu');
        this.settingsMenu = document.getElementById('ui-settings-menu');
        this.uiLayer = document.getElementById('ui-layer');

        // Check if DOM exists (it should now)
        if (this.sidebar) {
            this.initDOM();
        } else {
            console.error("UI DOM elements not found! Make sure index.html is updated.");
        }
        
        // Pause Menu Logic
        this.pauseMenuState = 'MAIN';
        this.pendingSaveSlot = null;
    }

    ensureFrame() {
        if (this.lastFrame === frameCount) return;
        this.lastFrame = frameCount;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    // Initialize the DOM structure for Sidebar and Menus
    initDOM() {
        // Set Sidebar Width to match the simulation offset
        this.sidebar.style.width = `${this.simXOffset}px`;

        // Align shop overlay to the right edge of the sidebar
        if (this.shopOverlay) {
            const overlap = 40;
            const leftPos = Math.max(0, this.simXOffset - overlap);
            this.shopOverlay.style.left = `${leftPos}px`;
        }

        // --- Sidebar Content ---
        
        // 0. Money Stats (Restored)
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

        // 1. Controls Area
        const controlsDiv = document.createElement('div');
        controlsDiv.style.background = '#444';
        controlsDiv.style.padding = '10px';
        controlsDiv.style.marginBottom = '20px';
        
        const controlsTitle = document.createElement('div');
        controlsTitle.innerText = "CONTROLS";
        controlsTitle.style.fontSize = '12px';
        controlsTitle.style.marginBottom = '10px';
        controlsDiv.appendChild(controlsTitle);

        // Link Rods Toggle
        const linkBtn = document.createElement('button');
        linkBtn.id = 'btn-link-rods';
        linkBtn.innerText = `Link Rods: ${settings.linkRods ? 'ON' : 'OFF'}`;
        linkBtn.style.marginBottom = '15px';
        linkBtn.onclick = () => {
             settings.linkRods = !settings.linkRods;
             linkBtn.innerText = `Link Rods: ${settings.linkRods ? 'ON' : 'OFF'}`;
             linkBtn.style.background = settings.linkRods ? '#5cb85c' : '#d9534f';
        };
        controlsDiv.appendChild(linkBtn);
        
        // Water Flow Slider (Restored)
        const waterDiv = document.createElement('div');
        waterDiv.innerHTML = `<label>Water Flow</label>`;
        const waterSlider = document.createElement('input');
        waterSlider.type = 'range';
        waterSlider.min = '1';
        waterSlider.max = '100';
        waterSlider.step = '1';
        waterSlider.style.width = '100%';
        const initialFlow = (typeof settings !== 'undefined') ? settings.waterFlowSpeed : 0.5;
        waterSlider.value = Math.round(initialFlow * 100);
        waterSlider.oninput = (e) => {
            if (typeof settings !== 'undefined') {
                 const raw = parseFloat(e.target.value) / 100;
                 let min = 0;
                 let max = 1;
                 if (typeof player !== 'undefined' && player) {
                     if (typeof player.waterFlowMin === 'number') min = player.waterFlowMin;
                     if (typeof player.waterFlowMax === 'number') max = player.waterFlowMax;
                 }
                 const clamped = Math.max(min, Math.min(max, raw));
                 settings.waterFlowSpeed = clamped;
                 waterSlider.value = Math.round(clamped * 100);
            }
        };
        // Keep a reference to update it visually if game updates it
        this.waterSliderDOM = waterSlider;
        waterDiv.appendChild(waterSlider);
        controlsDiv.appendChild(waterDiv);

        // SCRAM Button
        const scramBtn = document.createElement('button');
        scramBtn.id = 'btn-scram';
        scramBtn.className = 'scram-btn';
        scramBtn.innerText = 'SCRAM';
        scramBtn.onclick = () => {
            this.activateScram(scramBtn);
        };
        controlsDiv.appendChild(scramBtn);

        this.sidebar.appendChild(controlsDiv);

        // 2. Open Shop Button
        const shopBtn = document.createElement('button');
        shopBtn.innerText = "Open Shop";
        shopBtn.onclick = () => {
            this.toggleShop();
        };
        this.sidebar.appendChild(shopBtn);

        // 3. Open Settings Button (Added to Sidebar)
        const sideSetBtn = document.createElement('button');
        sideSetBtn.innerText = "Settings";
        sideSetBtn.onclick = () => {
             // Open settings directly, ensuring game is paused if needed?
             // Usually settings implies pausing.
             if(typeof paused !== 'undefined' && !paused) {
                 paused = true;
             }
             this.openSettingsMenu();
             this.updateDOM();
        };
        this.sidebar.appendChild(sideSetBtn);

        // 4. Dev Mode Button
        const devBtn = document.createElement('button');
        devBtn.id = 'btn-devmode';
        devBtn.innerText = settings.cheatMode ? "DEV MODE: ON" : "DEV MODE: OFF";
        devBtn.style.marginTop = "auto"; // Push to bottom if sidebar uses flex column
        devBtn.onclick = () => {
            settings.cheatMode = !settings.cheatMode;
            devBtn.innerText = settings.cheatMode ? "DEV MODE: ON" : "DEV MODE: OFF";
            // Check styling (green/red)
            devBtn.style.color = settings.cheatMode ? '#5cb85c' : 'white';
        };
        this.sidebar.appendChild(devBtn);

        // --- Shop Overlay Content ---
        // Close button logic
        if (document.getElementById('ui-shop-close')) {
            document.getElementById('ui-shop-close').onclick = () => this.toggleShop();
        }

        // Buy Amount Radio Checkboxes
        const radios = document.querySelectorAll('input[name="buyAmount"]');
        radios.forEach(radio => {
            radio.onchange = (e) => {
                if(e.target.checked) {
                    let val = e.target.value;
                    // convert '1', '5', '10' to numbers 
                    if (val !== 'MAX') val = parseInt(val);
                    
                    if (typeof shop !== 'undefined' && shop.setBuyAmount) {
                        shop.setBuyAmount(val);
                    }
                    this.updateShopButtons();
                }
            };
        });

        // Generate Shop Items (once, then update state)
        this.renderShopItemsDOM();

        // --- Pause Menu ---
        // Hook up existing buttons if they exist
        const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
        
        bind('btn-resume', () => { paused = false; this.updateDOM(); });
        bind('btn-save', () => { this.openSlotMenu('SAVE'); });
        bind('btn-load', () => { this.openSlotMenu('LOAD'); });
        bind('btn-settings', () => { this.openSettingsMenu(); });
        
        // Slot Menu Bindings
        bind('btn-slot-cancel', () => { 
             this.slotMenu.classList.add('hidden'); 
             this.pauseMenu.classList.remove('hidden'); 
        });

        // Settings Menu Navigation
        const views = ['settings-view-main', 'settings-view-audio', 'settings-view-video'];
        const switchView = (id) => {
            views.forEach(v => {
                const el = document.getElementById(v);
                if(el) el.classList.add('hidden');
            });
            const target = document.getElementById(id);
            if(target) target.classList.remove('hidden');
        };

        bind('btn-set-audio', () => switchView('settings-view-audio'));
        bind('btn-set-video', () => switchView('settings-view-video'));
        
        // Back buttons
        bind('btn-audio-back', () => switchView('settings-view-main'));
        bind('btn-video-back', () => switchView('settings-view-main'));
        
        bind('btn-settings-close', () => {
             this.settingsMenu.classList.add('hidden');
             this.pauseMenu.classList.remove('hidden');
             switchView('settings-view-main');
        });
        
        // Initial Settings Sync
        this.syncSettingsDOM();
    }
    
    syncSettingsDOM() {
        // Audio Inputs
        const audioKeys = ['master', 'sfx', 'ambience', 'steam', 'water', 'alarms', 'explosions'];
        audioKeys.forEach(key => {
            const slider = document.getElementById(`set-audio-${key}`);
            const check = document.getElementById(`chk-audio-${key}`);
            const obj = this.uiSettings.audio[key];
            
            if(slider && obj) {
                slider.value = obj.vol;
                slider.oninput = (e) => { obj.vol = parseFloat(e.target.value); };
            }
            if(check && obj) {
                check.checked = obj.enabled;
                check.onchange = (e) => { obj.enabled = e.target.checked; };
            }
        });

        // Video Inputs
        const bindCheck = (id, obj, key) => {
             const el = document.getElementById(id);
             if(el) {
                 el.checked = obj[key];
                 el.onchange = (e) => { obj[key] = e.target.checked; };
             }
        };
        
        bindCheck('set-video-bubbles', this.uiSettings.video, 'bubbles');
        bindCheck('set-video-water', this.uiSettings.video, 'waterEffect');
        bindCheck('set-video-steam', this.uiSettings.video, 'steam');
        bindCheck('set-video-glow', this.uiSettings.video, 'atomGlow');
        
        const nSlider = document.getElementById('set-video-neutrons');
        const nCheck = document.getElementById('chk-video-neutrons');
        if(nSlider) {
             nSlider.value = this.uiSettings.video.neutrons.vol; 
             nSlider.oninput = (e) => { this.uiSettings.video.neutrons.vol = parseFloat(e.target.value); };
        }
        if(nCheck) {
             nCheck.checked = this.uiSettings.video.neutrons.enabled;
             nCheck.onchange = (e) => { this.uiSettings.video.neutrons.enabled = e.target.checked; };
        }
        
        // Resolution Buttons
        document.querySelectorAll('.res-btn').forEach(btn => {
            btn.onclick = () => {
                const resIndex = parseInt(btn.getAttribute('data-res'));
                this.uiSettings.video.resolution = resIndex;
                console.log("Resolution set to index: " + resIndex);
                if(typeof window.setResolution === 'function') {
                    window.setResolution(resIndex);
                }
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
            const slotInfo = (playerState && playerState.saveSlots && playerState.saveSlots[i]) ? playerState.saveSlots[i] : "Empty";
            btn.innerText = `Slot ${i+1}: ${slotInfo}`;
            btn.style.padding = "10px";
            btn.style.cursor = "pointer";
            btn.onclick = () => {
                if (mode === 'SAVE') {
                    if (playerState) playerState.saveGame(i);
                    alert(`Saved to Slot ${i+1}`);
                    // Refresh text
                    btn.innerText = `Slot ${i+1}: ${playerState.saveSlots[i]}`;
                } else {
                    if (playerState) playerState.loadGame(i);
                    paused = false;
                    this.updateDOM(); // Hide all menus
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
        this.scramActive = true;
        if (btn) {
            btn.classList.add('scram-active');
            btn.innerText = '!!SCRAM!!';
        }

        // Max water flow
        if (typeof settings !== 'undefined') {
            let maxFlow = 1;
            if (typeof player !== 'undefined' && player && typeof player.waterFlowMax === 'number') {
                maxFlow = player.waterFlowMax;
            }
            settings.waterFlowSpeed = maxFlow;
            if (this.waterSliderDOM) {
                this.waterSliderDOM.value = Math.round(maxFlow * 100);
            }
        }

        // Raise all control rod targets up
        if (typeof controlRods !== 'undefined' && controlRods && typeof clampControlRodHandleY === 'function') {
            for (let i = 0; i < controlRods.length; i++) {
                const rod = controlRods[i];
                if (!rod) continue;
                let handleY = clampControlRodHandleY(i, rod.height);
                if (typeof ui !== 'undefined' && ui && ui.controlSlider && ui.controlSlider.handleY) {
                    ui.controlSlider.handleY[i] = handleY;
                }
                rod.targetY = Math.max(0, handleY - rod.height);
            }
        }
    }

    renderShopItemsDOM() {
        if (!shop || !shop.items) return;
        
        this.shopItemsContainer.innerHTML = ''; // Clear

        Object.keys(shop.items).forEach(key => {
            const item = shop.items[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            
            const title = document.createElement('h3');
            title.innerText = item.name || key;
            itemDiv.appendChild(title);

            const desc = document.createElement('p');
            desc.innerText = item.description || "No description";
            itemDiv.appendChild(desc);

            const btn = document.createElement('button');
            btn.id = `shop-btn-${key}`;
            btn.innerText = "Buy";
            btn.onclick = () => {
                // Ensure shop state is correct before buying
                if (shop && shop.setBuyAmount) {
                    shop.setBuyAmount(this.modifiers[this.currentModifierIndex]);
                    shop.buy(key);
                }
                this.updateShopButtons(); 
            };
            itemDiv.appendChild(btn);

            this.shopItemsContainer.appendChild(itemDiv);
        });
        
        this.updateShopButtons();
    }

    updateShopButtons() {
        if (typeof shop === 'undefined' || !this.shopOverlay || this.shopOverlay.classList.contains('hidden')) return;

        // Ensure shop state is synced for accurate pricing display
        if (shop.setBuyAmount) {
            shop.setBuyAmount(this.modifiers[this.currentModifierIndex]);
        }

        Object.keys(shop.items).forEach(key => {
            const btn = document.getElementById(`shop-btn-${key}`);
            if (btn) {
                // getPurchaseInfo uses internal shop.buyAmount
                const info = shop.getPurchaseInfo(key); 
                const costText = (typeof formatLarge === 'function')
                    ? formatLarge(info.cost, CURRENCY_UNIT, 2)
                    : `${info.cost.toFixed(2)}${CURRENCY_UNIT}`;

                const isMax = shop.buyAmount === 'MAX';
                if (isMax && info.count === 0) {
                    btn.innerText = 'MAX';
                    btn.style.background = '#d7b600';
                    btn.disabled = true;
                } else {
                    btn.innerText = `Buy ${info.count} (${costText})`;
                    btn.style.background = '';
                }
                
                // Check affordability (assuming player money matches logic in buy())
                // shop.buy() calls player.spend(). We need to know if we CAN afford.
                // shop.getPurchaseInfo returns cost. check player.money >= cost.
                if (typeof player !== 'undefined') {
                    const cheatMode = (typeof settings !== 'undefined' && settings && settings.cheatMode);
                    if (!(isMax && info.count === 0)) {
                        btn.disabled = cheatMode ? false : player.balance < info.cost;
                    }
                }
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
        // Toggle Overlay Visibility based on 'paused' state (managed globally)
        // If not paused, hide pause/slot/settings menus
        if (typeof paused !== 'undefined' && !paused) {
            if(this.pauseMenu) this.pauseMenu.classList.add('hidden');
            if(this.slotMenu) this.slotMenu.classList.add('hidden');
            if(this.settingsMenu) this.settingsMenu.classList.add('hidden');
        } else if (typeof paused !== 'undefined' && paused) {
            // If just paused and no other menu is open, show main pause menu
            const pHidden = this.pauseMenu.classList.contains('hidden');
            const sHidden = this.slotMenu.classList.contains('hidden');
            const settHidden = this.settingsMenu.classList.contains('hidden');
            
            if (pHidden && sHidden && settHidden) {
                this.pauseMenu.classList.remove('hidden');
            }
        }
        
        // Update Money Stats
        const mStat = document.getElementById('stat-money');
        const iStat = document.getElementById('stat-income');
        if (mStat && iStat && typeof player !== 'undefined') {
             // Assuming formatLarge is global or we use simple format
             if (typeof formatLarge === 'function') {
                 mStat.innerText = formatLarge(player.getBalance(), CURRENCY_UNIT, 2);
                 if (typeof lastMoneyPerSecond !== 'undefined') {
                    iStat.innerText = `${formatLarge(lastMoneyPerSecond, CURRENCY_UNIT, 2)}/s`;
                 }
             } else {
                 mStat.innerText = `${Math.floor(player.getBalance())}${CURRENCY_UNIT}`;
             }
        }
        
        // Update Water Slider Visual (if externally changed)
        if (this.waterSliderDOM && typeof settings !== 'undefined') {
            let min = 0;
            let max = 1;
            if (typeof player !== 'undefined' && player) {
                if (typeof player.waterFlowMin === 'number') min = player.waterFlowMin;
                if (typeof player.waterFlowMax === 'number') max = player.waterFlowMax;
            }
            const clamped = Math.max(min, Math.min(max, settings.waterFlowSpeed));
            if (clamped !== settings.waterFlowSpeed) {
                settings.waterFlowSpeed = clamped;
            }

            const targetValue = Math.round(clamped * 100);
            if (Math.abs(parseFloat(this.waterSliderDOM.value) - targetValue) > 0.5) {
                this.waterSliderDOM.value = targetValue;
            }
        }
        
        // Update Shop Buttons if open
        if (this.shopOpen) {
            this.updateShopButtons();
        }
    }

    drawBorders() {
        this.ensureFrame();
        if (typeof drawBorders === 'function') {
           drawBorders(this.ctx, this.simXOffset);
        }
    }

    drawUi() {
        this.ensureFrame();
        
        // Update DOM state
        this.updateDOM();

        // Draw Canvas Elements (Meters, FPS, Rods are visual)
        if (typeof controlRods !== 'undefined') {
            controlRods.forEach(r => { if (r) r.draw(this.ctx, this.simXOffset); });
        }
        
        if (ui.powerMeter) ui.powerMeter.draw(this.ctx, this.simXOffset);
        if (ui.tempMeter) ui.tempMeter.draw(this.ctx, this.simXOffset);
        if (ui.controlSlider) ui.controlSlider.draw(this.ctx, this.simXOffset);
        
        if (typeof drawFPS === 'function') drawFPS(this.ctx, this.simXOffset);
        if (typeof gameOver === 'function') gameOver(this.ctx, this.simXOffset);
        
        // Legacy: we don't draw sidebar or pause menu to canvas anymore
    }
    
    // Method kept for compatibility if other scripts call it
    drawSideBar() {
    }
    
    drawPauseMenu() {
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
