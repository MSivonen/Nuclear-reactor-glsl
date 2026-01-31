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