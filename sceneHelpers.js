// Helpers to cleanly initialize and run per-frame logic for the sketch

function initShadersAndGL() {
    gl = drawingContext;

    glShit.waterCanvas = document.getElementById("waterCanvas");
    if (glShit.waterCanvas) {
        glShit.waterCanvas.width = screenSimWidth;
        glShit.waterCanvas.height = screenHeight;
        glShit.waterCanvas.style.left = SHOP_WIDTH + 'px';
        glShit.waterGL = glShit.waterCanvas.getContext("webgl2", {
            alpha: false,
            depth: false,
            antialias: false,
            preserveDrawingBuffer: true,
            premultipliedAlpha: true,
        });
    }

    // Core canvas (normal alpha compositing)
    glShit.coreCanvas = document.getElementById("coreCanvas");
    glShit.coreCanvas.width = screenSimWidth;
    glShit.coreCanvas.height = screenHeight;
    glShit.coreCanvas.style.left = SHOP_WIDTH + 'px';
    glShit.coreGL = glShit.coreCanvas.getContext("webgl2", {
        alpha: true,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: false,
        premultipliedAlpha: true,
    });

    glShit.simCanvas = document.getElementById("simCanvas");
    glShit.simCanvas.width = screenSimWidth;
    glShit.simCanvas.height = screenHeight;
    glShit.simCanvas.style.left = SHOP_WIDTH + 'px';

    // Use an opaque (black) drawing buffer. The page composites simCanvas over the
    // p5 canvas using CSS `mix-blend-mode: screen`, so black means "no effect" and
    // we avoid dark halos from low-alpha source-over compositing.
    glShit.simGL = glShit.simCanvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: true,
    });

    // Ensure required extension present (no-op if not)
    glShit.simGL.getExtension("EXT_color_buffer_float");
    if (glShit.waterGL) glShit.waterGL.getExtension("EXT_color_buffer_float");

    // Initialize water background layer (fullscreen shader)
    if (typeof waterLayer !== 'undefined' && glShit.waterGL) {
        try {
            waterLayer.init(glShit.waterGL, glShit.shaderCodes.waterVertCode, glShit.shaderCodes.waterFragCode);
        } catch (e) {
            console.warn('waterLayer init failed', e);
        }
    }

    glShit.simProgram = createProgram(glShit.simGL, glShit.shaderCodes.simVertCode, glShit.shaderCodes.simFragCode);
    glShit.reportProgram = createProgram(glShit.simGL, glShit.shaderCodes.reportVertCode, glShit.shaderCodes.reportFragCode);
    glShit.uNeutronsLoc = glShit.simGL.getUniformLocation(glShit.simProgram, "u_neutrons");

    glShit.readTex = neutron.createTexture(glShit.simGL, neutron.buffer);
    glShit.writeTex = neutron.createTexture(glShit.simGL, null);

    glShit.readFBO = createFBO(glShit.simGL, glShit.readTex);
    glShit.writeFBO = createFBO(glShit.simGL, glShit.writeTex);

    initRenderShader(glShit.simGL, glShit.shaderCodes.rendVertCode, glShit.shaderCodes.rendFragCode);
    reportSystem.init(glShit.simGL);
    // Initialize GPU instanced atom renderer (fallback to CPU if fails)
    try {
        if (typeof atomsRenderer !== 'undefined') {
            atomsRenderer.init(
                glShit.simGL,
                uraniumAtomsCountX * uraniumAtomsCountY,
                glShit.shaderCodes.atomsVertCode,
                glShit.shaderCodes.atomsFragCode
            );
            glShit.useInstancedAtoms = true;
        }
    } catch (e) {
        console.warn('atomsRenderer init failed, falling back to CPU draw', e);
        glShit.useInstancedAtoms = false;
    }

    // Atom core renderer on coreCanvas
    try {
        if (glShit.coreGL && typeof AtomsRenderer !== 'undefined') {
            glShit.atomsCoreRenderer = new AtomsRenderer();
            glShit.atomsCoreRenderer.init(
                glShit.coreGL,
                uraniumAtomsCountX * uraniumAtomsCountY,
                glShit.shaderCodes.atomsVertCode,
                glShit.shaderCodes.atomsCoreFragCode
            );
            glShit.useCoreAtoms = true;
        }
    } catch (e) {
        console.warn('atoms core renderer init failed, falling back to glow-only', e);
        glShit.useCoreAtoms = false;
    }

    // Steam renderer on coreCanvas (no CPU fallback)
    if (typeof steamRenderer !== 'undefined') {
        steamRenderer.init(
            glShit.coreGL,
            uraniumAtomsCountX * uraniumAtomsCountY,
            glShit.shaderCodes.steamVertCode,
            glShit.shaderCodes.steamFragCode
        );
        glShit.useGpuSteam = true;
    }

    if (typeof bubblesRenderer !== 'undefined' && glShit.waterGL) {
        bubblesRenderer.init(
            glShit.waterGL,
            5000, // Max bubbles
            glShit.shaderCodes.bubblesVertCode,
            glShit.shaderCodes.bubblesFragCode
        );
    }
}

