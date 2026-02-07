class Shop {
    constructor() {
        this.items = {
            atom: {
                name: "Add Atom",
                basePrice: 5,
                priceMult: 1.01
            },
            group: {
                name: "Add Group",
                basePrice: 5000,
                priceMult: 10
            },
            controlRod: {
                name: "Control Rod",
                basePrice: 10,
                priceMult: 1.3
            },
            waterFlow: {
                name: "Flow Limit",
                basePrice: 100,
                priceMult: 1.5
            }
        };
        this.buyAmount = 1; // 1, 5, 10, 'MAX'
    }

    setBuyAmount(amount) {
        if ([1, 5, 10, 'MAX'].includes(amount)) {
            this.buyAmount = amount;
        }
    }

    getItemCount(itemName) {
         switch (itemName) {
            case 'atom':
                return uraniumAtoms.filter(a => a.hasAtom).length;
            case 'group':
                return (typeof player !== 'undefined' && player && player.ownedGroups) ? player.ownedGroups.length : 0;
            case 'controlRod':
                return (typeof controlRodPurchaseCount !== 'undefined') ? controlRodPurchaseCount : 0;
            case 'waterFlow':
                return (typeof player !== 'undefined' && player && typeof player.waterFlowUpgradeCount === 'number') ? player.waterFlowUpgradeCount : 0;
            default:
                return 0;
        }
    }

    // Returns object { count: number, cost: number } for a proposed purchase
    getPurchaseInfo(itemName) {
        const item = this.items[itemName];
        if (!item) return { count: 0, cost: 0 };

        const currentCount = this.getItemCount(itemName);
        let countToBuy = this.buyAmount;
        
        // Constraint: Bulk buying only for atoms (as requested)
        if (itemName !== 'atom' && countToBuy !== 1 && countToBuy !== 'MAX') {
             // If user wants "only for atoms", we should probably fallback to 1 for others.
             // However, 'MAX' might be useful for waterFlow?
             // User said "amounts only for atoms, 1/5/10/max". 
             // I'll interpret this strictly: Non-atoms always buy 1 at a time unless MAX is standard? 
             // Let's stick to 1 for safety on groups/rods.
             countToBuy = 1;
        }

        let totalCost = 0;

        const maxRodPurchases = (itemName === 'controlRod' && typeof getMaxControlRodPurchases === 'function')
            ? getMaxControlRodPurchases()
            : 0;

        const maxWaterFlowUpgrades = (itemName === 'waterFlow' && player && typeof player.waterFlowUpgradeMax === 'number')
            ? player.waterFlowUpgradeMax
            : 0;

        if (itemName === 'controlRod' && currentCount >= maxRodPurchases) {
            return { count: 0, cost: 0 };
        }

        if (itemName === 'waterFlow' && currentCount >= maxWaterFlowUpgrades) {
            return { count: 0, cost: 0 };
        }

        if (countToBuy === 'MAX') {
            const cheatMode = (typeof settings !== 'undefined' && settings && settings.cheatMode);

            if (cheatMode) {
                if (itemName === 'atom') {
                    countToBuy = uraniumAtoms.filter(a => !a.hasAtom).length;
                } else if (itemName === 'controlRod') {
                    countToBuy = Math.max(0, maxRodPurchases - currentCount);
                } else if (itemName === 'waterFlow') {
                    countToBuy = Math.max(0, maxWaterFlowUpgrades - currentCount);
                } else {
                    countToBuy = 1;
                }

                if (item.priceMult === 1) {
                    totalCost = item.basePrice * countToBuy;
                } else {
                    const firstCost = item.basePrice * Math.pow(item.priceMult, currentCount);
                    totalCost = firstCost * (Math.pow(item.priceMult, countToBuy) - 1) / (item.priceMult - 1);
                }
            } else {
                const money = (typeof player !== 'undefined' && player) ? player.getBalance() : 0;
                if (item.priceMult === 1) {
                    countToBuy = Math.floor(money / item.basePrice);
                    totalCost = countToBuy * item.basePrice;
                } else {
                    // Geometric series inversion
                    // Cost = base * mult^current * (mult^k - 1) / (mult - 1)
                    // Solve for k
                    const term = 1 + (money * (item.priceMult - 1)) / (item.basePrice * Math.pow(item.priceMult, currentCount));
                    if (term <= 0) countToBuy = 0;
                    else countToBuy = Math.floor(Math.log(term) / Math.log(item.priceMult));
                    
                    // Recalculate precise cost
                    if (countToBuy > 0)
                        totalCost = item.basePrice * Math.pow(item.priceMult, currentCount) * (Math.pow(item.priceMult, countToBuy) - 1) / (item.priceMult - 1);
                    else 
                        totalCost = 0;
                }
            }
        } else {
            // Calculate cost for specific N
            if (item.priceMult === 1) {
                totalCost = item.basePrice * countToBuy;
            } else {
                const firstCost = item.basePrice * Math.pow(item.priceMult, currentCount);
                totalCost = firstCost * (Math.pow(item.priceMult, countToBuy) - 1) / (item.priceMult - 1);
            }
        }

        // Clamp rod purchases to max purchases and recalc cost if needed
        if (itemName === 'controlRod') {
            const maxBuy = Math.max(0, maxRodPurchases - currentCount);
            if (countToBuy > maxBuy) {
                countToBuy = maxBuy;
                if (countToBuy <= 0) return { count: 0, cost: 0 };

                if (item.priceMult === 1) {
                    totalCost = item.basePrice * countToBuy;
                } else {
                    const firstCost = item.basePrice * Math.pow(item.priceMult, currentCount);
                    totalCost = firstCost * (Math.pow(item.priceMult, countToBuy) - 1) / (item.priceMult - 1);
                }
            }
        }

        // Clamp water flow purchases to max upgrades and recalc cost if needed
        if (itemName === 'waterFlow') {
            const maxBuy = Math.max(0, maxWaterFlowUpgrades - currentCount);
            if (countToBuy > maxBuy) {
                countToBuy = maxBuy;
                if (countToBuy <= 0) return { count: 0, cost: 0 };

                if (item.priceMult === 1) {
                    totalCost = item.basePrice * countToBuy;
                } else {
                    const firstCost = item.basePrice * Math.pow(item.priceMult, currentCount);
                    totalCost = firstCost * (Math.pow(item.priceMult, countToBuy) - 1) / (item.priceMult - 1);
                }
            }
        }

        // Safety for insane numbers or zero
        if (countToBuy < 0) countToBuy = 0;
        if (totalCost < 0) totalCost = 0;

        return { count: countToBuy, cost: totalCost };
    }

    // Backward compatibility if needed, or used for display of single unit
    getPrice(itemName) { 
        return this.getPurchaseInfo(itemName).cost;
    }

    buy(itemName) {
        const info = this.getPurchaseInfo(itemName);
        if (info.count <= 0) return false;

        if (typeof player !== 'undefined' && player && (settings.cheatMode || player.spend(info.cost))) {
            console.log(`Bought ${info.count} ${itemName}(s) for ${info.cost}`);
            
            for(let i = 0; i < info.count; i++) {
                this.applyItemEffect(itemName);
            }
            return true;
        }
        return false;
    }

    applyItemEffect(itemName) {
        switch (itemName) {
            case 'atom':
                // Find first available atom that isn't active
                let atom = uraniumAtoms.find(a => !a.hasAtom);
                if (atom) atom.hasAtom = true;
                break;
            case 'group':
                // Logic for buying a group placeholder
                break;
            case 'controlRod':
                if (typeof applyControlRodPurchase === 'function') applyControlRodPurchase();
                break;
            case 'waterFlow':
                if (player && typeof player.waterFlowUpgradeCount === 'number') {
                    if (player.waterFlowUpgradeCount < player.waterFlowUpgradeMax) {
                        player.waterFlowUpgradeCount += 1;
                        player.upgrades.waterFlow = player.waterFlowUpgradeCount;
                        if (typeof player.updateWaterFlowLimits === 'function') player.updateWaterFlowLimits();
                        settings.waterFlowSpeed = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowSpeed));
                    }
                }
                break;
        }
    }

    serialize() {
        return {
            buyAmount: this.buyAmount
        };
    }

    deserialize(obj) {
        if (!obj) return;
        this.buyAmount = obj.buyAmount || 1;
    }
}
window.Shop = Shop;
