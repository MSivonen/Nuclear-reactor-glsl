function updateCountersHTML() {
    document.getElementById("energy-output").innerText = "Energy output: " + (energyOutput).toFixed(2) + " kW";
    document.getElementById("energy-this-frame").innerText = "Energy this frame: " + (energyThisFrame).toFixed(2) + " kW";

    const collisionsPerSecondElement = document.getElementById('collisions-per-second');
    const currentTime = performance.now();
    const timeSinceLastUpdate = (currentTime - ui.lastUpdateTime) / 1000; // Convert to seconds

    if (timeSinceLastUpdate >= 1) {
        const collisionsPerSecond = ui.collisionsThisSecond / timeSinceLastUpdate;
        collisionsPerSecondElement.innerText = `Collisions per Second: ${collisionsPerSecond.toFixed(2)}`;
        ui.lastUpdateTime = currentTime; // Reset the last update time
        ui.collisionsThisSecond = 0; // Reset the collision count for this second
    }
}

function initializeControls() {
    const collisionProbabilityInput = document.getElementById('collision-probability');
    const neutronSpeedInput = document.getElementById('neutron-speed');
    const decayProbabilityInput = document.getElementById('decay-probability');
    const controlRodTargetInput = document.getElementById('control-rod-target');
    const controlRodAbsorptionInput = document.getElementById('controlRodAbsorption');

    if (controlRodTargetInput && controlRods && controlRods.length > 0) {
        controlRodTargetInput.value = controlRods[0].targetY;
    }
    if (collisionProbabilityInput) collisionProbabilityInput.value = settings.collisionProbability;
    if (neutronSpeedInput) neutronSpeedInput.value = settings.neutronSpeed;
    if (decayProbabilityInput) decayProbabilityInput.value = settings.decayProbability;
    if (controlRodAbsorptionInput) controlRodAbsorptionInput.value = settings.controlRodAbsorptionProbability;
}