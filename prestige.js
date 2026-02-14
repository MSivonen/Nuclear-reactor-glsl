const prestigeManager = {
    loopNumber: 1,
    currentLevelData: null,

    getLoopData(loopNumber = 1) {
        const loop = Math.max(1, Math.floor(loopNumber));
        const growth = Math.pow(1.5, loop - 1);
        const easing = Math.min(loop - 1, 20) / 20;

        return {
            loopNumber: loop,
            thresholds: {
                money: Math.round(1000 * growth),
                power: Math.round(25 * growth)
            },
            bonuses: {
                maxHeatCap: Math.round(200 + (loop - 1) * 40),
                maxPowerCap: Math.round(200 + (loop - 1) * 55),
                heatingRate: Math.round(200 - (150 * easing)),
                collisionProbability: 0.07 - (0.015 * easing),
                decayProbability: 0.0001
            }
        };
    },

    ensureCurrentLevelData() {
        if (!this.currentLevelData) {
            this.currentLevelData = this.getLoopData(this.loopNumber);
        }
        return this.currentLevelData;
    },

    getCurrentThresholds() {
        const levelData = this.ensureCurrentLevelData() || {};
        const thresholds = levelData.thresholds || {};
        return {
            money: Number.isFinite(thresholds.money) ? thresholds.money : Infinity,
            power: Number.isFinite(thresholds.power) ? thresholds.power : Infinity
        };
    },

    getCurrentBonuses() {
        const levelData = this.ensureCurrentLevelData() || {};
        const bonuses = levelData.bonuses || {};
        return {
            maxHeatCap: Number.isFinite(bonuses.maxHeatCap) ? bonuses.maxHeatCap : 200,
            maxPowerCap: Number.isFinite(bonuses.maxPowerCap) ? bonuses.maxPowerCap : 200,
            heatingRate: Number.isFinite(bonuses.heatingRate) ? bonuses.heatingRate : 200,
            collisionProbability: Number.isFinite(bonuses.collisionProbability) ? bonuses.collisionProbability : 0.08,
            decayProbability: Number.isFinite(bonuses.decayProbability) ? bonuses.decayProbability : 0.0001
        };
    },

    applyCurrentLoopScaling() {
        const bonuses = this.getCurrentBonuses();

        game.boomValue = bonuses.maxPowerCap;

        settings.heatingRate = bonuses.heatingRate;
        settings.collisionProbability = bonuses.collisionProbability;
        settings.decayProbability = bonuses.decayProbability;

        if (ui.tempMeter) ui.tempMeter.max = bonuses.maxHeatCap;
        if (ui.powerMeter) ui.powerMeter.max = bonuses.maxPowerCap;
    },

    advanceLoop() {
        this.loopNumber = Math.max(1, Math.floor(this.loopNumber) + 1);
        this.currentLevelData = this.getLoopData(this.loopNumber);
        this.applyCurrentLoopScaling();
        return this.currentLevelData;
    },

    loadFromPlayer(playerObj) {
        const p = playerObj && playerObj.prestige ? playerObj.prestige : null;
        this.loopNumber = p && Number.isFinite(p.loopNumber) ? Math.max(1, Math.floor(p.loopNumber)) : 1;
        this.currentLevelData = this.getLoopData(this.loopNumber);
        this.applyCurrentLoopScaling();
    },

    saveToPlayer(playerObj) {
        playerObj.prestige = {
            loopNumber: this.loopNumber,
            currentLevelData: this.ensureCurrentLevelData()
        };
    }
};

prestigeManager.ensureCurrentLevelData();

window.prestigeManager = prestigeManager;
