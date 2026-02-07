class Water {
    constructor(x, y) {
        this.position = { x: x, y: y };
        this.temperature = 25;
        this.specificHeatCapacity = 4186;
        this.mass = 0.1;
        this.heatDissipationRate = 0.05;
    }
}

class WaterSystem {
    constructor() {
        this.waterCells = [];
        this.temperatureChanges = null;
    }

    init(cells) {
        this.waterCells = cells;
    }

    updateConduction() {
        const count = uraniumAtomsCountX * uraniumAtomsCountY;
        if (!this.temperatureChanges || this.temperatureChanges.length !== count) {
            this.temperatureChanges = new Float32Array(count);
        }
        this.temperatureChanges.fill(0);

        for (let y = 0; y < uraniumAtomsCountY; y++) {
            const row = y * uraniumAtomsCountX;
            for (let x = 0; x < uraniumAtomsCountX; x++) {
                const index = row + x;
                const cellTemp = this.waterCells[index].temperature;
                if (x + 1 < uraniumAtomsCountX) {
                    const neighborIndex = index + 1;
                    const dT = settings.heatTransferCoefficient * (this.waterCells[neighborIndex].temperature - cellTemp);
                    this.temperatureChanges[index] += dT;
                    this.temperatureChanges[neighborIndex] -= dT;
                }
                if (y + 1 < uraniumAtomsCountY) {
                    const neighborIndex = index + uraniumAtomsCountX;
                    const dT = settings.heatTransferCoefficient * (this.waterCells[neighborIndex].temperature - cellTemp);
                    this.temperatureChanges[index] += dT;
                    this.temperatureChanges[neighborIndex] -= dT;
                }
            }
        }
        for (let i = 0; i < count; i++) {
            this.waterCells[i].temperature += this.temperatureChanges[i];
        }
    }

    getTopRowTemps(topCount) {
        const topTemps = new Float32Array(topCount);
        for (let x = 0; x < topCount; x++) {
            const index = x + 0 * uraniumAtomsCountX;
            topTemps[x] = this.waterCells[index].temperature;
        }
        return topTemps;
    }

    interpolateWaterCellsUpwards() {
        for (let y = uraniumAtomsCountY - 1; y >= 0; y--) {
            for (let x = 0; x < uraniumAtomsCountX; x++) {
                let index = x + y * uraniumAtomsCountX;
                const cell = this.waterCells[index];

                if (y == uraniumAtomsCountY - 1) {
                    const imaginaryRowValue = 25;
                    cell.temperature = cell.temperature * (1 - settings.waterFlowSpeed) + imaginaryRowValue * settings.waterFlowSpeed;
                } else if (y == 0) {
                    cell.temperature = this.waterCells[index + uraniumAtomsCountX].temperature;
                } else {
                    let belowIndex = x + (y + 1) * uraniumAtomsCountX;
                    const belowCell = this.waterCells[belowIndex];

                    const newTemperature = cell.temperature * (1 - settings.waterFlowSpeed) + belowCell.temperature * settings.waterFlowSpeed;
                    cell.temperature = newTemperature;
                }
            }
        }
    }

    update(deltaTime, settings) {
        this.updateConduction();
        const topCount = uraniumAtomsCountX;
        const topTemps = this.getTopRowTemps(topCount);
        this.interpolateWaterCellsUpwards();
        const fractionOut = settings.waterFlowSpeed;
        const inletTemp = settings.inletTemperature;
        const baselineTemp = 25;
        const effectiveInletTemp = Math.max(inletTemp, baselineTemp);
        let totalJoulesOut = 0;
        for (let x = 0; x < topCount; x++) {
            const index = x + 0 * uraniumAtomsCountX;
            const T_out = topTemps[x];
            const massMoved = fractionOut * (this.waterCells[index].mass || 0.1);
            const c = (this.waterCells[index].specificHeatCapacity || 4186);
            const deltaT = T_out - effectiveInletTemp;
            const effectiveDeltaT = Math.max(0, deltaT);
            const heatBoost = Math.pow(effectiveDeltaT, 1.08);
            const dE = massMoved * c * heatBoost;
            totalJoulesOut += dE / 1000;
        }
        const dt = deltaTime / 1000.0;
        const powerW = totalJoulesOut / (dt > 0 ? dt : 1.0 / 60.0);
        return powerW / 1000.0;
    }
}