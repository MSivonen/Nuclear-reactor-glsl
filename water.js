class Water {
    constructor(x, y) {
        this.position = { x: x, y: y };
        this.temperature = 25;
        this.specificHeatCapacity = 4186;
        this.mass = 0.1;
        this.heatDissipationRate = 0.05;
    }

    update() {

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
        // Update the temperature of the water cells as they transfer heat to neighbors.
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

                // Right neighbor
                if (x + 1 < uraniumAtomsCountX) {
                    const neighborIndex = index + 1;
                    const dT = settings.heatTransferCoefficient * (this.waterCells[neighborIndex].temperature - cellTemp);
                    this.temperatureChanges[index] += dT;
                    this.temperatureChanges[neighborIndex] -= dT;
                }

                // Down neighbor
                if (y + 1 < uraniumAtomsCountY) {
                    const neighborIndex = index + uraniumAtomsCountX;
                    const dT = settings.heatTransferCoefficient * (this.waterCells[neighborIndex].temperature - cellTemp);
                    this.temperatureChanges[index] += dT;
                    this.temperatureChanges[neighborIndex] -= dT;
                }
            }
        }

        // Apply changes
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
        // Loop over all cells in the grid from bottom to top
        for (let y = uraniumAtomsCountY - 1; y >= 0; y--) {
            for (let x = 0; x < uraniumAtomsCountX; x++) {
                let index = x + y * uraniumAtomsCountX; // Calculate the position in the array using a one-dimensional index
                const cell = this.waterCells[index]; // Get the current cell object

                // If it's the bottom row, interpolate with the imaginary row value of 25
                if (y == uraniumAtomsCountY - 1) {
                    const imaginaryRowValue = 25;
                    cell.temperature = cell.temperature * (1 - settings.waterFlowSpeed) + imaginaryRowValue * settings.waterFlowSpeed;
                } else if (y == 0) {
                    // For the top row, just move the temperature upwards without interpolation
                    cell.temperature = this.waterCells[index + uraniumAtomsCountX].temperature;
                } else {
                    // For other rows, interpolate with the cell directly below
                    let belowIndex = x + (y + 1) * uraniumAtomsCountX; // Calculate the position of the cell below in the array
                    const belowCell = this.waterCells[belowIndex]; // Get the cell object below

                    const newTemperature = cell.temperature * (1 - settings.waterFlowSpeed) + belowCell.temperature * settings.waterFlowSpeed;
                    //belowCell.temperature = cell.temperature * waterFlowSpeed + belowCell.temperature * (1 - waterFlowSpeed);
                    cell.temperature = newTemperature;
                }
            }
        }
    }

    update(deltaTime, settings) {
        // Update water temperatures (conduction)
        this.updateConduction();

        // Capture top-row temperatures before upward flow
        const topCount = uraniumAtomsCountX;
        const topTemps = this.getTopRowTemps(topCount);

        // Move water upwards
        this.interpolateWaterCellsUpwards();

        // Compute calorimetric energy removed by outflow
        const fractionOut = settings.waterFlowSpeed;
        const inletTemp = (typeof settings.inletTemperature !== 'undefined') ? settings.inletTemperature : 15;
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

        // Convert to kW
        const dt = (typeof deltaTime !== 'undefined') ? (deltaTime / 1000.0) : (1.0 / 60.0);
        const powerW = totalJoulesOut / (dt > 0 ? dt : 1.0 / 60.0);
        return powerW / 1000.0; // physical kW
    }
}

function interpolateWaterCellsUpwards() {
    waterSystem.interpolateWaterCellsUpwards();
}