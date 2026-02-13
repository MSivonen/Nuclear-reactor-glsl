class ReportSystem {
    init(gl) {
        glShit.reportTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glShit.reportTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, uraniumAtomsCountX, uraniumAtomsCountY, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        glShit.reportFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glShit.reportTex, 0);

        glShit.reportVao = gl.createVertexArray();
        gl.bindVertexArray(glShit.reportVao);
        gl.bindVertexArray(null);

        gl.useProgram(glShit.reportProgram);

        const uCountXLoc = gl.getUniformLocation(glShit.reportProgram, "u_uraniumCountX");
        const uCountYLoc = gl.getUniformLocation(glShit.reportProgram, "u_uraniumCountY");
        const uTexSizeLoc = gl.getUniformLocation(glShit.reportProgram, "u_textureSize");

        gl.uniform1i(uCountXLoc, uraniumAtomsCountX);
        gl.uniform1i(uCountYLoc, uraniumAtomsCountY);
        gl.uniform1i(uTexSizeLoc, MAX_NEUTRONS);

        glShit.reportData = new Uint8Array(uraniumAtomsCountX * uraniumAtomsCountY * 4);
        const pboSize = glShit.reportData.byteLength;
        glShit.reportPBOs = [gl.createBuffer(), gl.createBuffer()];
        for (let b of glShit.reportPBOs) {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b);
            gl.bufferData(gl.PIXEL_PACK_BUFFER, pboSize, gl.STREAM_READ);
        }
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        glShit.reportPBOIndex = 0;
        glShit.reportPBOSize = pboSize;
        glShit.reportPBOSyncs = [null, null];
        glShit.reportPBOPrimed = false;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    process(gl) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
        gl.viewport(0, 0, uraniumAtomsCountX, uraniumAtomsCountY);
        gl.disable(gl.BLEND);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(glShit.reportProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
        gl.uniform1i(gl.getUniformLocation(glShit.reportProgram, "u_neutrons"), 0);
        gl.uniform1i(gl.getUniformLocation(glShit.reportProgram, "u_textureSize"), MAX_NEUTRONS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.bindVertexArray(glShit.reportVao);
        gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);

        const w = uraniumAtomsCountX;
        const h = uraniumAtomsCountY;

        const writePBOIndex = glShit.reportPBOIndex;
        const writePBO = glShit.reportPBOs[writePBOIndex];
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, writePBO);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, glShit.reportPBOSize, gl.STREAM_READ);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0);

        gl.flush();
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (glShit.reportPBOSyncs[writePBOIndex]) {
            gl.deleteSync(glShit.reportPBOSyncs[writePBOIndex]);
        }
        glShit.reportPBOSyncs[writePBOIndex] = sync;

        const readPBOIndex = (writePBOIndex + 1) % 2;
        const readPBO = glShit.reportPBOs[readPBOIndex];
        const readSync = glShit.reportPBOSyncs[readPBOIndex];
        let hasFreshReportData = false;

        if (readSync) {
            const status = gl.clientWaitSync(readSync, 0, 0);
            if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
                gl.bindBuffer(gl.PIXEL_PACK_BUFFER, readPBO);
                gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, glShit.reportData);
                gl.deleteSync(readSync);
                glShit.reportPBOSyncs[readPBOIndex] = null;
                hasFreshReportData = true;
                glShit.reportPBOPrimed = true;
            }
        }

        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        glShit.reportPBOIndex = (writePBOIndex + 1) % 2;
        gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);

        if (!glShit.reportPBOPrimed || !hasFreshReportData) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return;
        }

        for (let i = 0; i < uraniumAtoms.length; i++) {
            if (!uraniumAtoms[i].hasAtom) continue;
            const gridIndex = uraniumAtoms[i].index;
            const x = gridIndex % uraniumAtomsCountX;
            const y = Math.floor(gridIndex / uraniumAtomsCountX);
            const idx = (y * uraniumAtomsCountX + x) * 4;

            const hitCount = glShit.reportData[idx];
            if (hitCount > 0) {
                ui.collisionsThisSecond += hitCount;
                for (let j = 0; j < hitCount; j++) {
                    uraniumAtoms[i].hitByNeutron();
                    // Two new neutrons are spawned.
                    neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                    neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                }
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

const reportSystem = new ReportSystem();
