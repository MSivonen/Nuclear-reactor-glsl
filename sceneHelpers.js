// Helpers to cleanly initialize and run per-frame logic for the sketch

function initShadersAndGL() {
    gl = drawingContext;

    glShit.simCanvas = document.getElementById("simCanvas");
    glShit.simCanvas.width = screenRenderWidth;
    glShit.simCanvas.height = screenRenderHeight;

    glShit.simGL = glShit.simCanvas.getContext("webgl2", {
        alpha: true,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: true,
    });

    // Ensure required extension present (no-op if not)
    glShit.simGL.getExtension("EXT_color_buffer_float");

    glShit.simProgram = createProgram(glShit.simGL, glShit.shaderCodes.simVertCode, glShit.shaderCodes.simFragCode);
    glShit.reportProgram = createProgram(glShit.simGL, glShit.shaderCodes.reportVertCode, glShit.shaderCodes.reportFragCode);
    glShit.uNeutronsLoc = glShit.simGL.getUniformLocation(glShit.simProgram, "u_neutrons");

    glShit.readTex = createNeutronTexture(glShit.simGL, neutronBuffer);
    glShit.writeTex = createNeutronTexture(glShit.simGL, null);

    glShit.readFBO = createFBO(glShit.simGL, glShit.readTex);
    glShit.writeFBO = createFBO(glShit.simGL, glShit.writeTex);

    initRenderShader(glShit.simGL, glShit.shaderCodes.rendVertCode, glShit.shaderCodes.rendFragCode);
    initReportSystem(glShit.simGL);
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

    // Initialize GPU steam renderer
    try {
        if (typeof steamRenderer !== 'undefined') {
            steamRenderer.init(
                glShit.simGL,
                uraniumAtomsCountX * uraniumAtomsCountY,
                glShit.shaderCodes.steamVertCode,
                glShit.shaderCodes.steamFragCode
            );
            glShit.useGpuSteam = true;
        }
    } catch (e) {
        console.warn('steamRenderer init failed, falling back to CPU draw', e);
        glShit.useGpuSteam = false;
    }
}

function initSceneObjects() {
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
            controlRods.push(new ControlRod(x * uraniumAtomsSpacingX + controlRodWidth / 2, -screenDrawHeight / 2));
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

    // UI + graphics helpers
    initializeControls();
    textFont(font);
    steamImage = createGraphics(screenDrawWidth, screenDrawHeight);
    ui.meter = new Meter(700, 500);
    ui.controlSlider = new ControlRodsSlider();
}



function updateScene() {
    uraniumAtoms.forEach(s => s.update());
    controlRods.forEach(s => s.update());

    updateWaterCells();
    interpolateWaterCellsUpwards();

    energyThisFrame /= 70;
    energyOutputCounter += energyThisFrame;
    ui.meter.update();
    //updateCountersHTML(); //for tweaking and debugging
    oncePerSecond();
    if (energyOutput > 10000) boom = true;
}

function renderScene() {
    translate(-screenDrawWidth / 2, -screenDrawHeight / 2);
    background(waterColor);

    push();
    translate(screenDrawWidth / 2, screenDrawHeight / 2);
    scale(screenRenderHeight / screenDrawHeight);
    translate(-screenDrawWidth / 2, -screenDrawHeight / 2);

    atomsRenderer.updateInstances(uraniumAtoms);
    atomsRenderer.draw(uraniumAtoms.length);

    controlRods.forEach(s => s.draw());

    drawSteam();
    atomsRenderer.renderImage();
    ui.meter.show();
    ui.controlSlider.slider();
    gameOver();
    drawFPS();
    drawBorders();

    pop();
}
