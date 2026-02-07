function debug() {
    // show debug UI
    cacheHtmlShit();
    const panel = htmlShit['debug-panel'];
    if (panel) panel.style.display = 'block';

    //show html debug stuff

    //

    function setupInputEventListener(inputId, updateFunction) {
        const inputElement = htmlShit[inputId] || document.getElementById(inputId);
        htmlShit[inputId] = inputElement;
        if (!inputElement) return;
        inputElement.addEventListener('input', () => {
            const newValue = parseFloat(inputElement.value);
            updateFunction(newValue);
        });
    }

    setupInputEventListener('decay-probability', value => settings.decayProbability = value);
    setupInputEventListener('collision-probability', value => settings.collisionProbability = value);
    setupInputEventListener('neutron-speed', value => settings.neutronSpeed = value);
    setupInputEventListener('controlRodAbsorption', value => settings.controlRodAbsorptionProbability = value);
    setupInputEventListener('controlRodHitProbability', value => settings.controlRodHitProbability = value);
}


const htmlShit = {
    'decay-probability': null,
    'collision-probability': null,
    'neutron-speed': null,
    'controlRodAbsorption': null,
    'controlRodHitProbability': null,
    'control-rod-target': null,
    'collisions-per-second': null,
    'energy-output': null,
    'energy-this-frame': null,
    'neutron-speed-display': null,
    'debug-panel': null,
    'link-rods': null
};

function cacheHtmlShit() {
    if (htmlShit.cached) return;
    htmlShit['decay-probability'] = document.getElementById('decay-probability');
    htmlShit['collision-probability'] = document.getElementById('collision-probability');
    htmlShit['neutron-speed'] = document.getElementById('neutron-speed');
    htmlShit['controlRodAbsorption'] = document.getElementById('controlRodAbsorption');
    htmlShit['controlRodHitProbability'] = document.getElementById('controlRodHitProbability');
    htmlShit['control-rod-target'] = document.getElementById('control-rod-target');
    htmlShit['collisions-per-second'] = document.getElementById('collisions-per-second');
    htmlShit['energy-output'] = document.getElementById('energy-output');
    htmlShit['energy-this-frame'] = document.getElementById('energy-this-frame');
    htmlShit['neutron-speed-display'] = document.getElementById('neutron-speed-display');
    htmlShit['debug-panel'] = document.getElementById('debug-panel');
    htmlShit['link-rods'] = document.getElementById('link-rods');
    htmlShit.cached = true;
}

function updateCountersHTML() {
    cacheHtmlShit();
    if (htmlShit['energy-output']) {
        // energyOutput is physical kW averaged over last second. Format as watts so SI prefixes read correctly (e.g. 5000 kW -> 5MW)
        if (typeof formatLarge === 'function') {
            htmlShit['energy-output'].innerText = `Energy output per second: ${formatLarge(energyOutput * 1000, 'W')}`;
        } else {
            htmlShit['energy-output'].innerText = `Energy output per second: ${energyOutput.toFixed(2)} kW`;
        }
    }

    const collisionsPerSecondElement = htmlShit['collisions-per-second'];
    const currentTime = performance.now();
    const timeSinceLastUpdate = (currentTime - ui.lastUpdateTime) / 1000;

    if (timeSinceLastUpdate >= 1 && collisionsPerSecondElement) {
        const collisionsPerSecond = ui.collisionsThisSecond / timeSinceLastUpdate;
        collisionsPerSecondElement.innerText = `Collisions per Second: ${collisionsPerSecond.toFixed(2)}`;
        ui.lastUpdateTime = currentTime;
        ui.collisionsThisSecond = 0;
    }

    if (htmlShit['energy-this-frame']) {
        const incomeVal = (typeof lastMoneyPerSecond === 'number') ? lastMoneyPerSecond : 0;
        const balanceVal = (typeof player !== 'undefined' && player && typeof player.getBalance === 'function') ? player.getBalance() : 0;
            const currencyUnit = String.fromCharCode(7745);
            if (typeof formatLarge === 'function') {
                htmlShit['energy-this-frame'].innerText = `Income: ${formatLarge(incomeVal, currencyUnit, 2)}/s   Balance: ${formatLarge(balanceVal, currencyUnit, 2)}`;
            } else {
                htmlShit['energy-this-frame'].innerText = `Income: ${Math.floor(incomeVal)}${currencyUnit}/s   Balance: ${Math.floor(balanceVal)}${currencyUnit}`;
        }
    }
}

function initializeControls() {
    cacheHtmlShit();
    const collisionProbabilityInput = htmlShit['collision-probability'];
    const neutronSpeedInput = htmlShit['neutron-speed'];
    const decayProbabilityInput = htmlShit['decay-probability'];
    const controlRodTargetInput = htmlShit['control-rod-target'];
    const controlRodAbsorptionInput = htmlShit['controlRodAbsorption'];
    const controlRodHitProbabilityInput = htmlShit['controlRodHitProbability'];

    if (controlRodTargetInput && controlRods && controlRods.length > 0) {
        controlRodTargetInput.value = controlRods[0].targetY;
    }
    if (collisionProbabilityInput) collisionProbabilityInput.value = settings.collisionProbability;
    if (neutronSpeedInput) neutronSpeedInput.value = settings.neutronSpeed;
    if (decayProbabilityInput) decayProbabilityInput.value = settings.decayProbability;
    if (controlRodAbsorptionInput) controlRodAbsorptionInput.value = settings.controlRodAbsorptionProbability;
    if (controlRodHitProbabilityInput) controlRodHitProbabilityInput.value = settings.controlRodHitProbability;
}