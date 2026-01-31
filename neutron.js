class Neutron {
    constructor() {
        this.buffer = new Float32Array(MAX_NEUTRONS_SQUARED * NEUTRON_STRIDE);
        this.currentIndex = 0;
    }

    createTexture(gl, data) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            MAX_NEUTRONS,
            MAX_NEUTRONS,
            0,
            gl.RGBA,
            gl.FLOAT,
            data || null
        );

        gl.bindTexture(gl.TEXTURE_2D, null);
        return tex;
    }

    update(gl) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.writeFBO);
        gl.viewport(0, 0, MAX_NEUTRONS, MAX_NEUTRONS);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(glShit.simProgram);

        // Pass per-rod Y positions (bottom threshold) to the shader.
        // Prefer handle positions from the UI slider if available (handles hold bottom Y).
        const rodCount = controlRods.length;
        const rodYs = new Float32Array(rodCount || 1);
        for (let i = 0; i < rodCount; i++) {
            if (typeof ui !== 'undefined' && ui.controlSlider && ui.controlSlider.handleY && ui.controlSlider.handleY.length > i) {
                rodYs[i] = ui.controlSlider.handleY[i];
            } else {
                // Fallback: use rod bottom (top y + height)
                rodYs[i] = controlRods[i].y + controlRods[i].height;
            }
        }
        const uRodsLoc = gl.getUniformLocation(glShit.simProgram, "u_controlRods");
        if (uRodsLoc) gl.uniform1fv(uRodsLoc, rodYs);
        const uRodCountLoc = gl.getUniformLocation(glShit.simProgram, "u_controlRodCount");
        if (uRodCountLoc) gl.uniform1i(uRodCountLoc, rodCount);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
        gl.uniform1i(glShit.uNeutronsLoc, 0);
        gl.uniform1i(gl.getUniformLocation(glShit.simProgram, "u_uraniumCountX"), uraniumAtomsCountX);
        gl.uniform1f(gl.getUniformLocation(glShit.simProgram, "collision_prob"), settings.collisionProbability);
        gl.uniform1f(gl.getUniformLocation(glShit.simProgram, "controlRodHitProbability"), settings.controlRodHitProbability);
        gl.uniform1f(gl.getUniformLocation(glShit.simProgram, "controlRodAbsorptionProbability"), settings.controlRodAbsorptionProbability);

        drawFullscreenQuad(gl);

        // Ping-pong
        const tmpTex = glShit.readTex;
        glShit.readTex = glShit.writeTex;
        glShit.writeTex = tmpTex;

        const tmpFbo = glShit.readFBO;
        glShit.readFBO = glShit.writeFBO;
        glShit.writeFBO = tmpFbo;
    }

    draw(gl, { clear = true } = {}) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
        if (clear) {
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        gl.useProgram(glShit.renderProgram);
        gl.enable(gl.BLEND);
        // Screen-like blending: 1 - (1 - S) * (1 - D)
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.uniform1i(glShit.uRenderTexSizeLoc, MAX_NEUTRONS);
        gl.uniform2f(glShit.uRenderResLoc, glShit.simCanvas.width, glShit.simCanvas.height);
        gl.uniform2f(glShit.uRenderSimSizeLoc, screenSimWidth, screenHeight);
        gl.uniform1f(glShit.uRenderNeutronSizeLoc, settings.neutronSize);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);

        gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);

        gl.disable(gl.BLEND);
        gl.useProgram(null);
    }

    readFrameBuffer(gl) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.readFBO);

        gl.readPixels(
            0,
            0,
            MAX_NEUTRONS,
            MAX_NEUTRONS,
            gl.RGBA,
            gl.FLOAT,
            this.buffer
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    updateInTexture(gl, index, x, y, vx, vy) {
        // Ensure we write to the current input texture.
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);

        const data = new Float32Array([x, y, vx, vy]);

        // Convert linear index (0...MAX^2) to 2D texture coordinates.
        const texX = index % MAX_NEUTRONS;
        const texY = Math.floor(index / MAX_NEUTRONS);

        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            texX,
            texY,
            1,
            1,
            gl.RGBA,
            gl.FLOAT,
            data
        );

        gl.bindTexture(gl.TEXTURE_2D, glShit.writeTex);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            texX,
            texY,
            1,
            1,
            gl.RGBA,
            gl.FLOAT,
            data
        );

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    spawn(x, y, atomRadius) {
        // Ring-buffer index.
        this.currentIndex = (this.currentIndex + 1) % MAX_NEUTRONS_SQUARED;

        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * settings.neutronSpeed;
        const vy = Math.sin(angle) * settings.neutronSpeed;

        // Spawn just outside the atom.
        const spawnOffset = atomRadius * 2;
        const finalX = x + Math.cos(angle) * spawnOffset;
        const finalY = y + Math.sin(angle) * spawnOffset;

        const i = this.currentIndex * NEUTRON_STRIDE;
        this.buffer[i + 0] = finalX;
        this.buffer[i + 1] = finalY;
        this.buffer[i + 2] = vx;
        this.buffer[i + 3] = vy;

        this.updateInTexture(glShit.simGL, this.currentIndex, finalX, finalY, vx, vy);
    }
}

    const neutron = new Neutron();
