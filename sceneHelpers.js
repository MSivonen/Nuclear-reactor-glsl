// Helpers to cleanly initialize and run per-frame logic for the sketch

function initShadersAndGL() {
    gl = drawingContext;

    // Core canvas (normal alpha compositing)
    glShit.coreCanvas = document.getElementById("coreCanvas");
    glShit.coreCanvas.width = screenRenderWidth;
    glShit.coreCanvas.height = screenRenderHeight;
    glShit.coreGL = glShit.coreCanvas.getContext("webgl2", {
        alpha: true,
        depth: false,
        antialias: false,
        preserveDrawingBuffer: false,
        premultipliedAlpha: true,
    });

    glShit.simCanvas = document.getElementById("simCanvas");
    glShit.simCanvas.width = screenRenderWidth;
    glShit.simCanvas.height = screenRenderHeight;

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
            controlRods.push(new ControlRod(x * uraniumAtomsSpacingX + controlRodWidth / 2, -screenSimHeight / 2));
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
    translate(-screenSimWidth / 2, -screenSimHeight / 2);
    background(waterColor);

    push();
    translate(screenSimWidth / 2, screenSimHeight / 2);
    scale(screenRenderHeight / screenSimHeight);
    translate(-screenSimWidth / 2, -screenSimHeight / 2);

    controlRods.forEach(s => s.draw());

    ui.meter.show();
    ui.controlSlider.slider();
    gameOver();
    drawFPS();
    //drawBorders();

    pop();
}
function renderCoreLayer() {
    // Draw steam + atom cores on the normal-alpha coreCanvas layer.
    if ((!glShit.useCoreAtoms || !glShit.atomsCoreRenderer) && !glShit.useGpuSteam) return;
    const gl = glShit.coreGL;
    if (!gl) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.coreCanvas.width, glShit.coreCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    // Steam first (below atoms)
    if (glShit.useGpuSteam && typeof steamRenderer !== 'undefined') {
        steamRenderer.updateInstances(waterCells);
        steamRenderer.draw();
    }

    // Atom cores on top
    if (glShit.useCoreAtoms && glShit.atomsCoreRenderer) {
        glShit.atomsCoreRenderer.updateInstances(uraniumAtoms);
        glShit.atomsCoreRenderer.draw(uraniumAtoms.length, { blendMode: 'alpha' });
    }
}

// Render GPU overlays (steam/atoms/neutrons) onto the transparent simCanvas.
// This avoids copying WebGL output through a 2D canvas (p5Copy), which can
// introduce premultiply/alpha artifacts (dark halos) on non-black backgrounds.
function renderSimOverlay() {
    const gl = glShit.simGL;
    if (!gl) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
    // Opaque black. With CSS screen blending, black contributes nothing.
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Atoms (GPU instanced) - glow only (core is drawn in p5)
    if (glShit.useInstancedAtoms && typeof atomsRenderer !== 'undefined') {
        atomsRenderer.updateInstances(uraniumAtoms);
        atomsRenderer.draw(uraniumAtoms.length, { blendMode: 'additive' });
    }

    // Neutrons on top
    gpuDrawNeutrons(gl, { clear: false });
}
