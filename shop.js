class Shop {
    constructor() {
        this.items = {
            atom: {
                name: "Uranium",
                basePrice: 5,
                priceMult: 1.01
            },
            group: {
                name: "Uranium Group",
                basePrice: 5000,
                priceMult: 10
            },
            moderator: {
                name: "Moderator",
                basePrice: 10,
                priceMult: 1.3
            },
            moderatorUpgrade: {
                name: "Moderator Upgrade",
                basePrice: 50,
                priceMult: 1.2
            },
            waterFlow: {
                name: "Water Flow",
                basePrice: 100,
                priceMult: 1.5
            },
            plutonium: {
                name: "Plutonium",
                basePrice: 1,
                priceMult: 1.8
            },
            californium: {
                name: "Californium",
                basePrice: 15,
                priceMult: 1.8
            }
        };
        this.itemUnlocked = {
            atom: false,
            group: false,
            moderator: false,
            moderatorUpgrade: false,
            waterFlow: false,
            plutonium: false,
            californium: false
        };
        this.buyAmount = 1;
        this.targetAtomGroupIndex = 0;
    }

    setItemUnlocked(itemName, isUnlocked) {
        if (!Object.prototype.hasOwnProperty.call(this.itemUnlocked, itemName)) return;
        this.itemUnlocked[itemName] = !!isUnlocked;
    }

    isItemUnlocked(itemName) {
        if (!Object.prototype.hasOwnProperty.call(this.itemUnlocked, itemName)) return true;
        return !!this.itemUnlocked[itemName];
    }

    setBuyAmount(amount) {
        if ([1, 5, 10, 'MAX'].includes(amount)) {
            this.buyAmount = amount;
        }
    }

    setTargetAtomGroup(index) {
        const maxGroups = getAtomGroupCount();
        const parsed = parseInt(index);
        if (!isNaN(parsed) && parsed >= 0 && parsed < maxGroups) {
            this.targetAtomGroupIndex = parsed;
        }
    }

    getItemCount(itemName) {
         switch (itemName) {
            case 'atom':
                return getTotalAtomCount();
            case 'group':
                return player.ownedGroups.length;
            case 'moderator':
                return moderatorPurchaseCount;
            case 'moderatorUpgrade':
                return moderatorUpgradePurchaseCount;
            case 'waterFlow':
                return player.waterFlowUpgradeCount;
            case 'plutonium':
                return player.plutoniumUpgradeCount;
            case 'californium':
                return player.californiumUpgradeCount;
            default:
                return 0;
        }
    }

    getPurchaseInfo(itemName) {
        const item = this.items[itemName];
        if (!item) return { count: 0, cost: 0 };
        if (!this.isItemUnlocked(itemName)) return { count: 0, cost: 0 };

        const currentCount = this.getItemCount(itemName);
        let countToBuy = this.buyAmount;

        let totalCost = 0;

        const maxRodPurchases = (itemName === 'moderator') ? getMaxModeratorPurchases() : 0;
        const maxRodUpgradePurchases = (itemName === 'moderatorUpgrade') ? getMaxModeratorUpgradePurchases() : 0;
        const maxWaterFlowUpgrades = (itemName === 'waterFlow') ? player.waterFlowUpgradeMax : 0;
        const maxPlutoniumUpgrades = (itemName === 'plutonium') ? player.plutoniumUpgradeMax : 0;
        const maxCaliforniumUpgrades = (itemName === 'californium') ? player.californiumUpgradeMax : 0;

        if (itemName === 'moderator' && currentCount >= maxRodPurchases) {
            return { count: 0, cost: 0 };
        }

        if (itemName === 'moderatorUpgrade' && moderatorPurchaseCount <= 1) {
            return { count: 0, cost: 0 };
        }
        
        if (itemName === 'moderatorUpgrade' && currentCount >= maxRodUpgradePurchases) {
            return { count: 0, cost: 0 };
        }

        if (itemName === 'waterFlow' && currentCount >= maxWaterFlowUpgrades) {
            return { count: 0, cost: 0 };
        }

        if (itemName === 'plutonium' && currentCount >= maxPlutoniumUpgrades) {
            return { count: 0, cost: 0 };
        }

        if (itemName === 'californium' && currentCount >= maxCaliforniumUpgrades) {
            return { count: 0, cost: 0 };
        }

        if (itemName === 'group') {
            const maxGroups = getAtomGroupCount();
            if (currentCount >= maxGroups) return { count: 0, cost: 0 };
        }

        if (itemName === 'atom') {
            const groupIndex = this.targetAtomGroupIndex;
            const available = getGroupAvailableSlots(groupIndex);
            const owned = player.ownedGroups.includes(groupIndex);
            if (!owned || available <= 0) return { count: 0, cost: 0 };
        }

        if (countToBuy === 'MAX') {
            const cheatMode = settings.cheatMode;

            if (cheatMode) {
                if (itemName === 'atom') {
                    const groupIndex = this.targetAtomGroupIndex;
                    countToBuy = getGroupAvailableSlots(groupIndex);
                } else if (itemName === 'moderator') {
                    countToBuy = Math.max(0, maxRodPurchases - currentCount);
                } else if (itemName === 'moderatorUpgrade') {
                    countToBuy = Math.max(0, maxRodUpgradePurchases - currentCount);
                } else if (itemName === 'waterFlow') {
                    countToBuy = Math.max(0, maxWaterFlowUpgrades - currentCount);
                } else if (itemName === 'plutonium') {
                    countToBuy = Math.max(0, maxPlutoniumUpgrades - currentCount);
                } else if (itemName === 'californium') {
                    countToBuy = Math.max(0, maxCaliforniumUpgrades - currentCount);
                } else if (itemName === 'group') {
                    const maxGroups = getAtomGroupCount();
                    countToBuy = Math.max(0, maxGroups - currentCount);
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
                const money = player.getBalance();
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

        if (itemName === 'atom') {
            const groupIndex = this.targetAtomGroupIndex;
            const maxBuy = getGroupAvailableSlots(groupIndex);
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

        if (itemName === 'moderator') {
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

        if (itemName === 'moderatorUpgrade') {
            const maxBuy = Math.max(0, maxRodUpgradePurchases - currentCount);
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

        if (itemName === 'plutonium') {
            const maxBuy = Math.max(0, maxPlutoniumUpgrades - currentCount);
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

        if (itemName === 'californium') {
            const maxBuy = Math.max(0, maxCaliforniumUpgrades - currentCount);
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

        if (itemName === 'group') {
            const maxGroups = getAtomGroupCount();
            const maxBuy = Math.max(0, maxGroups - currentCount);
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

        if (countToBuy < 0) countToBuy = 0;
        if (totalCost < 0) totalCost = 0;

        return { count: countToBuy, cost: totalCost };
    }

    getPrice(itemName) { 
        return this.getPurchaseInfo(itemName).cost;
    }

    buy(itemName) {
        const info = this.getPurchaseInfo(itemName);
        if (info.count <= 0) return false;

        if (settings.cheatMode || player.spend(info.cost)) {
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
                addAtomsToGroup(this.targetAtomGroupIndex, 1);
                break;
            case 'group':
                const nextGroup = getNextUnlockableGroup();
                if (nextGroup !== null) {
                    unlockAtomGroup(nextGroup);
                }
                break;
            case 'moderator':
                applyModeratorPurchase();
                break;
            case 'moderatorUpgrade':
                if (moderatorPurchaseCount > 1) {
                    const ok = applyModeratorUpgradePurchase();
                    if (ok) {
                        player.moderatorUpgradeCount = moderatorUpgradePurchaseCount;
                    }
                }
                break;
            case 'waterFlow':
                if (player.waterFlowUpgradeCount < player.waterFlowUpgradeMax) {
                    player.waterFlowUpgradeCount += 1;
                    player.upgrades.waterFlow = player.waterFlowUpgradeCount;
                    player.updateWaterFlowLimits();
                    settings.waterFlowSpeed = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowSpeed));
                    settings.waterFlowTarget = Math.max(player.waterFlowMin, Math.min(player.waterFlowMax, settings.waterFlowTarget || settings.waterFlowSpeed));
                }
                break;
            case 'plutonium':
                if (player.plutoniumUpgradeCount < player.plutoniumUpgradeMax) {
                    player.plutoniumUpgradeCount += 1;
                    player.upgrades.plutonium = player.plutoniumUpgradeCount;
                    if (typeof plutonium !== 'undefined' && plutonium && typeof plutonium.syncFromPlayer === 'function') {
                        plutonium.syncFromPlayer();
                    }
                }
                break;
            case 'californium':
                if (player.californiumUpgradeCount < player.californiumUpgradeMax) {
                    player.californiumUpgradeCount += 1;
                    player.upgrades.californium = player.californiumUpgradeCount;
                    if (typeof californium !== 'undefined' && californium && typeof californium.syncFromPlayer === 'function') {
                        californium.syncFromPlayer();
                    }
                }
                break;
        }

        if (window.tutorialManager && typeof window.tutorialManager.notifyShopItem === 'function') {
            window.tutorialManager.notifyShopItem(itemName);
        }
    }

    serialize() {
        return {
            buyAmount: this.buyAmount,
            targetAtomGroupIndex: this.targetAtomGroupIndex,
            itemUnlocked: { ...this.itemUnlocked }
        };
    }

    deserialize(obj) {
        if (!obj) return;
        this.buyAmount = obj.buyAmount || 1;
        this.targetAtomGroupIndex = obj.targetAtomGroupIndex ?? 0;
        this.itemUnlocked = {
            atom: true,
            group: true,
            moderator: true,
            moderatorUpgrade: true,
            waterFlow: true,
            plutonium: true,
            californium: true,
            ...(obj.itemUnlocked || {})
        };
    }
}
window.Shop = Shop;
