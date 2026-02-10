class PlayerState {
    constructor() {
        this.saveSlots = ['Empty', 'Empty', 'Empty'];
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
        const name = (arguments.length > 1 && typeof arguments[1] === 'string') ? String(arguments[1]).substring(0, 12) : null;

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
            localStorage.setItem(`nuclearReactor_save_${slotIndex}`, JSON.stringify(saveData));
            const namePart = name ? `${name} — ` : '';
            this.saveSlots[slotIndex] = `${namePart}${new Date().toLocaleString()} (v${GAME_VERSION})`;
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

            player.deserialize(saveData.player);
            shop.deserialize(saveData.shop);
            Object.assign(settings, saveData.settings);
            ui.canvas.uiSettings = saveData.uiSettings;

            resetSimulation();
            initializePlayerAtomGroups(player);

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
                name: saveData.name || null,
                hasData: true
            };
        } catch (e) {
            return null;
        }
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
                this.saveSlots = JSON.parse(slotsStr);
            }
        } catch (e) {
            console.error('Failed to load slot info:', e);
        }
    }

    deleteSave(slotIndex) {
        if (slotIndex < 0 || slotIndex > 2) return false;

        try {
            localStorage.removeItem(`nuclearReactor_save_${slotIndex}`);
            this.saveSlots[slotIndex] = 'Empty';
            this.saveSlotsToStorage();
            return true;
        } catch (e) {
            console.error('Failed to delete save:', e);
            return false;
        }
    }
}