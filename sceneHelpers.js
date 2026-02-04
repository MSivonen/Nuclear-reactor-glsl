// Helpers to cleanly initialize and run per-frame logic for the sketch

function initShadersAndGL() {
    // SINGLE CANVAS REFACTOR
    glShit.gameCanvas = document.getElementById("gameCanvas");

    // Set size to match screen settings
    if (glShit.gameCanvas) {
        glShit.gameCanvas.width = screenRenderWidth;
        glShit.gameCanvas.height = screenHeight;

        // Create ONE WebGL2 context
        gl = glShit.gameCanvas.getContext("webgl2", {
            alpha: false, // Opaque canvas
            depth: false, // We handle layering manually / painter's algorithm
            antialias: false,
            preserveDrawingBuffer: true,
            premultipliedAlpha: true,
        });
    } else {
        console.error("Game canvas not found!");
        return;
    }

    if (!gl) {
        console.error("WebGL2 not supported");
        return;
    }

    // Provide this single context to all "legacy" slots so existing renderers work
    glShit.waterGL = gl;
    glShit.simGL = gl;
    glShit.coreGL = gl;

    // Provide the single canvas to all "legacy" canvas slots (for width/height checks)
    glShit.waterCanvas = glShit.gameCanvas;
    glShit.simCanvas = glShit.gameCanvas;
    glShit.coreCanvas = glShit.gameCanvas;

    // Ensure required extension present (no-op if not)
    gl.getExtension("EXT_color_buffer_float");

    // Initialize water background layer (fullscreen shader)
    if (typeof waterLayer !== 'undefined') {
        try {
            waterLayer.init(gl, glShit.shaderCodes.waterVertCode, glShit.shaderCodes.waterFragCode);
        } catch (e) {
            console.warn('waterLayer init failed', e);
        }
    }

    glShit.simProgram = createProgram(gl, glShit.shaderCodes.simVertCode, glShit.shaderCodes.simFragCode);
    glShit.reportProgram = createProgram(gl, glShit.shaderCodes.reportVertCode, glShit.shaderCodes.reportFragCode);
    glShit.explosionProgram = createProgram(gl, glShit.shaderCodes.explosionVertCode, glShit.shaderCodes.explosionFragCode);

    glShit.uNeutronsLoc = gl.getUniformLocation(glShit.simProgram, "u_neutrons");

    // Ensure neutron instance exists or create a temp helper if needed
    // But ideally neutron is instantiated in setup(). 
    // Here we are in initShadersAndGL() which runs inside loadingTasks
    if (typeof neutron === 'undefined' || !neutron) {
        // Create a temporary instance just for the texture helper methods if needed
        // Or better yet, ensure neutron is global. 
        // We will assume "Neutron" class is loaded (fixed in index.html)
        // and create a local instance if the global isn't ready.
        if (typeof Neutron !== 'undefined') {
            globalThis.neutron = new Neutron();
        }
    }

    // Simulation textures (still use FBOs for simulation steps, that's fine)
    glShit.readTex = neutron.createTexture(gl, neutron.buffer);
    glShit.writeTex = neutron.createTexture(gl, null);

    glShit.readFBO = createFBO(gl, glShit.readTex);
    glShit.writeFBO = createFBO(gl, glShit.writeTex);

    initRenderShader(gl, glShit.shaderCodes.rendVertCode, glShit.shaderCodes.rendFragCode);
    reportSystem.init(gl);

    // Initialize GPU instanced atom renderer (fallback to CPU if fails)
    try {
        if (typeof atomsRenderer !== 'undefined') {
            atomsRenderer.init(
                gl,
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

    // Atom core renderer 
    try {
        if (typeof AtomsRenderer !== 'undefined') {
            glShit.atomsCoreRenderer = new AtomsRenderer();
            glShit.atomsCoreRenderer.init(
                gl,
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

    // Steam renderer 
    if (typeof steamRenderer !== 'undefined') {
        steamRenderer.init(
            gl,
            uraniumAtomsCountX * uraniumAtomsCountY,
            glShit.shaderCodes.steamVertCode,
            glShit.shaderCodes.steamFragCode
        );
        glShit.useGpuSteam = true;
    }

    if (typeof bubblesRenderer !== 'undefined') {
        bubblesRenderer.init(
            gl,
            5000,
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
    ui.powerMeter = new PowerMeter(globalScale * 730, globalScale * 530);
    ui.tempMeter = new TempMeter(globalScale * 600, globalScale * 530);
    ui.controlSlider = new ControlRodsSlider();
    // This creates an offscreen 2D canvas now (per ui.js changes)
    ui.canvas = new UICanvas();

    // Init the overlay shader for drawing the UI texture
    if (typeof uiOverlay !== 'undefined' && glShit.gameCanvas) {
        const gl = glShit.gameCanvas.getContext('webgl2');
        uiOverlay.init(gl);
    }
}



function updateScene() {
    // Update neutrons in GPU
    neutron.update(glShit.simGL);
    reportSystem.process(glShit.simGL);
    let totalHeat = 0;
    uraniumAtoms.forEach(s => {
        s.update();
        totalHeat += s.heat;
    });
    window.avgTemp = uraniumAtoms.length > 0 ? totalHeat / uraniumAtoms.length : 0;
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
    const baselineTemp = 25;
    const effectiveInletTemp = Math.max(inletTemp, baselineTemp);
    let totalJoulesOut = 0;
    for (let x = 0; x < topCount; x++) {
        const index = x + 0 * uraniumAtomsCountX;
        const T_out = topTemps[x];
        const massMoved = fractionOut * (waterCells[index].mass || 0.1); // kg moved this frame
        const c = (waterCells[index].specificHeatCapacity || 4186);
        const deltaT = T_out - effectiveInletTemp;
        const effectiveDeltaT = Math.max(0, deltaT);
        // Nonlinear reward for hotter reactor (mild exponent)
        const heatBoost = Math.pow(effectiveDeltaT, 1.08);
        const dE = massMoved * c * heatBoost; // Joules per frame (nonlinear)
        totalJoulesOut += dE / 1000;
    }

    // Convert Joules/frame -> kW (kJ/s) by dividing by frame time
    let dt = (typeof deltaTime !== 'undefined') ? (deltaTime / 1000.0) : (1.0 / 60.0);
    if (dt <= 0) dt = 1.0 / 60.0;
    const powerW = totalJoulesOut / dt; // Watts
    const powerKW = powerW / 1000.0; // physical kW

    // `energyThisFrame` is the game-scaled instantaneous power (kW-game units)
    energyThisFrame = powerKW;

    // Calculate neutron size based on reactor energy
    const tempPercent = (window.avgTemp || 0) / 500;
    const powerPercent = (energyOutput || 0) / 1000;
    const energy = (tempPercent + powerPercent) / 2;
    const targetMultiplier = 1 - (energy * 0.67);
    window.currentNeutronSizeMultiplier += (targetMultiplier - window.currentNeutronSizeMultiplier) * (deltaTime / 5000);
    settings.neutronSize = defaultSettings.neutronSize * window.currentNeutronSizeMultiplier * globalScale;

    // Accumulate physical kW * seconds so we can compute exact per-second averages
    energyOutputCounter += powerKW * dt;
    if (typeof ui.accumulatedTime === 'undefined') ui.accumulatedTime = 0;
    ui.accumulatedTime += dt;
    if (ui.powerMeter) ui.powerMeter.update();
    if (ui.tempMeter) ui.tempMeter.update();
    oncePerSecond();
}

function drawScene() {
    const gl = glShit.waterGL; // They are all the same now

    // 1. Clear the entire frame (Color + Depth if checking it, but we don't)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.gameCanvas.width, glShit.gameCanvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0); // Default background if water fails, but waterLayer should cover it
    gl.clear(gl.COLOR_BUFFER_BIT);

    // RENDER LAYERS
    // IMPORTANT: The Simulation Area (Sim) is offset by SHOP_WIDTH.
    // We must adjust viewport for Sim layers so coordinate (0,0) in Sim matches (SHOP_WIDTH, 0) on screen.
    // GL viewport is (x, y, w, h). y=0 is bottom.
    // ui.js defines simXOffset = SHOP_WIDTH.

    const simX = SHOP_WIDTH;
    const simW = screenSimWidth;
    const simH = screenHeight;

    // 2. Render Water Background (Opaque)
    gl.viewport(simX, 0, simW, simH);
    gl.disable(gl.BLEND);
    renderWaterLayer();

    // 3. Render Bubbles (Alpha Blend)
    gl.viewport(simX, 0, simW, simH);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    renderBubblesLayer(); // Pass viewport size if needed? See bubblesRenderer call below.


    // 4. Render Steam (Alpha Blend)
    gl.viewport(simX, 0, simW, simH);
    renderSteamLayer();

    // 5. Render Atom Cores (Alpha Blend - Opaque sprites)
    gl.viewport(simX, 0, simW, simH);
    renderAtomCoreLayer();

    // 6. Render Atom GLOWS (Additive)
    gl.viewport(simX, 0, simW, simH);
    // The original CSS used mix-blend-mode: screen. 
    // In WebGL: gl.blendFunc(gl.ONE, gl.ONE) is standard additive.
    // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR) is Screen.
    // Let's try Additive first as it's common for glows.
    gl.blendFunc(gl.ONE, gl.ONE);
    renderAtomGlowLayer();

    // 7. Render Neutrons (Additive)
    gl.viewport(simX, 0, simW, simH);
    renderNeutronLayer();

    // 8. Explosion (Alpha Blend for proper alpha)
    if (boom) {
        gl.viewport(simX, 0, simW, simH);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderExplosionLayer();
    }

    // 9. UI Overlay (Normal Alpha Blend)
    // First, draw the UI components to the offscreen 2D canvas
    if (ui && ui.canvas) {
        ui.canvas.drawBorders();
        ui.canvas.drawUi();

        // Then draw that canvas as a texture over the scene
        // UI is Full Screen (includes shop)
        if (typeof uiOverlay !== 'undefined') {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null); // ensure we are on screen
            // Reset viewport to full screen for UI
            gl.viewport(0, 0, glShit.gameCanvas.width, glShit.gameCanvas.height);
            uiOverlay.render(gl, ui.canvas.canvas);
        }
    }
}
function renderExplosionLayer() {
    if (!boom) return;
    const gl = glShit.simGL;
    if (!gl || !glShit.explosionProgram) return;
    // ensureSimLayerCleared(gl); -> Removed

    // Define sim dimensions (same as in drawScene)
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
    gl.uniform1f(u_time, (typeof renderTime !== 'undefined') ? renderTime : millis() / 1000.0);

    const u_shopWidth = gl.getUniformLocation(glShit.explosionProgram, "u_shopWidth");
    gl.uniform1f(u_shopWidth, SHOP_WIDTH);

    const u_elapsed = gl.getUniformLocation(glShit.explosionProgram, "u_elapsed");
    let elapsed = 0;
    if (boomStartTime > 0) {
        elapsed = (renderTime - boomStartTime) / 2.0;
        if (elapsed > 1.0) elapsed = 1.0;
    }
    gl.uniform1f(u_elapsed, elapsed);

    // Draw fullscreen quad
    drawFullscreenQuad(gl);
}
function renderWaterLayer() {
    // Uses waterGL (same as main)
    if (typeof waterLayer !== 'undefined' && waterLayer.render) {
        waterLayer.render((typeof renderTime !== 'undefined') ? renderTime : millis() / 1000.0);
    }
}

function renderBubblesLayer() {
    if (typeof bubblesRenderer !== 'undefined' && glShit.waterCanvas) {
        // We must pass SIM dimensions (width, height), not Full or "Canvas" dimensions.
        // bubblesRenderer uses these for u_resolution to scale particles 0..Width -> -1..1
        bubblesRenderer.updateSpeeds(settings.waterFlowSpeed, (typeof renderTime !== 'undefined') ? renderTime : millis() / 1000.0);
        bubblesRenderer.render(screenSimWidth, screenHeight, (typeof renderTime !== 'undefined') ? renderTime : millis() / 1000.0);
    }
}

function renderSteamLayer() {
    if (!glShit.useGpuSteam) return;
    // ensureCoreLayerCleared(gl); -> Removed
    if (typeof steamRenderer !== 'undefined') {
        steamRenderer.updateInstances(waterCells);
        steamRenderer.draw();
    }
}

function renderAtomCoreLayer() {
    if (!glShit.useCoreAtoms || !glShit.atomsCoreRenderer) return;
    // ensureCoreLayerCleared(gl); -> Removed
    glShit.atomsCoreRenderer.updateInstances(uraniumAtoms);
    glShit.atomsCoreRenderer.draw(uraniumAtoms.length, { blendMode: 'alpha' });
}

function renderAtomGlowLayer() {
    if (!glShit.useInstancedAtoms) return;
    // ensureSimLayerCleared(gl); -> Removed
    if (typeof atomsRenderer !== 'undefined') {
        atomsRenderer.updateInstances(uraniumAtoms);
        atomsRenderer.draw(uraniumAtoms.length, { blendMode: 'additive' });
    }
}

function renderNeutronLayer() {
    // ensureSimLayerCleared(gl); -> Removed
    neutron.draw(glShit.simGL, { clear: false });
}

// These are now handled inside drawScene logic for UI
function renderBordersLayer() {
    // No-op here, called in drawScene
}

function renderUiLayer() {
    // No-op here, called in drawScene
}

// Deprecated clearing functions - kept as no-ops or just frame trackers if needed
function ensureWaterLayerCleared(gl) { return; }
function ensureCoreLayerCleared(gl) { return; }
function ensureSimLayerCleared(gl) { return; }
