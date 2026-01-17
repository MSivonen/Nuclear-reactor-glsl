class Water {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.temperature = 25;
        this.specificHeatCapacity = 4186;
        this.mass = 0.1;
        this.heatDissipationRate = 0.5;
    }

    update() {

    }

    draw(img) {
        img.noStroke();
        let coolColor = color(22, 88, 90, 0);
        let hotColor = color(224, 255, 255, 200);
        let t = map(this.temperature, 25, 700, 0, 1);
        this.color = lerpColor(coolColor, hotColor, t);
        img.fill(this.color);
        img.rectMode(CENTER);
        img.rect(this.position.x, this.position.y, uraniumAtomsSpacingX * 1.02, uraniumAtomsSpacingY * 1.02);
    }
}

function updateWaterCells() {
    const temperatureChanges = {};
    for (let y = 0; y < uraniumAtomsCountY; y++) {
        for (let x = 0; x < uraniumAtomsCountX; x++) {
            let index = x + y * uraniumAtomsCountX;
            const cell = waterCells[index];
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let dir of directions) {
                let nx = x + dir[0];
                let ny = y + dir[1];
                if (nx >= 0 && nx < uraniumAtomsCountX && ny >= 0 && ny < uraniumAtomsCountY) {
                    let neighborIndex = nx + ny * uraniumAtomsCountX;
                    const neighbor = waterCells[neighborIndex];
                    if (neighbor.temperature > cell.temperature) {
                        const dT = (heatTransferCoefficient) * (neighbor.temperature - cell.temperature);
                        // Store the temperature change for both cells in the temperatureChanges object
                        const key = `${x}-${y}`;
                        if (!(key in temperatureChanges)) {
                            temperatureChanges[key] = 0;
                        }
                        temperatureChanges[key] += dT;
                        const neighborKey = `${nx}-${ny}`;
                        if (!(neighborKey in temperatureChanges)) {
                            temperatureChanges[neighborKey] = 0;
                        }
                        temperatureChanges[neighborKey] -= dT;
                    }
                }
            }
        }
    }

    // Loop over all cells in the grid again and update their temperatures based on the calculated changes
    for (let y = 0; y < uraniumAtomsCountY; y++) {
        for (let x = 0; x < uraniumAtomsCountX; x++) {
            let index = x + y * uraniumAtomsCountX;
            const cell = waterCells[index];
            const key = `${x}-${y}`;
            if (key in temperatureChanges) {
                cell.temperature += temperatureChanges[key];
            }
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
                cell.temperature = cell.temperature * (1 - waterFlowSpeed) + imaginaryRowValue * waterFlowSpeed;
            } else if (y == 0) {
                // For the top row, just move the temperature upwards without interpolation
                cell.temperature = waterCells[index + uraniumAtomsCountX].temperature;
            } else {
                // For other rows, interpolate with the cell directly below
                let belowIndex = x + (y + 1) * uraniumAtomsCountX; // Calculate the position of the cell below in the array
                const belowCell = waterCells[belowIndex]; // Get the cell object below

                const newTemperature = cell.temperature * (1 - waterFlowSpeed) + belowCell.temperature * waterFlowSpeed;
                //belowCell.temperature = cell.temperature * waterFlowSpeed + belowCell.temperature * (1 - waterFlowSpeed);
                cell.temperature = newTemperature;
            }
        }
    }
}
