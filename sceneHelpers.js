function initShadersAndGL() {
    glShit.gameCanvas = document.getElementById("gameCanvas");
    glShit.gameCanvas.width = screenWidth;
    glShit.gameCanvas.height = screenHeight;

    gl = glShit.gameCanvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: true,
    });

    glShit.waterGL = gl;
    glShit.simGL = gl;
    glShit.coreGL = gl;

    glShit.waterCanvas = glShit.gameCanvas;
    glShit.simCanvas = glShit.gameCanvas;
    glShit.coreCanvas = glShit.gameCanvas;

    gl.getExtension("EXT_color_buffer_float");

    waterLayer.init(gl, glShit.shaderCodes.waterVertCode, glShit.shaderCodes.waterFragCode);

    glShit.simProgram = createProgram(gl, glShit.shaderCodes.simVertCode, glShit.shaderCodes.simFragCode);
    glShit.reportProgram = createProgram(gl, glShit.shaderCodes.reportVertCode, glShit.shaderCodes.reportFragCode);
    glShit.explosionProgram = createProgram(gl, glShit.shaderCodes.explosionVertCode, glShit.shaderCodes.explosionFragCode);
    glShit.neutronLightProgram = createProgram(gl, glShit.shaderCodes.rendVertCode, glShit.shaderCodes.neutronLightFragCode);
    glShit.lightVectorProgram = createProgram(gl, glShit.shaderCodes.simVertCode, glShit.shaderCodes.lightVectorFragCode);
    glShit.specialLightProgram = createProgram(gl, glShit.shaderCodes.atomsVertCode, glShit.shaderCodes.specialLightFragCode);
    glShit.uNeutronsLoc = gl.getUniformLocation(glShit.simProgram, "u_neutrons");

    glShit.readTex = neutron.createTexture(gl, neutron.buffer);
    glShit.writeTex = neutron.createTexture(gl, null);

    glShit.readFBO = createFBO(gl, glShit.readTex);
    glShit.writeFBO = createFBO(gl, glShit.writeTex);

    glShit.atomMaskTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glShit.atomMaskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        uraniumAtomsCountX,
        uraniumAtomsCountY,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    glShit.atomMaskData = new Uint8Array(uraniumAtomsCountX * uraniumAtomsCountY * 4);

    initRenderShader(gl, glShit.shaderCodes.rendVertCode, glShit.shaderCodes.rendFragCode);
    reportSystem.init(gl);

    // Light map setup (1/8 resolution)
    const lw = Math.floor(screenSimWidth / 8);
    const lh = Math.floor(screenHeight / 8);
    glShit.lightTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glShit.lightTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, lw, lh, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    glShit.lightFBO = createFBO(gl, glShit.lightTex);

    glShit.vectorFieldTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glShit.vectorFieldTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, lw, lh, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    glShit.vectorFieldFBO = createFBO(gl, glShit.vectorFieldTex);

    atomsRenderer.init(
        gl,
        uraniumAtomsCountX * uraniumAtomsCountY,
        glShit.shaderCodes.atomsVertCode,
        glShit.shaderCodes.atomsFragCode
    );
    glShit.useInstancedAtoms = true;

    glShit.atomsCoreRenderer = new AtomsRenderer();
    glShit.atomsCoreRenderer.init(
        gl,
        uraniumAtomsCountX * uraniumAtomsCountY,
        glShit.shaderCodes.atomsVertCode,
        glShit.shaderCodes.atomsCoreFragCode
    );
    glShit.useCoreAtoms = true;

    specialRenderer.init(
        gl,
        16,
        glShit.shaderCodes.specialVertCode,
        glShit.shaderCodes.specialFragCode
    );

    rodsRenderer.init(
        gl,
        64, 
        glShit.shaderCodes.rodsVertCode,
        glShit.shaderCodes.rodsFragCode
    );

    steamRenderer.init(
        gl,
        uraniumAtomsCountX * uraniumAtomsCountY,
        glShit.shaderCodes.steamVertCode,
        glShit.shaderCodes.steamFragCode
    );
    glShit.useGpuSteam = true;

    bubblesRenderer.init(
        gl,
        5000,
        glShit.shaderCodes.bubblesVertCode,
        glShit.shaderCodes.bubblesFragCode
    );
}

