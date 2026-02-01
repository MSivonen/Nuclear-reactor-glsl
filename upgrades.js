class Upgrades {
    constructor() {
        // multiplier per kW (can be upgraded later)
        this.moneyPerKw = 1;
        // placeholder multiplier for future upgrades
        this.dummy = 1;
    }

    multiply(money) {
        let result = money;
        result *= this.moneyPerKw;
        result *= this.dummy;
        return result;
    }
}

window.Upgrades = Upgrades;