function initSimulationObjects() {
    // Water cells
    for (let y = 0; y < uraniumAtomsCountY; y++) {
        for (let x = 0; x < uraniumAtomsCountX; x++) {
            let waterCellX = x * uraniumAtomsSpacingX;
            let waterCellY = y * uraniumAtomsSpacingY;
            waterCells.push(new Water(waterCellX + uraniumAtomsSpacingX / 2, waterCellY + uraniumAtomsSpacingY / 2));
        }
    }

    // Uranium atoms and control rods
    for (let x = 0; x < uraniumAtomsCountX; x++) {
        if ((x + 1) % 7 === 0) {
            controlRods.push(new ControlRod(x * uraniumAtomsSpacingX + controlRodWidth / 2, controlRodsStartPos));
        } else {
            for (let y = 0; y < uraniumAtomsCountY; y++) {
                let waterCellIndex = x + y * uraniumAtomsCountX;
                let waterCell = waterCells[waterCellIndex];
                let uraniumX = x * uraniumAtomsSpacingX + uraniumAtomsSpacingX / 2;
                let uraniumY = y * uraniumAtomsSpacingY + uraniumAtomsSpacingY / 2;
                let atom = new UraniumAtom(uraniumX, uraniumY, waterCell);
                atom.index = x + y * uraniumAtomsCountX;
                uraniumAtoms.push(atom);
            }
        }
    }

    // Spatial grid
    grid = new Grid(uraniumAtomsSpacingX);
    for (let atom of uraniumAtoms) {
        grid.addAtom(atom);
    }
}

function initUiObjects() {
    // UI + graphics helpers
    initializeControls();
    ui.meter = new Meter(700, 500);
    ui.controlSlider = new ControlRodsSlider();
    ui.canvas = new UICanvas();
}



function updateScene() {
    // Update neutrons in GPU
    neutron.update(glShit.simGL);
    reportSystem.process(glShit.simGL);
    uraniumAtoms.forEach(s => s.update());
    controlRods.forEach(s => s.update());

    // Update water temperatures (conduction & uranium heat transfer)
    Water.update();

    // Capture top-row temperatures before the upward flow moves water out of the scene
    const topCount = uraniumAtomsCountX;
    const topTemps = new Float32Array(topCount);
    for (let x = 0; x < topCount; x++) {
        const index = x + 0 * uraniumAtomsCountX;
        topTemps[x] = waterCells[index].temperature;
    }

    // Move water upwards (this will change top-row cell temperatures)
    interpolateWaterCellsUpwards();

    // Compute calorimetric energy removed by outflow at the top row this frame
    // Treat settings.waterFlowSpeed as fraction of a cell leaving per frame (option A)
    const fractionOut = settings.waterFlowSpeed;
    const inletTemp = (typeof settings.inletTemperature !== 'undefined') ? settings.inletTemperature : 15;
    let totalJoulesOut = 0;
    for (let x = 0; x < topCount; x++) {
        const index = x + 0 * uraniumAtomsCountX;
        const T_out = topTemps[x];
        const massMoved = fractionOut * (waterCells[index].mass || 0.1); // kg moved this frame
        const c = (waterCells[index].specificHeatCapacity || 4186);
        const deltaT = T_out - inletTemp;
        const dE = massMoved * c * deltaT; // Joules per frame
        totalJoulesOut += dE/1000;
    }

    // Convert Joules/frame -> kW (kJ/s) by dividing by frame time
    let dt = (typeof deltaTime !== 'undefined') ? (deltaTime / 1000.0) : (1.0 / 60.0);
    if (dt <= 0) dt = 1.0 / 60.0;
    const powerW = totalJoulesOut / dt; // Watts
    const powerKW = powerW / 1000.0; // physical kW

    // `energyThisFrame` is the game-scaled instantaneous power (kW-game units)
    energyThisFrame = powerKW;

    // Accumulate physical kW * seconds so we can compute exact per-second averages
    energyOutputCounter += powerKW * dt;
    if (typeof ui.accumulatedTime === 'undefined') ui.accumulatedTime = 0;
    ui.accumulatedTime += dt;
    ui.meter.update();
    oncePerSecond();
}

