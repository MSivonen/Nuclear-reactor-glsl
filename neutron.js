class Neutron {
    constructor() {
        this.buffer = new Float32Array(MAX_NEUTRONS_SQUARED * NEUTRON_STRIDE);
        this.currentIndex = 0;
        this.spawnCount = 0;
        this.spawnQueue = [];
    }

    reset(gl) {
        this.buffer.fill(0);
        this.currentIndex = 0;
        this.spawnCount = 0;
        this.spawnQueue.length = 0;

        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            MAX_NEUTRONS,
            MAX_NEUTRONS,
            gl.RGBA,
            gl.FLOAT,
            this.buffer
        );

        gl.bindTexture(gl.TEXTURE_2D, glShit.writeTex);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            MAX_NEUTRONS,
            MAX_NEUTRONS,
            gl.RGBA,
            gl.FLOAT,
            this.buffer
        );

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    updateAtomMaskTexture(gl) {
        if (!glShit.atomMaskTex) return;
        const w = uraniumAtomsCountX;
        const h = uraniumAtomsCountY;
        const needed = w * h * 4;
        if (!glShit.atomMaskData || glShit.atomMaskData.length !== needed) {
            glShit.atomMaskData = new Uint8Array(needed);
        }
        const data = glShit.atomMaskData;
        data.fill(0);

        for (let i = 0; i < uraniumAtoms.length; i++) {
            const atom = uraniumAtoms[i];
            const idx = atom.index * 4;
            if (idx < 0 || idx + 3 >= data.length) continue;
            data[idx] = atom.hasAtom ? 255 : 0;
            data[idx + 3] = 255;
        }

        gl.bindTexture(gl.TEXTURE_2D, glShit.atomMaskTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.bindTexture(gl.TEXTURE_2D, null);
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
        gl.disable(gl.BLEND);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.writeFBO);
        gl.viewport(0, 0, MAX_NEUTRONS, MAX_NEUTRONS);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.updateAtomMaskTexture(gl);

        gl.useProgram(glShit.simProgram);

        const modCount = moderators.length;
        if (!glShit.modYs || glShit.modYs.length < Math.max(1, modCount)) {
            glShit.modYs = new Float32Array(Math.max(1, modCount));
        }
        const modYs = glShit.modYs;
        for (let i = 0; i < modCount; i++) {
            const isActive = (typeof isModeratorActive === 'function') ? isModeratorActive(i) : true;
            modYs[i] = isActive ? moderators[i].y : -100000.0;
        }
        gl.uniform1fv(glShit.simUniforms.u_moderators, modYs);
        gl.uniform1i(glShit.simUniforms.u_moderatorCount, modCount);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
        gl.uniform1i(glShit.uNeutronsLoc, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, glShit.atomMaskTex);
        gl.uniform1i(glShit.simUniforms.u_atomMask, 1);
        gl.uniform1i(glShit.simUniforms.u_uraniumCountX, uraniumAtomsCountX);
        gl.uniform1i(glShit.simUniforms.u_uraniumCountY, uraniumAtomsCountY);
        gl.uniform1f(glShit.simUniforms.collision_prob, settings.collisionProbability);
        gl.uniform1f(glShit.simUniforms.moderatorHitProbability, settings.moderatorHitProbability);
        gl.uniform1f(glShit.simUniforms.moderatorAbsorptionProbability, settings.moderatorAbsorptionProbability);

        gl.uniform1f(glShit.simUniforms.u_simWidth, screenSimWidth);
        gl.uniform1f(glShit.simUniforms.u_simHeight, screenHeight);
        gl.uniform1f(glShit.simUniforms.u_moderatorHeight, moderatorHeight);
        gl.uniform1f(glShit.simUniforms.u_atomSpacingX, uraniumAtomsSpacingX);
        gl.uniform1f(glShit.simUniforms.u_atomSpacingY, uraniumAtomsSpacingY);
        gl.uniform1f(glShit.simUniforms.u_atomRadius, settings.uraniumSize / 2.0);
        gl.uniform1f(glShit.simUniforms.u_globalScale, globalScale);
        // Hitbox Y scale (ellipse height multiplier)
        gl.uniform1f(glShit.simUniforms.u_hitboxYScale, settings.hitboxYScale || 1.0);

        drawFullscreenQuad(gl);

        // Ping-pong
        const tmpTex = glShit.readTex;
        glShit.readTex = glShit.writeTex;
        glShit.writeTex = tmpTex;

        const tmpFbo = glShit.readFBO;
        glShit.readFBO = glShit.writeFBO;
        glShit.writeFBO = tmpFbo;

        // Flush batched spawns to GPU
        this.flushSpawns(gl);
    }

    flushSpawns(gl) {
        if (this.spawnQueue.length === 0) return;

        // Sort by index to group consecutive spawns
        this.spawnQueue.sort((a, b) => a.index - b.index);

        // Group consecutive indices
        const groups = [];
        let currentGroup = [this.spawnQueue[0]];
        for (let i = 1; i < this.spawnQueue.length; i++) {
            if (this.spawnQueue[i].index === this.spawnQueue[i - 1].index + 1) {
                currentGroup.push(this.spawnQueue[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [this.spawnQueue[i]];
            }
        }
        groups.push(currentGroup);

        // Ensure we have a reusable upload buffer to avoid per-chunk allocations
        if (!glShit.spawnUploadBuffer || glShit.spawnUploadBuffer.length < MAX_NEUTRONS * 4) {
            glShit.spawnUploadBuffer = new Float32Array(MAX_NEUTRONS * 4);
        }
        const uploadBuffer = glShit.spawnUploadBuffer;

        // Upload each group, split into per-row chunks
        for (const group of groups) {
            const startIndex = group[0].index;
            const count = group.length;
            let offset = 0;

            while (offset < count) {
                const index = startIndex + offset;
                const texX = index % MAX_NEUTRONS;
                const texY = Math.floor(index / MAX_NEUTRONS);
                const spaceInRow = MAX_NEUTRONS - texX;
                const chunkCount = Math.min(spaceInRow, count - offset);

                // Fill uploadBuffer slice for this chunk
                const len = chunkCount * 4;
                for (let i = 0; i < chunkCount; i++) {
                    const spawn = group[offset + i];
                    const base = i * 4;
                    uploadBuffer[base] = spawn.x;
                    uploadBuffer[base + 1] = spawn.y;
                    uploadBuffer[base + 2] = spawn.vx;
                    uploadBuffer[base + 3] = spawn.vy;
                }
                const view = uploadBuffer.subarray(0, chunkCount * 4);

                gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, chunkCount, 1, gl.RGBA, gl.FLOAT, view);

                gl.bindTexture(gl.TEXTURE_2D, glShit.writeTex);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, texX, texY, chunkCount, 1, gl.RGBA, gl.FLOAT, view);

                offset += chunkCount;
            }
        }

        this.spawnQueue.length = 0;
    }

    draw(gl, { clear = true } = {}) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (clear) {
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        gl.useProgram(glShit.renderProgram);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.uniform1i(glShit.uRenderTexSizeLoc, MAX_NEUTRONS);
        gl.uniform2f(glShit.uRenderResLoc, screenSimWidth, screenHeight);
        gl.uniform2f(glShit.uRenderSimSizeLoc, screenSimWidth, screenHeight);
        gl.uniform1f(glShit.uRenderNeutronSizeLoc, settings.neutronSize);

        let nAlpha = ui.canvas.uiSettings.video.neutrons.vol;
        const uAlphaLoc = gl.getUniformLocation(glShit.renderProgram, "u_alpha");
        gl.uniform1f(uAlphaLoc, nAlpha);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);

        gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);

        gl.disable(gl.BLEND);
        gl.useProgram(null);
    }

    drawLightPass(gl) {
        // Draw to light map FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.lightFBO);
        const lw = Math.floor(screenSimWidth / 8);
        const lh = Math.floor(screenHeight / 8);
        gl.viewport(0, 0, lw, lh);
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(glShit.neutronLightProgram);
        gl.enable(gl.BLEND);
        // Additive blending for light accumulation
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.uniform1i(gl.getUniformLocation(glShit.neutronLightProgram, "u_textureSize"), MAX_NEUTRONS);
        // Resolution is the sim size here so the vertices map correctly
        gl.uniform2f(gl.getUniformLocation(glShit.neutronLightProgram, "u_resolution"), screenSimWidth, screenHeight);
        gl.uniform2f(gl.getUniformLocation(glShit.neutronLightProgram, "u_simSize"), screenSimWidth, screenHeight);
        // Larger points for the light map to create a soft glow
        gl.uniform1f(gl.getUniformLocation(glShit.neutronLightProgram, "u_neutronSize"), settings.neutronSize * 4.0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
        gl.uniform1i(gl.getUniformLocation(glShit.neutronLightProgram, "u_neutrons"), 0);

        gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);

        // --- NEW: Add Special Items Lighting ---
        const specialItems = [];
        if (typeof plutonium !== 'undefined') specialItems.push(plutonium);
        if (typeof californium !== 'undefined') specialItems.push(californium);
        
        if (specialItems.length > 0) {
            gl.useProgram(glShit.specialLightProgram);

            // Reuse a temporary SpecialRenderer instance to avoid per-frame allocation
            if (!glShit.tempSpecialRenderer) glShit.tempSpecialRenderer = new SpecialRenderer();
            const tempRenderer = glShit.tempSpecialRenderer;
            tempRenderer.gl = gl;
            tempRenderer.program = glShit.specialLightProgram;
            tempRenderer.instanceBuffer = specialRenderer.instanceBuffer;
            tempRenderer.instanceData = specialRenderer.instanceData;
            tempRenderer.maxInstances = specialRenderer.maxInstances;
            tempRenderer.instanceFloatCount = specialRenderer.instanceFloatCount;

            const activeCount = tempRenderer.updateInstances(specialItems);
            // Size them up for bigger light spread
            for (let i = 0; i < activeCount; i++) {
                tempRenderer.instanceData[i * 8 + 6] *= 5.0;
            }

            tempRenderer.draw(activeCount, { blendMode: 'additive' });
        }
        // ----------------------------------------

        // --- NEW: Add Moderator Lighting ---
        if (moderators && moderators.length > 0) {
            gl.useProgram(glShit.specialLightProgram);

            if (!glShit.tempModeratorsRenderer) glShit.tempModeratorsRenderer = new ModeratorsRenderer();
            const tr = glShit.tempModeratorsRenderer;
            tr.gl = gl;
            tr.program = glShit.specialLightProgram;
            tr.instanceBuffer = moderatorsRenderer.instanceBuffer;
            tr.instanceData = moderatorsRenderer.instanceData;
            tr.maxInstances = moderatorsRenderer.maxInstances;
            tr.instanceFloatCount = moderatorsRenderer.instanceFloatCount;

            // Only draw types 0 (moderator) and 1 (sphere) for lighting
            const count = tr.updateInstances(moderators, null);
            for (let i = 0; i < count; i++) {
                const b = i * 9;
                // Expand light emission area
                tr.instanceData[b + 6] *= 4.0;
                tr.instanceData[b + 7] *= 1.2;
            }
            tr.draw(count, { blendMode: 'additive' });
        }
        // ----------------------------------------

        // Now compute vector field from light map
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.vectorFieldFBO);
        gl.useProgram(glShit.lightVectorProgram);
        gl.disable(gl.BLEND);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.lightTex);
        gl.uniform1i(gl.getUniformLocation(glShit.lightVectorProgram, "u_lightMap"), 0);
        gl.uniform2f(gl.getUniformLocation(glShit.lightVectorProgram, "u_resolution"), lw, lh);

        drawFullscreenQuad(gl);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);

        if (!glShit.singleSpawnBuffer) glShit.singleSpawnBuffer = new Float32Array(4);
        const data = glShit.singleSpawnBuffer;
        data[0] = x; data[1] = y; data[2] = vx; data[3] = vy;

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

    spawn(x, y, atomRadius, direction=Math.random() * Math.PI * 2) {
        this.spawnCount++;
        this.currentIndex = (this.currentIndex + 1) % MAX_NEUTRONS_SQUARED;

        const angle = direction;
        const vx = Math.cos(angle) * settings.neutronSpeed;
        const vy = Math.sin(angle) * settings.neutronSpeed;

        const spawnOffset = atomRadius * 2;
        const finalX = x + Math.cos(angle) * spawnOffset;
        const finalY = y + Math.sin(angle) * spawnOffset;

        const i = this.currentIndex * NEUTRON_STRIDE;
        this.buffer[i + 0] = finalX;
        this.buffer[i + 1] = finalY;
        this.buffer[i + 2] = vx;
        this.buffer[i + 3] = vy;

        // Queue for batched GPU update
        this.spawnQueue.push({
            index: this.currentIndex,
            x: finalX,
            y: finalY,
            vx: vx,
            vy: vy
        });
    }
}

