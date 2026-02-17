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

    moderatorsRenderer.init(
        gl,
        64, 
        glShit.shaderCodes.moderatorsVertCode,
        glShit.shaderCodes.moderatorsFragCode
    );

    steamRenderer.init(
        gl,
        uraniumAtomsCountX * uraniumAtomsCountY,
        glShit.shaderCodes.steamVertCode,
        glShit.shaderCodes.steamStampFragCode,
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
    moderatorSlotXs = [];
    moderators = new Array(moderatorCount).fill(null);
    moderatorPurchaseCount = 0;
    moderatorUpgradePurchaseCount = 0;
    moderatorUpgradeLevels = [];

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
            moderatorSlotXs.push(x * uraniumAtomsSpacingX + moderatorWidth / 2);
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

    for (let i = 0; i < moderatorCount; i++) {
        const slotX = moderatorSlotXs[i];
        moderators[i] = new Moderator(slotX, moderatorsStartPos);
    }

    grid = new Grid(uraniumAtomsSpacingX);
    for (let atom of uraniumAtoms) {
        grid.addAtom(atom);
    }
}

function initUiObjects() {
    ui.powerMeter = new PowerMeter(globalScale * 730, globalScale * 530);
    ui.tempMeter = new TempMeter(globalScale * 600, globalScale * 530);
    ui.controlSlider = new ModeratorsSlider();
    ui.canvas = new UICanvas();

    if (prestigeManager && typeof prestigeManager.applyCurrentLoopScaling === 'function') {
        prestigeManager.applyCurrentLoopScaling();
    }

    uiOverlay.init(gl);
}



function updateScene() {
    audioManager.update(deltaTime, settings, energyOutput, paused, game.boomValue);

    if (!Number.isFinite(settings.collisionProbability) || settings.collisionProbability <= 0) {
        settings.collisionProbability = defaultSettings.collisionProbability;
    }

    // Update neutrons in GPU
    neutron.update(glShit.simGL);
    reportSystem.process(glShit.simGL);
    let totalHeat = 0;
    uraniumAtoms.forEach(s => {
        s.update();
    });
        waterCells.forEach(cell => {
        totalHeat += cell.temperature;
    });
        window.avgTemp = waterCells.length > 0 ? totalHeat / waterCells.length : 0;

    moderators.forEach((mod, index) => {
        if (typeof isModeratorActive === 'function' && !isModeratorActive(index)) return;
        mod.update();
    });
    const plutoniumUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isItemUnlocked === 'function')
        || window.tutorialManager.isItemUnlocked('plutonium');
    if (plutoniumUnlocked && plutonium) plutonium.update();
    const californiumUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isItemUnlocked === 'function')
        || window.tutorialManager.isItemUnlocked('californium');
    if (californiumUnlocked && californium) californium.update();

    energyThisFrame = waterSystem.update(deltaTime, settings);

    let dt = deltaTime / 1000.0;
    if (dt <= 0) dt = 1.0 / 60.0;
    energyOutputCounter += energyThisFrame * dt;
    ui.accumulatedTime += dt;
    ui.powerMeter.update();
    ui.tempMeter.update();
    oncePerSecond();

    // Smooth neutron size toward target over 5 seconds to prevent flickering
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
    const scramCompleted = !(window.tutorialManager && typeof window.tutorialManager.hasCompleted === 'function')
        || window.tutorialManager.hasCompleted('scram_pressed_once');

    // 1. Generate Light Map from Neutrons
    const vidSettings = ui.canvas.uiSettings.video;
    const lightingEnabled = !!vidSettings.lighting && scramCompleted;
    if (lightingEnabled) {
        neutron.drawLightPass(gl);
        glShit.lightingPrev = true;
    } else {
        if (glShit.lightingPrev) {
            const lw = Math.floor(screenSimWidth / 8);
            const lh = Math.floor(screenHeight / 8);

            gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.lightFBO);
            gl.viewport(0, 0, lw, lh);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.vectorFieldFBO);
            gl.viewport(0, 0, lw, lh);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            glShit.lightingPrev = false;
        }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.gameCanvas.width, glShit.gameCanvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const simX = SHOP_WIDTH;
    const simW = screenSimWidth;
    const simH = screenHeight;

    if (scramCompleted && vidSettings.waterEffect) {
        gl.viewport(simX, 0, simW, simH);
        gl.disable(gl.BLEND);
        renderWaterLayer();
    }
    
    const showUraniumLayer = scramCompleted && (
        !(window.tutorialManager && typeof window.tutorialManager.shouldRenderLayer === 'function')
        || window.tutorialManager.shouldRenderLayer('uranium')
    );
    if (showUraniumLayer) {
        gl.viewport(simX, 0, simW, simH);
        renderAtomCoreLayer();
    }

    if (scramCompleted) {
        gl.viewport(simX, 0, simW, simH);
        renderSpecialLayer();
    }

    const showModeratorLayer = scramCompleted && (
        !(window.tutorialManager && typeof window.tutorialManager.shouldRenderLayer === 'function')
        || window.tutorialManager.shouldRenderLayer('moderators')
    );
    if (showModeratorLayer) {
        gl.viewport(simX, 0, simW, simH);
        renderModeratorsLayer();
    }

    if (scramCompleted && vidSettings.bubbles) {
        gl.viewport(simX, 0, simW, simH);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderBubblesLayer();
    }


    if (scramCompleted && vidSettings.steam) {
        gl.viewport(simX, 0, simW, simH);
        renderSteamLayer();
    }

    if (scramCompleted && vidSettings.atomGlow && showUraniumLayer) {
        gl.viewport(simX, 0, simW, simH);
        gl.blendFunc(gl.ONE, gl.ONE);
        renderAtomGlowLayer();
    }

    const showNeutrons = scramCompleted && vidSettings.neutrons && vidSettings.neutrons.enabled;
    const showNeutronLayer = !(window.tutorialManager && typeof window.tutorialManager.shouldRenderLayer === 'function')
        || window.tutorialManager.shouldRenderLayer('neutrons');
    if (showNeutrons && showNeutronLayer) {
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
    const plutoniumUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isItemUnlocked === 'function')
        || window.tutorialManager.isItemUnlocked('plutonium');
    if (plutoniumUnlocked && plutonium) items.push(plutonium);
    const californiumUnlocked = !(window.tutorialManager && typeof window.tutorialManager.isItemUnlocked === 'function')
        || window.tutorialManager.isItemUnlocked('californium');
    if (californiumUnlocked && californium) items.push(californium);
    const activeCount = specialRenderer.updateInstances(items);
    specialRenderer.draw(activeCount, { blendMode: 'alpha' });
}

function renderModeratorsLayer() {
    const activeCount = moderatorsRenderer.updateInstances(moderators, ui.controlSlider);
    moderatorsRenderer.draw(activeCount);
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