function drawScene() {
    renderWaterLayer();
    renderBubblesLayer();
    renderSteamLayer();
    renderAtomCoreLayer();
    renderAtomGlowLayer();
    renderNeutronLayer();
    renderBordersLayer();
    renderUiLayer();
}
function renderWaterLayer() {
    const gl = glShit.waterGL;
    if (!gl || !glShit.waterCanvas) return;
    ensureWaterLayerCleared(gl);
    if (typeof waterLayer !== 'undefined' && waterLayer.render) {
        waterLayer.render((typeof renderTime !== 'undefined') ? renderTime : millis() / 1000.0);
    }
}

function renderBubblesLayer() {
    const gl = glShit.waterGL;
    if (!gl || !glShit.waterCanvas) return;
    ensureWaterLayerCleared(gl);
    if (typeof bubblesRenderer !== 'undefined') {
        bubblesRenderer.render(glShit.waterCanvas.width, glShit.waterCanvas.height, (typeof renderTime !== 'undefined') ? renderTime : millis() / 1000.0);
    }
}

function renderSteamLayer() {
    const gl = glShit.coreGL;
    if (!gl || !glShit.coreCanvas || !glShit.useGpuSteam) return;
    ensureCoreLayerCleared(gl);
    if (typeof steamRenderer !== 'undefined') {
        steamRenderer.updateInstances(waterCells);
        steamRenderer.draw();
    }
}

function renderAtomCoreLayer() {
    const gl = glShit.coreGL;
    if (!gl || !glShit.coreCanvas || !glShit.useCoreAtoms || !glShit.atomsCoreRenderer) return;
    ensureCoreLayerCleared(gl);
    glShit.atomsCoreRenderer.updateInstances(uraniumAtoms);
    glShit.atomsCoreRenderer.draw(uraniumAtoms.length, { blendMode: 'alpha' });
}

function renderAtomGlowLayer() {
    const gl = glShit.simGL;
    if (!gl || !glShit.simCanvas || !glShit.useInstancedAtoms) return;
    ensureSimLayerCleared(gl);
    if (typeof atomsRenderer !== 'undefined') {
        atomsRenderer.updateInstances(uraniumAtoms);
        atomsRenderer.draw(uraniumAtoms.length, { blendMode: 'additive' });
    }
}

function renderNeutronLayer() {
    const gl = glShit.simGL;
    if (!gl || !glShit.simCanvas) return;
    ensureSimLayerCleared(gl);
    neutron.draw(gl, { clear: false });
}

function renderBordersLayer() {
    if (ui && ui.canvas) ui.canvas.drawBorders();
}

function renderUiLayer() {
    if (ui && ui.canvas) ui.canvas.drawUi();
}

function ensureWaterLayerCleared(gl) {
    if (glShit.waterClearFrame === frameCount) return;
    glShit.waterClearFrame = frameCount;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.waterCanvas.width, glShit.waterCanvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function ensureCoreLayerCleared(gl) {
    if (glShit.coreClearFrame === frameCount) return;
    glShit.coreClearFrame = frameCount;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.coreCanvas.width, glShit.coreCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function ensureSimLayerCleared(gl) {
    if (glShit.simClearFrame === frameCount) return;
    glShit.simClearFrame = frameCount;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}
