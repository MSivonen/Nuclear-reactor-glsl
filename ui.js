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
    'debug-panel': null
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
    htmlShit.cached = true;
}

function updateCountersHTML() {
    cacheHtmlShit();
    if (htmlShit['energy-output']) {
        htmlShit['energy-output'].innerText = `Energy output: ${energyOutput.toFixed(2)} kW`;
    }
    if (htmlShit['energy-this-frame']) {
        htmlShit['energy-this-frame'].innerText = `Energy this frame: ${energyThisFrame.toFixed(2)} kW`;
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

class UICanvas {
    constructor() {
        this.width = 1067;
        this.height = 600;
        this.simWidth = 800;
        this.simXOffset = (this.width - this.simWidth) / 2;
        this.lastFrame = -1;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.id = "UI";

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.canvas);
        } else {
            console.warn('Canvas container not found, appending to body');
            document.body.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
    }

    ensureFrame() {
        if (this.lastFrame === frameCount) return;
        this.lastFrame = frameCount;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawBorders() {
        this.ensureFrame();
        drawBorders(this.ctx, this.simXOffset);
    }

    drawUi() {
        this.ensureFrame();
        controlRods.forEach(r => r.draw(this.ctx, this.simXOffset));
        if (ui.meter) ui.meter.draw(this.ctx, this.simXOffset);
        if (ui.controlSlider) ui.controlSlider.draw(this.ctx, this.simXOffset);
        drawFPS(this.ctx, this.simXOffset);
        gameOver(this.ctx, this.simXOffset);
    }
}

function drawBorders(ctx, offsetX = 0) {
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.fillRect(offsetX - screenRenderWidth, 0, screenRenderWidth, screenHeight);
    ctx.fillRect(offsetX + screenSimWidth, 0, screenRenderWidth, screenHeight);
    ctx.restore();
}

function drawFPS(ctx, offsetX) {
    ui.fpsText = Math.floor(ui.avgFps);

    const x = offsetX + 11;
    const y = 27;

    ctx.font = '30px HarryP, sans-serif';
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = 'black';
    ctx.fillText(ui.fpsText, x + 1, y + 1);

    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillText(ui.fpsText, x, y);
}

function gameOver(ctx, offsetX = 0) {
    if (!boom) return;
    if (mouseIsPressed && mouseButton === LEFT) {
        resetSimulation();
    }

    settings.collisionProbability = 0;
    const boomText = 'Boom mathafuka';

    const centerX = offsetX + screenSimWidth / 2;
    const centerY = screenHeight / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '142px HarryP, sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 10, centerY + (Math.random() - 0.5) * 10);

    ctx.font = '134px HarryP, sans-serif';
    ctx.fillStyle = 'rgba(144,238,144,0.9)';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 8, centerY + (Math.random() - 0.5) * 8);

    ctx.font = '132px HarryP, sans-serif';
    ctx.fillStyle = 'rgba(255,77,11,0.95)';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 6, centerY + (Math.random() - 0.5) * 6);

    ctx.font = '120px HarryP, sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(boomText, centerX + (Math.random() - 0.5) * 4, centerY + (Math.random() - 0.5) * 4);

    ctx.restore();
}