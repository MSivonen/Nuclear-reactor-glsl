function debug() {
    // show debug UI
    const panel = document.getElementById('debug-panel');
    if (panel) panel.style.display = 'block';

    //show html debug stuff

    //

    function setupInputEventListener(inputId, updateFunction) {
        const inputElement = document.getElementById(inputId);
        inputElement.addEventListener('input', () => {
            const newValue = parseFloat(inputElement.value);
            updateFunction(newValue);
        });
    }

    setupInputEventListener('decay-probability', value => settings.decayProbability = value);
    setupInputEventListener('collision-probability', value => settings.collisionProbability = value);
    setupInputEventListener('neutron-speed', value => settings.neutronSpeed = value);
    setupInputEventListener('controlRodAbsorption', value => settings.controlRodAbsorptionProbability = value);
}