class Player {
    constructor() {
        this.balance = 0;
        this.incomePerSecond = 0;
        this.ownedColumns = [];
        this.rodCount = 1;
        this.upgrades = {};
        this.settings = {};

        // Water flow upgrade tuning (tweakable)
        this.waterFlowStart = 0.15;
        this.waterFlowMinLimit = 0.01;
        this.waterFlowMaxLimit = 1.0;
        this.waterFlowUpgradeMax = 20;
        this.waterFlowUpgradeCount = 0;
        this.waterFlowStepUp = (this.waterFlowMaxLimit - this.waterFlowStart) / this.waterFlowUpgradeMax;
        this.waterFlowStepDown = (this.waterFlowStart - this.waterFlowMinLimit) / this.waterFlowUpgradeMax;
        this.waterFlowMin = this.waterFlowStart;
        this.waterFlowMax = this.waterFlowStart;
        this.upgrades.waterFlow = 0;
        this.updateWaterFlowLimits();
    }

    addMoney(amount) {
        let finalAmount = amount;
        if (typeof upgrades !== 'undefined' && upgrades && typeof upgrades.multiply === 'function') {
            finalAmount = upgrades.multiply(finalAmount);
        }
        if (typeof finalAmount === 'number' && !isNaN(finalAmount)) {
            this.balance += finalAmount;
            this.incomePerSecond = finalAmount;
        }
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
            rodCount: this.rodCount,
            upgrades: this.upgrades,
            waterFlowStart: this.waterFlowStart,
            waterFlowMinLimit: this.waterFlowMinLimit,
            waterFlowMaxLimit: this.waterFlowMaxLimit,
            waterFlowUpgradeMax: this.waterFlowUpgradeMax,
            waterFlowUpgradeCount: this.waterFlowUpgradeCount
        };
    }

    deserialize(obj) {
        if (!obj) return;
        this.balance = obj.balance || 0;
        this.ownedColumns = obj.ownedColumns || [];
        this.rodCount = obj.rodCount || 1;
        this.upgrades = obj.upgrades || {};
        this.waterFlowStart = (typeof obj.waterFlowStart === 'number') ? obj.waterFlowStart : 0.15;
        this.waterFlowMinLimit = (typeof obj.waterFlowMinLimit === 'number') ? obj.waterFlowMinLimit : 0.01;
        this.waterFlowMaxLimit = (typeof obj.waterFlowMaxLimit === 'number') ? obj.waterFlowMaxLimit : 1.0;
        this.waterFlowUpgradeMax = (typeof obj.waterFlowUpgradeMax === 'number') ? obj.waterFlowUpgradeMax : 20;
        this.waterFlowUpgradeCount = (typeof obj.waterFlowUpgradeCount === 'number') ? obj.waterFlowUpgradeCount : (this.upgrades.waterFlow || 0);
        this.upgrades.waterFlow = this.waterFlowUpgradeCount;
        this.updateWaterFlowLimits();
    }
}

// Expose to global scope for script-based loading order
window.Player = Player;
