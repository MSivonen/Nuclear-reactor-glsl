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
        this.temps = null;
        this.topTemps = null;
    }

    init(cells) {
        this.waterCells = cells;
        const count = uraniumAtomsCountX * uraniumAtomsCountY;
        if (!this.temps || this.temps.length !== count) this.temps = new Float32Array(count);
        if (!this.temperatureChanges || this.temperatureChanges.length !== count) this.temperatureChanges = new Float32Array(count);
        if (!this.topTemps || this.topTemps.length !== uraniumAtomsCountX) this.topTemps = new Float32Array(uraniumAtomsCountX);
        for (let i = 0; i < count; i++) this.temps[i] = (this.waterCells[i] && Number.isFinite(this.waterCells[i].temperature)) ? this.waterCells[i].temperature : 25;
    }

    updateConduction() {
        const count = uraniumAtomsCountX * uraniumAtomsCountY;
        // Ensure buffers are allocated
        if (!this.temperatureChanges || this.temperatureChanges.length !== count) this.temperatureChanges = new Float32Array(count);
        this.temperatureChanges.fill(0);

        const temps = this.temps;
        const tChanges = this.temperatureChanges;
        const ht = settings.heatTransferCoefficient;

        for (let y = 0; y < uraniumAtomsCountY; y++) {
            const row = y * uraniumAtomsCountX;
            for (let x = 0; x < uraniumAtomsCountX; x++) {
                const index = row + x;
                const cellTemp = temps[index];
                if (x + 1 < uraniumAtomsCountX) {
                    const neighborIndex = index + 1;
                    const dT = ht * (temps[neighborIndex] - cellTemp);
                    tChanges[index] += dT;
                    tChanges[neighborIndex] -= dT;
                }
                if (y + 1 < uraniumAtomsCountY) {
                    const neighborIndex = index + uraniumAtomsCountX;
                    const dT = ht * (temps[neighborIndex] - cellTemp);
                    tChanges[index] += dT;
                    tChanges[neighborIndex] -= dT;
                }
            }
        }

        for (let i = 0; i < count; i++) {
            temps[i] += tChanges[i];
        }
    }

    getTopRowTemps(topCount) {
        // Reuse a preallocated buffer to avoid allocations
        if (!this.topTemps || this.topTemps.length < topCount) this.topTemps = new Float32Array(topCount);
        for (let x = 0; x < topCount; x++) {
            const index = x;
            this.topTemps[x] = this.temps[index];
        }
        return this.topTemps;
    }

    interpolateWaterCellsUpwards() {
        const frac = settings.waterFlowSpeed;
        const temps = this.temps;
        for (let y = uraniumAtomsCountY - 1; y >= 0; y--) {
            for (let x = 0; x < uraniumAtomsCountX; x++) {
                const index = x + y * uraniumAtomsCountX;

                if (y == uraniumAtomsCountY - 1) {
                    const imaginaryRowValue = 25;
                    temps[index] = temps[index] * (1 - frac) + imaginaryRowValue * frac;
                } else if (y == 0) {
                    temps[index] = temps[index + uraniumAtomsCountX];
                } else {
                    const belowIndex = x + (y + 1) * uraniumAtomsCountX;
                    temps[index] = temps[index] * (1 - frac) + temps[belowIndex] * frac;
                }
            }
        }
    }

    step(dtSeconds, settings) {
        // Sync temps from water cell objects (they may be modified by atoms)
        const cellCount = uraniumAtomsCountX * uraniumAtomsCountY;
        if (!this.temps || this.temps.length !== cellCount) this.temps = new Float32Array(cellCount);
        for (let i = 0; i < cellCount; i++) {
            this.temps[i] = (this.waterCells[i] && Number.isFinite(this.waterCells[i].temperature)) ? this.waterCells[i].temperature : 25;
        }

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
            const index = x;
            const T_out = topTemps[x];
            const massMoved = fractionOut * (this.waterCells[index].mass || 0.1);
            const c = (this.waterCells[index].specificHeatCapacity || 4186);
            const deltaT = T_out - effectiveInletTemp;
            const effectiveDeltaT = Math.max(0, deltaT);
            const heatBoost = Math.pow(effectiveDeltaT, 1.08);
            const dE = massMoved * c * heatBoost;
            totalJoulesOut += dE / 1000;
        }

        // Write temps back to water cell objects (one copy per step)
        for (let i = 0; i < cellCount; i++) {
            if (this.waterCells[i]) this.waterCells[i].temperature = this.temps[i];
        }

        const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? dtSeconds : (1.0 / 60.0);
        const powerW = totalJoulesOut / (dt > 0 ? dt : 1.0 / 60.0);
        return powerW / 1000.0;
    }
}