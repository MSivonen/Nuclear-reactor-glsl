class Shop {
    constructor() {
        this.items = {
            atom: {
                name: "Add Atom",
                basePrice: 50,
                priceMult: 1.2
            },
            group: {
                name: "Add Group",
                basePrice: 5000,
                priceMult: 2.5
            },
            controlRod: {
                name: "Control Rod",
                basePrice: 2000,
                priceMult: 3.0
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
                return controlRods.length;
            case 'waterFlow':
                return (typeof player !== 'undefined' && player && player.upgrades && player.upgrades.waterFlow) ? player.upgrades.waterFlow : 0;
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

        if (countToBuy === 'MAX') {
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
        } else {
            // Calculate cost for specific N
            if (item.priceMult === 1) {
                totalCost = item.basePrice * countToBuy;
            } else {
                const firstCost = item.basePrice * Math.pow(item.priceMult, currentCount);
                totalCost = firstCost * (Math.pow(item.priceMult, countToBuy) - 1) / (item.priceMult - 1);
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

        if (typeof player !== 'undefined' && player && player.spend(info.cost)) {
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
                 // Placeholder
                break;
            case 'waterFlow':
                if (!player.upgrades.waterFlow) player.upgrades.waterFlow = 0;
                player.upgrades.waterFlow++;
                settings.waterFlowSpeed += 0.05;
                break;
        }
    }
}
window.Shop = Shop;
