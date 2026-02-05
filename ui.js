class UICanvas {
    constructor() {
        this.width = screenRenderWidth;
        this.height = screenHeight;
        this.simWidth = screenSimWidth;
        this.simXOffset = SHOP_WIDTH;
        this.lastFrame = -1;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.id = "UI";

        // We do NOT append to DOM anymore; this is now an offscreen buffer
        // rendered via WebGL texture.
        /*
        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.canvas);
        } else {
            console.warn('Canvas container not found, appending to body');
            document.body.appendChild(this.canvas);
        }
        */

        this.ctx = this.canvas.getContext('2d');
        
        // Shop Modifiers
        this.modifiers = [1, 5, 10, 'MAX'];

        // Pause Menu State
        this.pauseMenuState = 'MAIN';
        this.pendingSaveSlot = null;
        this.draggingSlider = null;
        
        // New Settings Structure
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
            video: {
                bubbles: true,
                waterEffect: true,
                steam: true,
                atomGlow: true,
                // Neutrons toggle + alpha slider (reusing the vol/enabled structure)
                neutrons: { vol: 1.0, enabled: true } 
            }
        };
    }

    ensureFrame() {
        if (this.lastFrame === frameCount) return;
        this.lastFrame = frameCount;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawBorders() {
        this.ensureFrame();
        drawBorders(this.ctx, this.simXOffset);
    }

    drawUi() {
        this.ensureFrame();
        this.drawSideBar();
        controlRods.forEach(r => r.draw(this.ctx, this.simXOffset));
        if (ui.powerMeter) ui.powerMeter.draw(this.ctx, this.simXOffset);
        if (ui.tempMeter) ui.tempMeter.draw(this.ctx, this.simXOffset);
        if (ui.controlSlider) ui.controlSlider.draw(this.ctx, this.simXOffset);
        drawFPS(this.ctx, this.simXOffset);
        gameOver(this.ctx, this.simXOffset);
        
        if (paused) this.drawPauseMenu();
    }

    getMenuElements() {
        const pScale = globalScale * 0.6;
        const buttonHeight = 50 * pScale;
        const buttonGap = 20 * pScale;
        const btnWidth = 300 * pScale;
        const cx = this.simXOffset + this.simWidth / 2;
        
        // Helper to generate coordinates centered vertically
        const generateLayout = (items, width) => {
            const totalHeight = items.length * (buttonHeight + buttonGap) - buttonGap;
            const startY = (this.height - totalHeight) / 2;
            return items.map((item, index) => ({
                ...item,
                x: cx - width / 2,
                y: startY + index * (buttonHeight + buttonGap),
                w: width,
                h: buttonHeight
            }));
        };

        switch (this.pauseMenuState) {
            case 'MAIN':
                return {
                    title: "PAUSED",
                    buttons: generateLayout([
                        { text: "RESUME", action: () => { paused = false; } },
                        { text: "RESTART", action: () => { this.pauseMenuState = 'RESTART_CONFIRM'; } },
                        { text: "SAVE GAME", action: () => { this.pauseMenuState = 'SAVE'; } },
                        { text: "LOAD GAME", action: () => { this.pauseMenuState = 'LOAD'; } },
                        { text: "SETTINGS", action: () => { this.pauseMenuState = 'SETTINGS'; } }
                    ], btnWidth)
                };
            case 'SAVE':
                return {
                    title: "SAVE GAME",
                    buttons: generateLayout([
                        { text: `Slot 1: ${playerState ? playerState.saveSlots[0] : 'Empty'}`, action: () => { if (playerState) { if (playerState.hasSave(0)) { this.pendingSaveSlot = 0; this.pauseMenuState = 'SAVE_CONFIRM'; } else { playerState.saveGame(0); this.pauseMenuState = 'MAIN'; } } } },
                        { text: `Slot 2: ${playerState ? playerState.saveSlots[1] : 'Empty'}`, action: () => { if (playerState) { if (playerState.hasSave(1)) { this.pendingSaveSlot = 1; this.pauseMenuState = 'SAVE_CONFIRM'; } else { playerState.saveGame(1); this.pauseMenuState = 'MAIN'; } } } },
                        { text: `Slot 3: ${playerState ? playerState.saveSlots[2] : 'Empty'}`, action: () => { if (playerState) { if (playerState.hasSave(2)) { this.pendingSaveSlot = 2; this.pauseMenuState = 'SAVE_CONFIRM'; } else { playerState.saveGame(2); this.pauseMenuState = 'MAIN'; } } } },
                        { text: "DELETE SAVE", action: () => { this.pauseMenuState = 'DELETE_SAVE'; } },
                        { text: "BACK", action: () => { this.pauseMenuState = 'MAIN'; } }
                    ], btnWidth)
                };
            case 'LOAD':
                 return {
                    title: "LOAD GAME",
                    buttons: generateLayout([
                        { text: `Slot 1: ${playerState ? playerState.saveSlots[0] : 'Empty'}`, action: () => { if (playerState) { playerState.loadGame(0); paused = false; } this.pauseMenuState = 'MAIN'; } },
                        { text: `Slot 2: ${playerState ? playerState.saveSlots[1] : 'Empty'}`, action: () => { if (playerState) { playerState.loadGame(1); paused = false; } this.pauseMenuState = 'MAIN'; } },
                        { text: `Slot 3: ${playerState ? playerState.saveSlots[2] : 'Empty'}`, action: () => { if (playerState) { playerState.loadGame(2); paused = false; } this.pauseMenuState = 'MAIN'; } },
                        { text: "BACK", action: () => { this.pauseMenuState = 'MAIN'; } }
                    ], btnWidth)
                };
            case 'SETTINGS':
                return {
                    title: "SETTINGS",
                    buttons: generateLayout([
                        { text: "AUDIO SETTINGS", action: () => { this.pauseMenuState = 'SETTINGS_AUDIO'; } },
                        { text: "VIDEO SETTINGS", action: () => { this.pauseMenuState = 'SETTINGS_VIDEO'; } },
                        { text: "BACK", action: () => { this.pauseMenuState = 'MAIN'; } }
                    ], btnWidth)
                };
            case 'SETTINGS_AUDIO':
                const audioKeys = [
                    { label: 'Master Volume', key: 'master' },
                    { label: 'All SFX', key: 'sfx' },
                    { label: 'Ambience', key: 'ambience' },
                    { label: 'Steam', key: 'steam' },
                    { label: 'Water', key: 'water' },
                    { label: 'Alarms', key: 'alarms' },
                    { label: 'Explosions', key: 'explosions' }
                ];
                
                return {
                    title: "AUDIO SETTINGS",
                    buttons: generateLayout([
                        ...audioKeys.map(item => ({
                            text: item.label,
                            type: 'slider_checkbox',
                            settingObj: this.uiSettings.audio[item.key]
                        })),
                        { text: "BACK", action: () => { this.pauseMenuState = 'SETTINGS'; } }
                    ], btnWidth * 1.5)
                };
            case 'SETTINGS_VIDEO':
                 return {
                    title: "VIDEO SETTINGS",
                    buttons: generateLayout([
                        { text: "Resolution", action: () => { this.pauseMenuState = 'SETTINGS_RESOLUTION'; } },
                        { text: "Bubbles", type: 'checkbox', value: this.uiSettings.video.bubbles, action: () => { this.uiSettings.video.bubbles = !this.uiSettings.video.bubbles; } },
                        { text: "Water Effect", type: 'checkbox', value: this.uiSettings.video.waterEffect, action: () => { this.uiSettings.video.waterEffect = !this.uiSettings.video.waterEffect; } },
                        { text: "Steam", type: 'checkbox', value: this.uiSettings.video.steam, action: () => { this.uiSettings.video.steam = !this.uiSettings.video.steam; } },
                        { text: "Atom Glow", type: 'checkbox', value: this.uiSettings.video.atomGlow, action: () => { this.uiSettings.video.atomGlow = !this.uiSettings.video.atomGlow; } },
                        { 
                            text: "Neutrons", 
                            type: 'slider_checkbox', 
                            settingObj: this.uiSettings.video.neutrons
                        },
                        { text: "BACK", action: () => { this.pauseMenuState = 'SETTINGS'; } }
                    ], btnWidth)
                };
            case 'SETTINGS_RESOLUTION':
                 return {
                    title: "RESOLUTION",
                    buttons: generateLayout([
                        { text: "1067x600", action: () => { console.log("Set Res: 1067x600"); } },
                        { text: "1280x720", action: () => { console.log("Set Res: 1280x720"); } },
                        { text: "1600x900", action: () => { console.log("Set Res: 1600x900"); } },
                        { text: "1920x1080", action: () => { console.log("Set Res: 1920x1080"); } },
                        { text: "BACK", action: () => { this.pauseMenuState = 'SETTINGS_VIDEO'; } }
                    ], btnWidth)
                };
            case 'RESTART_CONFIRM':
                 return {
                    title: "RESTART?",
                    warning: "Unsaved progress will be lost!",
                    buttons: generateLayout([
                        { text: "YES", action: () => { if (typeof resetSimulation === 'function') resetSimulation(); paused = false; this.pauseMenuState = 'MAIN'; } },
                        { text: "NO", action: () => { this.pauseMenuState = 'MAIN'; } }
                    ], btnWidth)
                };
            case 'SAVE_CONFIRM':
                const slotNum = this.pendingSaveSlot + 1;
                return {
                    title: `OVERWRITE SLOT ${slotNum}?`,
                    warning: "Existing save will be lost!",
                    buttons: generateLayout([
                        { text: "YES", action: () => { if (playerState) playerState.saveGame(this.pendingSaveSlot); this.pauseMenuState = 'MAIN'; } },
                        { text: "NO", action: () => { this.pauseMenuState = 'SAVE'; } }
                    ], btnWidth)
                };
            case 'DELETE_SAVE':
                return {
                    title: "DELETE SAVE",
                    buttons: generateLayout([
                        { text: `Delete Slot 1: ${playerState ? playerState.saveSlots[0] : 'Empty'}`, action: () => { this.pendingSaveSlot = 0; this.pauseMenuState = 'DELETE_CONFIRM'; } },
                        { text: `Delete Slot 2: ${playerState ? playerState.saveSlots[1] : 'Empty'}`, action: () => { this.pendingSaveSlot = 1; this.pauseMenuState = 'DELETE_CONFIRM'; } },
                        { text: `Delete Slot 3: ${playerState ? playerState.saveSlots[2] : 'Empty'}`, action: () => { this.pendingSaveSlot = 2; this.pauseMenuState = 'DELETE_CONFIRM'; } },
                        { text: "BACK", action: () => { this.pauseMenuState = 'MAIN'; } }
                    ], btnWidth)
                };
            case 'DELETE_CONFIRM':
                const delSlotNum = this.pendingSaveSlot + 1;
                return {
                    title: `DELETE SLOT ${delSlotNum}?`,
                    warning: "This cannot be undone!",
                    buttons: generateLayout([
                        { text: "YES", action: () => { if (playerState) playerState.deleteSave(this.pendingSaveSlot); this.pauseMenuState = 'MAIN'; } },
                        { text: "NO", action: () => { this.pauseMenuState = 'DELETE_SAVE'; } }
                    ], btnWidth)
                };
            default:
                return { title: "ERROR", buttons: [] };
        }
    }

    drawPauseMenu() {
        const ctx = this.ctx;
        ctx.save();
        // Darkened background covering everything
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        const menu = this.getMenuElements();
        const pScale = globalScale * 0.6;
        const cx = this.simXOffset + this.simWidth / 2;

        // Determine Title Y position
        // If buttons exist, place title above top button. Else center + offset.
        let titleY;
        if (menu.buttons.length > 0) {
            titleY = menu.buttons[0].y - 80 * pScale;
        } else {
            titleY = this.height / 2 - 40 * pScale;
        }

        // Draw Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.font = `${80 * pScale}px UIFont1, sans-serif`;
        ctx.fillText(menu.title, cx, titleY);

        // Draw Warning if present (e.g. Restart Confirm)
        if (menu.warning) {
             ctx.font = `${40 * pScale}px UIFont1, sans-serif`;
             ctx.fillStyle = '#ff6666'; // Light red for warning
             ctx.fillText(menu.warning, cx, titleY + 50 * pScale);
        }

        // Draw Buttons
        ctx.font = `${30 * pScale}px UIFont1, sans-serif`;
        ctx.lineWidth = 2;

        menu.buttons.forEach((btn) => {
            const { x, y, w, h, text, type, value, settingObj } = btn;

            // Simple background for buttons
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, w, h);
            
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = 'white';
            
            if (type === 'checkbox') {
                 // Align text left for checkbox rows
                 ctx.textAlign = 'left';
                 ctx.fillText(text, x + 20 * pScale, y + h / 2);
                 
                 // Draw the box on the right
                 const boxSize = 25 * pScale;
                 const boxX = x + w - boxSize - 20 * pScale;
                 const boxY = y + (h - boxSize) / 2;
                 
                 ctx.strokeRect(boxX, boxY, boxSize, boxSize);
                 if (value) {
                     // Checkmark / Fill
                     ctx.fillStyle = '#fff';
                     ctx.fillRect(boxX + 4 * pScale, boxY + 4 * pScale, boxSize - 8 * pScale, boxSize - 8 * pScale);
                 }
            } else if (type === 'slider_checkbox') {
                 // Align text left
                 ctx.textAlign = 'left';
                 ctx.fillText(text, x + 20 * pScale, y + h / 2);

                 const boxSize = 25 * pScale;
                 const sliderWidth = 100 * pScale * 1.5;
                 const gap = 15 * pScale;

                 // Checkbox (Rightmost)
                 const boxX = x + w - boxSize - 20 * pScale;
                 const boxY = y + (h - boxSize) / 2;
                 
                 ctx.strokeStyle = '#fff';
                 ctx.strokeRect(boxX, boxY, boxSize, boxSize);
                 if (settingObj.enabled) {
                     ctx.fillStyle = '#fff';
                     ctx.fillRect(boxX + 4 * pScale, boxY + 4 * pScale, boxSize - 8 * pScale, boxSize - 8 * pScale);
                 }

                 // Slider (Left of Checkbox)
                 // Layout: [Text ... ] [Slider] [Box]
                 const sliderH = 10 * pScale * (4 / 3);
                 const sliderX = boxX - sliderWidth - gap;
                 const sliderY = y + (h - sliderH) / 2;

                 ctx.strokeRect(sliderX, sliderY, sliderWidth, sliderH);
                 
                 // Fill slider logic
                 const poolVal = settingObj.vol; // 0.0 to 1.0
                 if (poolVal > 0) {
                     ctx.fillStyle = '#6cc460'; 
                     ctx.fillRect(sliderX, sliderY, sliderWidth * poolVal, sliderH);
                 }

            } else {
                ctx.textAlign = 'center';
                ctx.fillText(text, cx, y + h / 2);
            }
        });

        ctx.restore();
    }

    getSidebarLayout() {
        // Sidebar configuration - easy to edit
        const sidebarConfig = {
            sbScale: globalScale * 2,
            marginX: 10 * globalScale,
            fontScale: 9 * globalScale,
            startY: 150 * globalScale,
            controlsH: 100 * globalScale,
            linkToggleSize: 13 * globalScale,
            linkToggleOffsetY: 40 * globalScale,
            sliderWidth: 225 * globalScale,
            sliderH: 13.33 * globalScale,
            sliderGap: 20 * globalScale,
            shopGap: 25 * globalScale,
            shopLabelGap: 5 * globalScale,
            modH: 16 * globalScale,
            modGap: 5 * globalScale,
            itemHeight: 22 * globalScale,
            itemGap: 5 * globalScale,
            settingsGap: 15 * globalScale,
            devBtnHeight: 40 * 0.4 * globalScale
        };

        const { sbScale, marginX, fontScale, startY, controlsH, linkToggleSize, linkToggleOffsetY, sliderWidth, sliderH, sliderGap, shopGap, shopLabelGap, modH, modGap, itemHeight, itemGap, settingsGap, devBtnHeight } = sidebarConfig;
        const contentWidth = this.simXOffset - 2 * marginX;
        const innerPadX = 10 * globalScale;
        
        let currentY = startY;
        const layout = { config: sidebarConfig, elements: {} };

        // 1. Controls area
        layout.elements.controls = {
            x: marginX,
            y: currentY,
            w: contentWidth,
            h: controlsH
        };
        currentY += controlsH;

        // Link Rods Toggle
        layout.elements.linkToggle = {
            x: marginX + innerPadX,
            y: currentY - controlsH + linkToggleOffsetY,
            w: linkToggleSize,
            h: linkToggleSize
        };

        // Water Flow Slider
        layout.elements.waterSlider = {
            x: marginX + innerPadX,
            y: layout.elements.linkToggle.y + linkToggleSize + sliderGap,
            w: sliderWidth,
            h: sliderH
        };

        // Stack next items
        currentY += shopGap;

        // 2. Shop
        layout.elements.shopLabel = {
            x: 20 * globalScale,
            y: currentY
        };
        currentY += shopLabelGap * sbScale;

        // Modifiers
        const modW = (contentWidth - (modGap * (this.modifiers.length - 1))) / this.modifiers.length;
        layout.elements.modifiers = [];
        for (let i = 0; i < this.modifiers.length; i++) {
            layout.elements.modifiers.push({
                x: marginX + i * (modW + modGap),
                y: currentY,
                w: modW,
                h: modH,
                value: this.modifiers[i]
            });
        }
        currentY += modH + 10 * sbScale;

        // Items
        layout.elements.shopItems = [];
        if (shop) {
            const shopItems = Object.keys(shop.items);
            for (let i = 0; i < shopItems.length; i++) {
                layout.elements.shopItems.push({
                    x: marginX,
                    y: currentY,
                    w: contentWidth,
                    h: itemHeight,
                    key: shopItems[i]
                });
                currentY += itemHeight + itemGap;
            }
        }

        // 3. Settings
        currentY += settingsGap;
        layout.elements.settingsLabel = {
            x: this.simXOffset / 2,
            y: currentY
        };
        currentY += shopLabelGap * sbScale;

        // Dev Mode Button
        layout.elements.devButton = {
            x: marginX,
            y: currentY,
            w: contentWidth,
            h: devBtnHeight
        };
        currentY += devBtnHeight + 10 * globalScale;

        // Boom Button
        layout.elements.boomButton = {
            x: marginX,
            y: currentY,
            w: contentWidth,
            h: devBtnHeight
        };
        currentY += devBtnHeight + 10 * globalScale;

        // Settings Button
        layout.elements.settingsButton = {
            x: marginX,
            y: currentY,
            w: contentWidth,
            h: devBtnHeight
        };

        return layout;
    }

    drawSideBar() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, this.simXOffset, this.height);

        // --- Standard Size (Money Stats) ---
        ctx.fillStyle = 'white';
        ctx.font = `${28 * globalScale}px UIFont1, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText("REACTOR CONTROL", this.simXOffset / 2, 50 * globalScale);

        if (player) {
            ctx.font = `${30 * globalScale}px UIFont1, sans-serif`;
            ctx.fillStyle = '#90EE90';
            ctx.fillText(`${formatLarge(player.getBalance(), 'n€')}`, this.simXOffset / 2, 100 * globalScale);
            ctx.font = `${20 * globalScale}px UIFont1, sans-serif`;
            ctx.fillStyle = '#aaa';
            ctx.fillText(`${formatLarge(lastMoneyPerSecond, 'n€')}/s`, this.simXOffset / 2, 130 * globalScale);
        }

        const layout = this.getSidebarLayout();
        const { config, elements } = layout;
        const { sbScale, marginX, fontScale, startY, controlsH, linkToggleSize, linkToggleOffsetY, sliderWidth, sliderH, sliderGap, shopGap, shopLabelGap, modH, modGap, itemHeight, itemGap, settingsGap, devBtnHeight } = config;
        const contentWidth = this.simXOffset - 2 * marginX;
        const innerPadX = 10 * globalScale;
        
        // 1. Controls
        ctx.fillStyle = '#444';
        ctx.fillRect(elements.controls.x, elements.controls.y, elements.controls.w, elements.controls.h);
        
        ctx.fillStyle = 'white';
        ctx.font = `${10 * globalScale}px UIFont1, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText("CONTROLS", marginX + innerPadX, elements.controls.y + 45 * 0.4 * globalScale);

        // Link Rods Toggle
        ctx.fillStyle = settings.linkRods ? '#5cb85c' : '#d9534f';
        ctx.fillRect(elements.linkToggle.x, elements.linkToggle.y, elements.linkToggle.w, elements.linkToggle.h);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(elements.linkToggle.x, elements.linkToggle.y, elements.linkToggle.w, elements.linkToggle.h);
        
        ctx.fillStyle = 'white';
        ctx.font = `${fontScale}px UIFont1, sans-serif`;
        // Text slightly offset from toggle
        ctx.fillText("Link Rods", elements.linkToggle.x + linkToggleSize + 5 * globalScale, elements.linkToggle.y + linkToggleSize * 0.8);

        // Water Flow Slider
        ctx.fillStyle = 'white';
        ctx.font = `${fontScale}px UIFont1, sans-serif`;
        ctx.fillText("Water Flow", elements.waterSlider.x, elements.waterSlider.y - shopLabelGap * globalScale);

        ctx.strokeStyle = 'white';
        ctx.strokeRect(elements.waterSlider.x, elements.waterSlider.y, elements.waterSlider.w, elements.waterSlider.h);

        const flowVal = settings.waterFlowSpeed / 1.0; // max 1.0
        if (flowVal > 0) {
            ctx.fillStyle = '#aaa';
            ctx.fillRect(elements.waterSlider.x, elements.waterSlider.y, elements.waterSlider.w * flowVal, elements.waterSlider.h);
        }

        // Border line
        ctx.fillStyle = 'black';
        ctx.fillRect(this.simXOffset - (2 * globalScale), 0, 2 * globalScale, this.height);

        // 2. Shop
        ctx.fillStyle = 'white';
        ctx.font = `${fontScale}px UIFont1, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText("SHOP", elements.shopLabel.x, elements.shopLabel.y);

        // Draw Shop Inlined (to support resizing)
        if (shop) {
             // Modifiers
             elements.modifiers.forEach((mod) => {
                 const isSelected = shop.buyAmount === mod.value;
                 
                 ctx.fillStyle = isSelected ? '#5cb85c' : '#333';
                 ctx.strokeStyle = '#777';
                 ctx.lineWidth = 1;
                 ctx.fillRect(mod.x, mod.y, mod.w, mod.h);
                 ctx.strokeRect(mod.x, mod.y, mod.w, mod.h);
                 
                 ctx.fillStyle = 'white';
                 ctx.font = `${fontScale}px UIFont1, sans-serif`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(mod.value, mod.x + mod.w / 2, mod.y + mod.h / 2);
             });
             
             // Items
             elements.shopItems.forEach((item) => {
                 const buyInfo = shop.getPurchaseInfo(item.key);
                 const canAfford = player && player.getBalance() >= buyInfo.cost && buyInfo.count > 0;

                 ctx.fillStyle = canAfford ? '#333' : '#222';
                 ctx.strokeStyle = canAfford ? '#555' : '#333';
                 ctx.lineWidth = 1;
                 ctx.fillRect(item.x, item.y, item.w, item.h);
                 ctx.strokeRect(item.x, item.y, item.w, item.h);

                 ctx.fillStyle = canAfford ? 'white' : '#777';
                 ctx.font = `${fontScale}px UIFont1, sans-serif`;
                 ctx.textAlign = 'left';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(shop.items[item.key].name, item.x + 5 * globalScale, item.y + item.h / 2);

                 ctx.textAlign = 'right';
                 ctx.font = `${fontScale}px UIFont1, sans-serif`;
                 ctx.fillStyle = canAfford ? '#ffd700' : '#886600';
                 
                 let priceText = formatLarge(buyInfo.cost, 'n€');
                 ctx.fillText(priceText, item.x + item.w - 5 * globalScale, item.y + item.h / 2);
             });
        }

        // 3. Settings & Dev Mode
        ctx.textAlign = 'center';

        ctx.fillStyle = settings.cheatMode ? '#5cb85c' : '#d9534f';
        ctx.fillRect(elements.devButton.x, elements.devButton.y, elements.devButton.w, elements.devButton.h);
        
        ctx.fillStyle = 'white';
        ctx.font = `${fontScale}px UIFont1, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(settings.cheatMode ? "DEV MODE ON" : "DEV MODE", this.simXOffset / 2, elements.devButton.y + elements.devButton.h / 2);

        // Boom Button
        ctx.fillStyle = boom ? '#ff4500' : '#8b0000';
        ctx.fillRect(elements.boomButton.x, elements.boomButton.y, elements.boomButton.w, elements.boomButton.h);
        
        ctx.fillStyle = 'white';
        ctx.fillText("BOOM!", this.simXOffset / 2, elements.boomButton.y + elements.boomButton.h / 2);

        // Settings Button
        ctx.fillStyle = '#444';
        ctx.fillRect(elements.settingsButton.x, elements.settingsButton.y, elements.settingsButton.w, elements.settingsButton.h);
        
        ctx.fillStyle = 'white';
        ctx.fillText("MENU", this.simXOffset / 2, elements.settingsButton.y + elements.settingsButton.h / 2);
        
        ctx.restore();
    }

    handleMouseClick(x, y) {
        // 1. If paused, only handle pause menu clicks (Resized)
        if (paused) {
            const menu = this.getMenuElements();
            const pScale = globalScale * 0.6;
            
            for (const btn of menu.buttons) {
                if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                    
                    if (btn.type === 'slider_checkbox') {
                         const h = btn.h;
                         const w = btn.w;
                         const boxSize = 25 * pScale;
                         const sliderWidth = 100 * pScale * 1.5;
                         const gap = 15 * pScale;
                         const sliderH = 10 * pScale * (4 / 3);

                         const boxX = btn.x + w - boxSize - 20 * pScale;
                         const sliderX = boxX - sliderWidth - gap;
                         const sliderY = btn.y + (h - sliderH) / 2;

                         // Check Slider Click
                         if (x >= sliderX && x <= sliderX + sliderWidth && y >= sliderY && y <= sliderY + sliderH) {
                              const newVol = (x - sliderX) / sliderWidth;
                              btn.settingObj.vol = Math.max(0, Math.min(1, newVol));
                              return;
                         }

                         // Check Checkbox Click (using a slightly wider hit area for comfort)
                         if (x >= boxX) {
                              btn.settingObj.enabled = !btn.settingObj.enabled;
                              return;
                         }

                    } else {
                        // Standard Button or Simple Checkbox
                        audioManager.playSfx('click');
                        if (btn.action) btn.action();
                    }
                    return;
                }
            }
            return;
        }

        if (x < this.simXOffset) {
            const layout = this.getSidebarLayout();
            const { config, elements } = layout;
            const { sbScale, marginX, fontScale, startY, controlsH, linkToggleSize, linkToggleOffsetY, sliderWidth, sliderH, sliderGap, shopGap, shopLabelGap, modH, modGap, itemHeight, itemGap, settingsGap, devBtnHeight } = config;

            // 1. Controls
            if (x >= elements.linkToggle.x && x <= elements.linkToggle.x + elements.linkToggle.w && 
                y >= elements.linkToggle.y && y <= elements.linkToggle.y + elements.linkToggle.h) {
                settings.linkRods = !settings.linkRods;
                return;
            }

            // Water Flow Slider
            if (y >= elements.waterSlider.y && y <= elements.waterSlider.y + elements.waterSlider.h && x >= elements.waterSlider.x && x <= elements.waterSlider.x + elements.waterSlider.w) {
                const newVal = (x - elements.waterSlider.x) / elements.waterSlider.w * 1.0;
                settings.waterFlowSpeed = Math.max(0, Math.min(1, newVal));
                return;
            }

            // 2. Shop
            // Modifiers
            for (const mod of elements.modifiers) {
                if (y >= mod.y && y <= mod.y + mod.h && x >= mod.x && x <= mod.x + mod.w) {
                    audioManager.playSfx('click');
                    shop.setBuyAmount(mod.value);
                    return;
                }
            }

            // Items
            for (const item of elements.shopItems) {
                if (y >= item.y && y <= item.y + item.h) {
                    audioManager.playSfx('click');
                    shop.buy(item.key);
                    return;
                }
            }

            // 3. Settings / Dev Mode
            if (y >= elements.devButton.y && y <= elements.devButton.y + elements.devButton.h) {
                audioManager.playSfx('click');
                settings.cheatMode = !settings.cheatMode;
                if (settings.cheatMode && player) player.addMoney(1000000); //edit this to make everything cost 0
            }

            if (y >= elements.boomButton.y && y <= elements.boomButton.y + elements.boomButton.h) {
                boom = !boom;
            }

            if (y >= elements.settingsButton.y && y <= elements.settingsButton.y + elements.settingsButton.h) {
                paused = true;
                this.pauseMenuState = 'MAIN';
            }
        }
    }

    handleMouseDrag(x, y) {
        // Handle dragging for sliders
        if (this.draggingSlider) {
            // Continue dragging the active slider, ignore y position
            if (this.draggingSlider.type === 'water') {
                const layout = this.getSidebarLayout();
                const { elements } = layout;
                const sliderX = elements.waterSlider.x;
                const sliderW = elements.waterSlider.w;
                const newVal = (x - sliderX) / sliderW;
                settings.waterFlowSpeed = Math.max(0, Math.min(1, newVal));
            } else if (this.draggingSlider.type === 'audio') {
                const btn = this.draggingSlider.button;
                const pScale = globalScale * 0.6;
                const w = btn.w;
                const boxSize = 25 * pScale;
                const sliderWidth = 100 * pScale * 1.5;
                const gap = 15 * pScale;
                const boxX = btn.x + w - boxSize - 20 * pScale;
                const sliderX = boxX - sliderWidth - gap;
                const newVol = (x - sliderX) / sliderWidth;
                btn.settingObj.vol = Math.max(0, Math.min(1, newVol));
            }
            return;
        }

        // Check if starting drag on a slider
        if (paused) {
            // For pause menu sliders
            const menu = this.getMenuElements();
            const pScale = globalScale * 0.6;
            
            for (const btn of menu.buttons) {
                if (btn.type === 'slider_checkbox') {
                    const h = btn.h;
                    const w = btn.w;
                    const boxSize = 25 * pScale;
                    const sliderWidth = 100 * pScale * 1.5;
                    const gap = 15 * pScale;
                    const sliderH = 10 * pScale * (4 / 3);
                    const boxX = btn.x + w - boxSize - 20 * pScale;
                    const sliderX = boxX - sliderWidth - gap;
                    const sliderY = btn.y + (h - sliderH) / 2;
                    // Check if starting drag on slider
                    if (x >= sliderX && x <= sliderX + sliderWidth && y >= sliderY && y <= sliderY + sliderH) {
                        this.draggingSlider = { type: 'audio', button: btn };
                        const newVol = (x - sliderX) / sliderWidth;
                        btn.settingObj.vol = Math.max(0, Math.min(1, newVol));
                        return;
                    }
                }
            }
        } else {
            // For sidebar sliders
            if (x < this.simXOffset) {
                const layout = this.getSidebarLayout();
                const { elements } = layout;
                // Water Flow Slider
                if (y >= elements.waterSlider.y && y <= elements.waterSlider.y + elements.waterSlider.h && x >= elements.waterSlider.x && x <= elements.waterSlider.x + elements.waterSlider.w) {
                    this.draggingSlider = { type: 'water' };
                    const newVal = (x - elements.waterSlider.x) / elements.waterSlider.w * 1.0;
                    settings.waterFlowSpeed = Math.max(0, Math.min(1, newVal));
                    return;
                }
            }
        }
    }

    handleMouseRelease() {
        this.draggingSlider = null;
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