class Player {
    constructor() {
        this.balance = 0;
        this.incomePerSecond = 0;
        this.ownedColumns = [];
        this.ownedGroups = [];
        this.groupAtomCounts = [];
        this.rodCount = 1;
        this.upgrades = {};
        this.settings = {};

        this.waterFlowStart = 0.05;
        this.waterFlowMinLimit = 0.01;
        this.waterFlowMaxLimit = 1.0;
        this.waterFlowUpgradeMax = 20;
        this.waterFlowUpgradeCount = 0;
        this.waterFlowStepUp = (this.waterFlowMaxLimit - this.waterFlowStart) / this.waterFlowUpgradeMax;
        this.waterFlowStepDown = (this.waterFlowStart - this.waterFlowMinLimit) / this.waterFlowUpgradeMax;
        this.waterFlowMin = this.waterFlowStart;
        this.waterFlowMax = this.waterFlowStart;
        this.upgrades.waterFlow = 0;
        this.prestige = {
            loopNumber: 1,
            currentLevelData: null
        };
        this.updateWaterFlowLimits();
    }

    addMoney(amount) {
        let finalAmount = amount;
        finalAmount = upgrades.multiply(finalAmount);
        if (Number.isFinite(finalAmount)) {
            this.balance += finalAmount;
            this.incomePerSecond = finalAmount;
        }
    }

    applySetbackPenalty(multiplier = 0.75) {
        this.balance = Math.max(0, this.balance * multiplier);
    }

    spend(amount) {
        if (this.balance >= amount) {
            this.balance -= amount;
            return true;
        }
        return false;
    }

    getBalance() {
        return this.balance;
    }

    updateWaterFlowLimits() {
        this.waterFlowStepUp = (this.waterFlowMaxLimit - this.waterFlowStart) / this.waterFlowUpgradeMax;
        this.waterFlowStepDown = (this.waterFlowStart - this.waterFlowMinLimit) / this.waterFlowUpgradeMax;
        this.waterFlowMax = Math.min(this.waterFlowMaxLimit, this.waterFlowStart + this.waterFlowUpgradeCount * this.waterFlowStepUp);
        const minVal = this.waterFlowStart - this.waterFlowUpgradeCount * this.waterFlowStepDown;
        this.waterFlowMin = Math.max(this.waterFlowMinLimit, Math.min(this.waterFlowMax, minVal));
    }

    serialize() {
        return {
            balance: this.balance,
            ownedColumns: this.ownedColumns,
            ownedGroups: this.ownedGroups,
            groupAtomCounts: this.groupAtomCounts,
            rodCount: this.rodCount,
            upgrades: this.upgrades,
            waterFlowStart: this.waterFlowStart,
            waterFlowMinLimit: this.waterFlowMinLimit,
            waterFlowMaxLimit: this.waterFlowMaxLimit,
            waterFlowUpgradeMax: this.waterFlowUpgradeMax,
            waterFlowUpgradeCount: this.waterFlowUpgradeCount,
            prestige: this.prestige
        };
    }

    deserialize(obj) {
        if (!obj) return;
        this.balance = obj.balance || 0;
        this.ownedColumns = obj.ownedColumns || [];
        this.ownedGroups = obj.ownedGroups || [];
        this.groupAtomCounts = obj.groupAtomCounts || [];
        this.rodCount = obj.rodCount || 1;
        this.upgrades = obj.upgrades || {};
        this.waterFlowStart = obj.waterFlowStart ?? 0.15;
        this.waterFlowMinLimit = obj.waterFlowMinLimit ?? 0.01;
        this.waterFlowMaxLimit = obj.waterFlowMaxLimit ?? 1.0;
        this.waterFlowUpgradeMax = obj.waterFlowUpgradeMax ?? 20;
        this.waterFlowUpgradeCount = obj.waterFlowUpgradeCount ?? (this.upgrades.waterFlow || 0);
        this.upgrades.waterFlow = this.waterFlowUpgradeCount;
        this.prestige = obj.prestige || {
            loopNumber: 1,
            currentLevelData: null
        };
        this.updateWaterFlowLimits();
    }
}
window.Player = Player;
