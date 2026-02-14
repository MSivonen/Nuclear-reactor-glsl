class PlayerState {
    constructor() {
        this.saveSlots = [0, 1, 2].map(i => this.getEmptySlotLabel(i));
        this.selectedSlot = 0; // active slot index used for autosave / quick save/load
        this.loadSlots();
        // Load selected slot from storage if present
        try {
            const sel = localStorage.getItem('nuclearReactor_selectedSlot');
            if (sel !== null) this.selectedSlot = parseInt(sel);
        } catch (e) { /* ignore */ }
    }

    saveGame(slotIndex) {
        if (slotIndex < 0 || slotIndex > 2) return false;

        const GAME_VERSION = '0.12';

        // optional name parameter may be passed as second arg
        const rawName = (arguments.length > 1 && typeof arguments[1] === 'string') ? String(arguments[1]).trim().substring(0, 12) : '';
        const existing = this.getSaveInfo(slotIndex);
        const preservedName = (existing && existing.name) ? String(existing.name).trim().substring(0, 12) : '';
        const name = rawName || preservedName || `Slot ${slotIndex + 1}`;

            prestigeManager.saveToPlayer(player);

        const saveData = {
            timestamp: new Date().toISOString(),
            name: name,
            player: player.serialize(),
            shop: shop.serialize(),
            settings: { ...settings },
            uiSettings: ui.canvas.uiSettings,
            version: GAME_VERSION
        };

        try {
            this.setSelectedSlot(slotIndex);
            localStorage.setItem(`nuclearReactor_save_${slotIndex}`, JSON.stringify(saveData));
            this.saveSlots[slotIndex] = `${name} — ${new Date().toLocaleString()} (v${GAME_VERSION})`;
            this.saveSlotsToStorage();
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    loadGame(slotIndex) {
        if (slotIndex < 0 || slotIndex > 2) return false;

        try {
            const saveDataStr = localStorage.getItem(`nuclearReactor_save_${slotIndex}`);
            if (!saveDataStr) return false;

            const saveData = JSON.parse(saveDataStr);

            this.setSelectedSlot(slotIndex);
            resetSimulation();

            player.deserialize(saveData.player);
            if (prestigeManager && typeof prestigeManager.loadFromPlayer === 'function') {
                prestigeManager.loadFromPlayer(player);
            }
            shop.deserialize(saveData.shop);
            Object.assign(settings, defaultSettings, saveData.settings || {});
            if (!Number.isFinite(settings.collisionProbability) || settings.collisionProbability <= 0) {
                settings.collisionProbability = defaultSettings.collisionProbability;
            }
            ui.canvas.uiSettings = saveData.uiSettings;

            initializePlayerAtomGroups(player);
            initControlRodUpgrades();
            settings.waterFlowSpeed = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowSpeed));
            settings.targetNeutronSize = settings.neutronSize;

            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }

    hasSave(slotIndex) {
        return localStorage.getItem(`nuclearReactor_save_${slotIndex}`) !== null;
    }

    getSaveInfo(slotIndex) {
        try {
            const saveDataStr = localStorage.getItem(`nuclearReactor_save_${slotIndex}`);
            if (!saveDataStr) return null;

            const saveData = JSON.parse(saveDataStr);
            return {
                timestamp: saveData.timestamp,
                version: saveData.version,
                name: (saveData.name && String(saveData.name).trim()) ? saveData.name : `Slot ${slotIndex + 1}`,
                hasData: true
            };
        } catch (e) {
            return null;
        }
    }

    getSaveName() {
        const slotIndex = this.getSelectedSlot();
        const saveInfo = this.getSaveInfo(slotIndex);
        return saveInfo && saveInfo.name ? saveInfo.name : `Slot ${slotIndex + 1}`;
    }

    saveSlotsToStorage() {
        try {
            localStorage.setItem('nuclearReactor_saveSlots', JSON.stringify(this.saveSlots));
            localStorage.setItem('nuclearReactor_selectedSlot', String(this.selectedSlot));
        } catch (e) {
            console.error('Failed to save slot info:', e);
        }
    }

    setSelectedSlot(index) {
        if (index < 0 || index > 2) return;
        this.selectedSlot = index;
        try { localStorage.setItem('nuclearReactor_selectedSlot', String(this.selectedSlot)); } catch (e) {}
    }

    getSelectedSlot() { return this.selectedSlot; }

    loadSlots() {
        try {
            const slotsStr = localStorage.getItem('nuclearReactor_saveSlots');
            if (slotsStr) {
                const parsed = JSON.parse(slotsStr);
                for (let i = 0; i < 3; i++) {
                    const val = Array.isArray(parsed) ? parsed[i] : null;
                    this.saveSlots[i] = (typeof val === 'string' && val.trim() && val !== 'Empty') ? val : this.getEmptySlotLabel(i);
                }
            }
        } catch (e) {
            console.error('Failed to load slot info:', e);
        }
    }

    deleteSave(slotIndex) {
        if (slotIndex < 0 || slotIndex > 2) return false;

        try {
            this.setSelectedSlot(slotIndex);
            localStorage.removeItem(`nuclearReactor_save_${slotIndex}`);
            this.saveSlots[slotIndex] = this.getEmptySlotLabel(slotIndex);
            this.saveSlotsToStorage();
            return true;
        } catch (e) {
            console.error('Failed to delete save:', e);
            return false;
        }
    }

    getEmptySlotLabel(slotIndex) {
        return `Slot ${slotIndex + 1} - empty`;
    }
}