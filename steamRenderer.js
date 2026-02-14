// GPU instanced renderer for steam (water cells)
class SteamRenderer {
    constructor() {
        this.gl = null;
        this.stampProgram = null;
        this.composeProgram = null;
        this.vao = null;
        this.instanceBuffer = null;
        this.maxInstances = 0;
        this.instanceFloatCount = 5; // x,y, sizeX,sizeY, alpha
        this.instanceData = null;
        this.lastCount = 0;

        this.fieldTex = null;
        this.fieldFbo = null;
        this.fieldWidth = 0;
        this.fieldHeight = 0;
    }

    init(simGL, maxInst, vsSource, stampFsSource, composeFsSource) {
        if (!simGL) return false;
        this.gl = simGL;
        this.maxInstances = maxInst || 2048;
        this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
        if (!vsSource || !stampFsSource || !composeFsSource) {
            throw new Error('steamRenderer shader sources missing');
        }
        this.stampProgram = createProgram(this.gl, vsSource, stampFsSource);
        this.composeProgram = createProgram(this.gl, glShit.shaderCodes.simVertCode, composeFsSource);

        const quad = new Float32Array([
            -0.5, -0.5,
            0.5, -0.5,
            -0.5, 0.5,
            -0.5, 0.5,
            0.5, -0.5,
            0.5, 0.5
        ]);

        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        const quadVbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadVbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quad, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        this.instanceBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);

        let offset = 0;
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(1, 1);
        offset += 2 * 4;

        this.gl.enableVertexAttribArray(2);
        this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(2, 1);
        offset += 2 * 4;

        this.gl.enableVertexAttribArray(3);
        this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(3, 1);
        offset += 1 * 4;

        this.gl.bindVertexArray(null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.ensureFieldTarget();

        this.gl.useProgram(this.composeProgram);
        const fieldLoc = this.gl.getUniformLocation(this.composeProgram, 'u_steamField');
        this.gl.uniform1i(fieldLoc, 0);
        this.gl.useProgram(null);

        return true;
    }

    ensureFieldTarget() {
        const gl = this.gl;
        // Increase FBO resolution to match screen size for sharper edges
        // Half resolution might be causing the blocky/jagged look the user dislikes
        const targetWidth = Math.floor(screenSimWidth);
        const targetHeight = Math.floor(screenHeight);
        if (this.fieldTex && this.fieldWidth === targetWidth && this.fieldHeight === targetHeight) {
            return;
        }

        this.fieldWidth = targetWidth;
        this.fieldHeight = targetHeight;

        if (!this.fieldTex) {
            this.fieldTex = gl.createTexture();
        }
        gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.fieldWidth, this.fieldHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        // Ensure floating point texture if available for higher dynamic range accumulation
        // But since we use RGBA8 (0-1 clamp), additive blending saturates at 1.0 quickly.
        // This saturation might cause "flat tops" which is good for metaballs.
        // However, if we overshoot, we lose gradients.
        // Maybe we need lower alpha per stamp to avoid hitting 1.0 too easily?
        if (!this.fieldFbo) {
            this.fieldFbo = createFBO(gl, this.fieldTex);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fieldFbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fieldTex, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    updateInstances(waterCells) {
        const count = waterCells.length;
        if (count > this.maxInstances) {
            this.maxInstances = count;
            this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        }

        // Reduce alpha scaling to prevent saturation too quickly, giving cleaner gradients
        // We want additive blending to sum up, but not clamp to 1.0 immediately.
        // If density > 1.0, it's fine (as long as we threshold < 1.0).
        // Standard RGBA8 clamps at 1.0.
        // So we must keep accumulated density somewhat below or near 1.0 range.
        const alphaScale = 0.5 * (215.0 / 255.0); 
        const steamStartTemp = 95.0;
        const steamFullTemp = 450.0;
        
        // Increase overlap to ensure smooth connection
        // Larger sprites help the blur feel more volumetric
        const sizeX = uraniumAtomsSpacingX * 3.0;
        const sizeY = uraniumAtomsSpacingY * 3.0;

        for (let i = 0; i < count; i++) {
            const cell = waterCells[i];
            const base = i * this.instanceFloatCount;

            const t = (cell.temperature - steamStartTemp) / (steamFullTemp - steamStartTemp);
            const clamped = Math.max(0, Math.min(1, t));
            const eased = clamped * clamped * (3.0 - 2.0 * clamped);
            const alpha = eased * alphaScale;

            this.instanceData[base + 0] = cell.position.x;
            this.instanceData[base + 1] = cell.position.y;
            this.instanceData[base + 2] = sizeX;
            this.instanceData[base + 3] = sizeY;
            this.instanceData[base + 4] = alpha;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, count * this.instanceFloatCount);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.lastCount = count;
        return count;
    }

    draw(count) {
        if (!this.gl || !this.stampProgram || !this.composeProgram) return;
        const instanceCount = count ?? this.lastCount;
        const gl = this.gl;
        const now = (performance.now ? performance.now() : Date.now()) * 0.001;
        const composeViewport = gl.getParameter(gl.VIEWPORT);

        this.ensureFieldTarget();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fieldFbo);
        gl.viewport(0, 0, this.fieldWidth, this.fieldHeight);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.stampProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindVertexArray(this.vao);

        const targetSizeLoc = gl.getUniformLocation(this.stampProgram, 'u_targetSize');
        gl.uniform2f(targetSizeLoc, screenSimWidth, screenHeight);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);

        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(composeViewport[0], composeViewport[1], composeViewport[2], composeViewport[3]);
        gl.useProgram(this.composeProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);

        const uResLoc = gl.getUniformLocation(this.composeProgram, 'u_resolution');
        gl.uniform2f(uResLoc, composeViewport[2], composeViewport[3]);
        const uFieldLoc = gl.getUniformLocation(this.composeProgram, 'u_fieldResolution');
        gl.uniform2f(uFieldLoc, this.fieldWidth, this.fieldHeight);
        const uViewportLoc = gl.getUniformLocation(this.composeProgram, 'u_viewportOrigin');
        gl.uniform2f(uViewportLoc, composeViewport[0], composeViewport[1]);
        const timeLoc = gl.getUniformLocation(this.composeProgram, 'u_time');
        gl.uniform1f(timeLoc, now);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        drawFullscreenQuad(gl);
        gl.disable(gl.BLEND);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(null);
    }
}

const steamRenderer = new SteamRenderer();