function initSimulationObjects() {
    controlRodSlotXs = [];
    controlRods = new Array(controlRodCount).fill(null);
    controlRodPurchaseCount = 0;
    controlRodUpgradeLevels = [];

    for (let y = 0; y < uraniumAtomsCountY; y++) {
        for (let x = 0; x < uraniumAtomsCountX; x++) {
            let waterCellX = x * uraniumAtomsSpacingX;
            let waterCellY = y * uraniumAtomsSpacingY;
            waterCells.push(new Water(waterCellX + uraniumAtomsSpacingX / 2, waterCellY + uraniumAtomsSpacingY / 2));
        }
    }
    waterSystem = new WaterSystem();
    waterSystem.init(waterCells);

    let groupIndex = 0;
    let colInGroup = 0;
    for (let x = 0; x < uraniumAtomsCountX; x++) {
        if ((x + 1) % 7 === 0) {
            controlRodSlotXs.push(x * uraniumAtomsSpacingX + controlRodWidth / 2);
            groupIndex += 1;
            colInGroup = 0;
        } else {
            for (let y = 0; y < uraniumAtomsCountY; y++) {
                let waterCellIndex = x + y * uraniumAtomsCountX;
                let waterCell = waterCells[waterCellIndex];
                let uraniumX = x * uraniumAtomsSpacingX + uraniumAtomsSpacingX / 2;
                let uraniumY = y * uraniumAtomsSpacingY + uraniumAtomsSpacingY / 2;
                let atom = new UraniumAtom(uraniumX, uraniumY, waterCell, false, groupIndex);
                atom.index = x + y * uraniumAtomsCountX;
                atom.colInGroup = colInGroup;
                atom.rowInGroup = y;
                uraniumAtoms.push(atom);
            }
            colInGroup += 1;
        }
    }

    buildAtomGroups();

    for (let i = 0; i < controlRodCount; i++) {
        const slotX = controlRodSlotXs[i];
        controlRods[i] = new ControlRod(slotX, controlRodsStartPos);
    }

    grid = new Grid(uraniumAtomsSpacingX);
    for (let atom of uraniumAtoms) {
        grid.addAtom(atom);
    }
}

function initUiObjects() {
    ui.powerMeter = new PowerMeter(globalScale * 730, globalScale * 530);
    ui.tempMeter = new TempMeter(globalScale * 600, globalScale * 530);
    ui.controlSlider = new ControlRodsSlider();
    ui.canvas = new UICanvas();

    uiOverlay.init(gl);
}



function updateScene() {
    audioManager.update(deltaTime, settings, energyOutput, paused, game.boomValue);

    // Update neutrons in GPU
    neutron.update(glShit.simGL);
    reportSystem.process(glShit.simGL);
    let totalHeat = 0;
    uraniumAtoms.forEach(s => {
        s.update();
        if (s.hasAtom) totalHeat += s.heat;
    });
    window.avgTemp = uraniumAtoms.length > 0 ? totalHeat / uraniumAtoms.length : 0;
    controlRods.forEach(rod => rod.update());
    if (plutonium) plutonium.update();
    if (californium) californium.update();

    energyThisFrame = waterSystem.update(deltaTime, settings);

    let dt = deltaTime / 1000.0;
    if (dt <= 0) dt = 1.0 / 60.0;
    energyOutputCounter += energyThisFrame * dt;
    ui.accumulatedTime += dt;
    ui.powerMeter.update();
    ui.tempMeter.update();
    oncePerSecond();

    // Smooth neutron size toward target over ~5 seconds
    if (typeof settings.targetNeutronSize !== 'undefined') {
        let sec = deltaTime / 1000.0;
        if (sec <= 0) sec = 1.0 / 60.0;
        const smoothTime = 5.0; // seconds to reach target
        const frac = Math.min(1.0, sec / smoothTime);
        settings.neutronSize += (settings.targetNeutronSize - settings.neutronSize) * frac;
    }
}

