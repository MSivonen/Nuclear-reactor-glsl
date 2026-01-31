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

    static update() {
        // Update the temperature of the water cells as they transfer heat to neighbors.
        const count = uraniumAtomsCountX * uraniumAtomsCountY;
        let temperatureChanges = Water.temperatureChanges;
        if (!temperatureChanges || temperatureChanges.length !== count) {
            temperatureChanges = new Float32Array(count);
            Water.temperatureChanges = temperatureChanges;
        }
        temperatureChanges.fill(0);

        for (let y = 0; y < uraniumAtomsCountY; y++) {
            const row = y * uraniumAtomsCountX;
            for (let x = 0; x < uraniumAtomsCountX; x++) {
                const index = row + x;
                const cellTemp = waterCells[index].temperature;

                // Right neighbor
                if (x + 1 < uraniumAtomsCountX) {
                    const neighborIndex = index + 1;
                    const dT = settings.heatTransferCoefficient * (waterCells[neighborIndex].temperature - cellTemp);
                    temperatureChanges[index] += dT;
                    temperatureChanges[neighborIndex] -= dT;
                }

                // Down neighbor
                if (y + 1 < uraniumAtomsCountY) {
                    const neighborIndex = index + uraniumAtomsCountX;
                    const dT = settings.heatTransferCoefficient * (waterCells[neighborIndex].temperature - cellTemp);
                    temperatureChanges[index] += dT;
                    temperatureChanges[neighborIndex] -= dT;
                }
            }
        }

        // Apply changes
        for (let i = 0; i < count; i++) {
            waterCells[i].temperature += temperatureChanges[i];
        }
    }

}

function interpolateWaterCellsUpwards() {
    // Loop over all cells in the grid from bottom to top
    for (let y = uraniumAtomsCountY - 1; y >= 0; y--) {
        for (let x = 0; x < uraniumAtomsCountX; x++) {
            let index = x + y * uraniumAtomsCountX; // Calculate the position in the array using a one-dimensional index
            const cell = waterCells[index]; // Get the current cell object

            // If it's the bottom row, interpolate with the imaginary row value of 25
            if (y == uraniumAtomsCountY - 1) {
                const imaginaryRowValue = 25;
                cell.temperature = cell.temperature * (1 - settings.waterFlowSpeed) + imaginaryRowValue * settings.waterFlowSpeed;
            } else if (y == 0) {
                // For the top row, just move the temperature upwards without interpolation
                cell.temperature = waterCells[index + uraniumAtomsCountX].temperature;
            } else {
                // For other rows, interpolate with the cell directly below
                let belowIndex = x + (y + 1) * uraniumAtomsCountX; // Calculate the position of the cell below in the array
                const belowCell = waterCells[belowIndex]; // Get the cell object below

                const newTemperature = cell.temperature * (1 - settings.waterFlowSpeed) + belowCell.temperature * settings.waterFlowSpeed;
                //belowCell.temperature = cell.temperature * waterFlowSpeed + belowCell.temperature * (1 - waterFlowSpeed);
                cell.temperature = newTemperature;
            }
        }
    }
}
