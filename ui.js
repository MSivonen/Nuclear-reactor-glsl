function setupInputEventListener(inputId, updateFunction) {
    const inputElement = document.getElementById(inputId);
    inputElement.addEventListener('input', () => {
        const newValue = parseFloat(inputElement.value);
        updateFunction(newValue);
    });
}

/* const controlRodTargetInput = document.getElementById('control-rod-target');
controlRodTargetInput.addEventListener('input', () => {
    const newTargetY = parseFloat(controlRodTargetInput.value);
    controlRods.forEach(controlRod => {
        controlRod.targetY = newTargetY;
    });
}); */

// Usage
setupInputEventListener('decay-probability', value => decayProbability = value);
setupInputEventListener('collision-probability', value => collisionProbability = value);
setupInputEventListener('neutron-speed', value => neutronSpeed = value);
setupInputEventListener('controlRodAbsorption', value => controlRodAbsorptionProbability = value);

let totalNeutrons = 0;
let decayNeutrons = 0;
let collisionNeutrons = 0;
let lastUpdateTime = performance.now();
let collisionsThisSecond = 0; // Initialize outside of updateCounters
function updateCounters() {
    const totalNeutronsElement = document.getElementById('total-neutrons');
    totalNeutrons = decayNeutrons + collisionNeutrons;
    totalNeutronsElement.innerText = `Total Neutrons: ${neutronSystem.count}`;

    //decayNeutrons = neutrons.filter(neutron => neutron.origin === 'decay').length;
    const decayNeutronsElement = document.getElementById('decay-neutrons');
    decayNeutronsElement.innerText = `Decay Neutrons: ${decayNeutrons}`;

    //collisionNeutrons = neutrons.filter(neutron => neutron.origin === 'collision').length;
    const collisionNeutronsElement = document.getElementById('collision-neutrons');
    collisionNeutronsElement.innerText = `Collision Neutrons: ${collisionNeutrons}`;

    document.getElementById("energy-output").innerText = "Energy output: " + (energyOutput).toFixed(2) + " kW";
    document.getElementById("energy-this-frame").innerText = "Energy this frame: " + (energyThisFrame).toFixed(2) + " kW";


    const collisionsPerSecondElement = document.getElementById('collisions-per-second');
    const currentTime = performance.now();
    const timeSinceLastUpdate = (currentTime - lastUpdateTime) / 1000; // Convert to seconds

    if (timeSinceLastUpdate >= 1) {
        const collisionsPerSecond = collisionsThisSecond / timeSinceLastUpdate;
        collisionsPerSecondElement.innerText = `Collisions per Second: ${collisionsPerSecond.toFixed(2)}`;
        lastUpdateTime = currentTime; // Reset the last update time
        collisionsThisSecond = 0; // Reset the collision count for this second
    }

}

function initializeControls() {
    const collisionProbabilityInput = document.getElementById('collision-probability');
    const neutronSpeedInput = document.getElementById('neutron-speed');
    const decayProbabilityInput = document.getElementById('decay-probability');
    const controlRodTargetInput = document.getElementById('control-rod-target');
    const controlRodAbsorptionInput = document.getElementById('controlRodAbsorption');

    controlRodTargetInput.value = controlRods[0].targetY;
    collisionProbabilityInput.value = collisionProbability;
    neutronSpeedInput.value = neutronSpeed;
    decayProbabilityInput.value = decayProbability;
    controlRodAbsorptionInput.value = controlRodAbsorptionProbability;

}



