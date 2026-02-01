class Player {
    constructor() {
        this.balance = 0;
        this.incomePerSecond = 0;
        this.ownedColumns = [];
        this.rodCount = 1;
        this.upgrades = {};
        this.settings = {};
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

    serialize() {
        return {
            balance: this.balance,
            ownedColumns: this.ownedColumns,
            rodCount: this.rodCount,
            upgrades: this.upgrades
        };
    }

    deserialize(obj) {
        if (!obj) return;
        this.balance = obj.balance || 0;
        this.ownedColumns = obj.ownedColumns || [];
        this.rodCount = obj.rodCount || 1;
        this.upgrades = obj.upgrades || {};
    }
}

// Expose to global scope for script-based loading order
window.Player = Player;