function drawScene() {
    const gl = glShit.waterGL; // They are all the same now

    // 1. Generate Light Map from Neutrons
    neutron.drawLightPass(gl);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.gameCanvas.width, glShit.gameCanvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const simX = SHOP_WIDTH;
    const simW = screenSimWidth;
    const simH = screenHeight;

    const vidSettings = ui.canvas.uiSettings.video;

    if (vidSettings.waterEffect) {
        gl.viewport(simX, 0, simW, simH);
        gl.disable(gl.BLEND);
        renderWaterLayer();
    }
    
    gl.viewport(simX, 0, simW, simH);
    renderAtomCoreLayer();

    gl.viewport(simX, 0, simW, simH);
    renderSpecialLayer();

    gl.viewport(simX, 0, simW, simH);
    renderRodsLayer();

    if (vidSettings.bubbles) {
        gl.viewport(simX, 0, simW, simH);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderBubblesLayer();
    }


    if (vidSettings.steam) {
        gl.viewport(simX, 0, simW, simH);
        renderSteamLayer();
    }

    if (vidSettings.atomGlow) {
        gl.viewport(simX, 0, simW, simH);
        gl.blendFunc(gl.ONE, gl.ONE);
        renderAtomGlowLayer();
    }

    const showNeutrons = vidSettings.neutrons && vidSettings.neutrons.enabled;
    if (showNeutrons) {
        gl.viewport(simX, 0, simW, simH);
        renderNeutronLayer();
    }

    if (boom) {
        gl.viewport(simX, 0, simW, simH);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderExplosionLayer();
    }

    ui.canvas.drawBorders();
    ui.canvas.drawUi();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.gameCanvas.width, glShit.gameCanvas.height);
    uiOverlay.render(gl, ui.canvas.canvas);
}
function renderExplosionLayer() {
    if (!boom) return;
    const gl = glShit.simGL;
    const simX = SHOP_WIDTH;
    const simW = screenSimWidth;
    const simH = screenHeight;

    gl.useProgram(glShit.explosionProgram);

    // Set uniforms
    const u_resolution = gl.getUniformLocation(glShit.explosionProgram, "u_resolution");
    gl.uniform2f(u_resolution, simW, simH);
    const u_viewportX = gl.getUniformLocation(glShit.explosionProgram, "u_viewportX");
    gl.uniform1f(u_viewportX, simX);
    const u_viewportY = gl.getUniformLocation(glShit.explosionProgram, "u_viewportY");
    gl.uniform1f(u_viewportY, 0);
    const u_time = gl.getUniformLocation(glShit.explosionProgram, "u_time");
    gl.uniform1f(u_time, renderTime);
    const u_shopWidth = gl.getUniformLocation(glShit.explosionProgram, "u_shopWidth");
    gl.uniform1f(u_shopWidth, SHOP_WIDTH);
    const u_elapsed = gl.getUniformLocation(glShit.explosionProgram, "u_elapsed");
    let elapsed = 0;
    if (boomStartTime > 0) {
        elapsed = (renderTime - boomStartTime) / 2.0;
        if (elapsed > 1.0) elapsed = 1.0;
    }
    gl.uniform1f(u_elapsed, elapsed);

    drawFullscreenQuad(gl);
}
function renderWaterLayer() {
    waterLayer.render(renderTime);
}

function renderBubblesLayer() {
    bubblesRenderer.updateSpeeds(settings.waterFlowSpeed, renderTime);
    bubblesRenderer.render(screenSimWidth, screenHeight, renderTime);
}

function renderSpecialLayer() {
    const items = [];
    if (plutonium) items.push(plutonium);
    if (californium) items.push(californium);
    const activeCount = specialRenderer.updateInstances(items);
    specialRenderer.draw(activeCount, { blendMode: 'alpha' });
}

function renderRodsLayer() {
    const activeCount = rodsRenderer.updateInstances(controlRods, ui.controlSlider);
    rodsRenderer.draw(activeCount);
}

function renderSteamLayer() {
    if (!glShit.useGpuSteam) return;
    steamRenderer.updateInstances(waterCells);
    steamRenderer.draw();
}

function renderAtomCoreLayer() {
    if (!glShit.useCoreAtoms || !glShit.atomsCoreRenderer) return;
    const activeCount = glShit.atomsCoreRenderer.updateInstances(uraniumAtoms);
    glShit.atomsCoreRenderer.draw(activeCount, { blendMode: 'alpha' });
}

function renderAtomGlowLayer() {
    if (!glShit.useInstancedAtoms) return;
    const activeCount = atomsRenderer.updateInstances(uraniumAtoms);
    atomsRenderer.draw(activeCount, { blendMode: 'additive' });
}

function renderNeutronLayer() {
    neutron.draw(glShit.simGL, { clear: false });
}