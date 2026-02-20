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

        // Cache report shader uniforms for reuse
        glShit.reportUniforms = {
            u_uraniumCountX: uCountXLoc,
            u_uraniumCountY: uCountYLoc,
            u_textureSize: uTexSizeLoc,
            u_neutrons: gl.getUniformLocation(glShit.reportProgram, "u_neutrons")
        };

        gl.uniform1i(glShit.reportUniforms.u_uraniumCountX, uraniumAtomsCountX);
        gl.uniform1i(glShit.reportUniforms.u_uraniumCountY, uraniumAtomsCountY);
        gl.uniform1i(glShit.reportUniforms.u_textureSize, MAX_NEUTRONS);

        // Create a packed report texture that packs 2x2 source cells into one RGBA pixel
        const srcW = uraniumAtomsCountX;
        const srcH = uraniumAtomsCountY;
        const packedW = glShit.reportPackedW || Math.ceil(srcW / 2);
        const packedH = glShit.reportPackedH || Math.ceil(srcH / 2);
        glShit.reportPackedW = packedW;
        glShit.reportPackedH = packedH;

        glShit.reportPackedTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glShit.reportPackedTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, packedW, packedH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        glShit.reportPackedFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportPackedFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glShit.reportPackedTex, 0);

        glShit.reportData = new Uint8Array(packedW * packedH * 4);
        const pboSize = glShit.reportData.byteLength;
        // Use a 3-PBO pipeline to reduce chances of waiting on the GPU
        glShit.reportPBOs = [gl.createBuffer(), gl.createBuffer(), gl.createBuffer()];
        for (let b of glShit.reportPBOs) {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b);
            gl.bufferData(gl.PIXEL_PACK_BUFFER, pboSize, gl.STREAM_READ);
        }
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        glShit.reportPBOIndex = 0;
        glShit.reportPBOSize = pboSize;
        glShit.reportPBOSyncs = [null, null, null];

        // Create small shader program that packs 2x2 source texels into one RGBA pixel.
        const packVert = `#version 300 es
        layout(location = 0) in vec2 a_pos;
        void main() {
            gl_Position = vec4(a_pos, 0.0, 1.0);
        }`;

        const packFrag = `#version 300 es
        precision mediump float;
        uniform sampler2D u_reportTex;
        uniform ivec2 u_srcSize;
        out vec4 outColor;
        void main() {
            ivec2 dst = ivec2(gl_FragCoord.xy) - ivec2(0,0);
            int sx = dst.x * 2;
            int sy = dst.y * 2;
            ivec2 s0 = ivec2(sx, sy);
            ivec2 s1 = ivec2(sx + 1, sy);
            ivec2 s2 = ivec2(sx, sy + 1);
            ivec2 s3 = ivec2(sx + 1, sy + 1);
            vec4 c0 = texelFetch(u_reportTex, clamp(s0, ivec2(0), u_srcSize - 1), 0);
            vec4 c1 = texelFetch(u_reportTex, clamp(s1, ivec2(0), u_srcSize - 1), 0);
            vec4 c2 = texelFetch(u_reportTex, clamp(s2, ivec2(0), u_srcSize - 1), 0);
            vec4 c3 = texelFetch(u_reportTex, clamp(s3, ivec2(0), u_srcSize - 1), 0);
            // Pack the red channel counts from four source texels into RGBA channels.
            outColor = vec4(c0.r, c1.r, c2.r, c3.r);
        }`;

        try {
            glShit.reportPackProgram = createProgram(gl, packVert, packFrag);
            glShit.reportPackUniforms = {
                u_reportTex: gl.getUniformLocation(glShit.reportPackProgram, "u_reportTex"),
                u_srcSize: gl.getUniformLocation(glShit.reportPackProgram, "u_srcSize")
            };
        } catch (e) {
            // If creation fails, continue without packing (fallback to original behaviour)
            glShit.reportPackProgram = null;
            glShit.reportPackUniforms = null;
            console.warn("Report pack program failed to compile; continuing without pack pass.", e);
        }

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
        gl.uniform1i(glShit.reportUniforms.u_neutrons, 0);
        gl.uniform1i(glShit.reportUniforms.u_textureSize, MAX_NEUTRONS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.bindVertexArray(glShit.reportVao);
        gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);

        const srcW = uraniumAtomsCountX;
        const srcH = uraniumAtomsCountY;
        const packedW = glShit.reportPackedW || Math.ceil(srcW / 2);
        const packedH = glShit.reportPackedH || Math.ceil(srcH / 2);

        // Asynchronous readback using PBOs to avoid blocking the CPU on gl.readPixels.
        // We use a ping-pong of two PBOs created in init. On the first frame we
        // still perform a synchronous read to prime the pipeline.
        const pboIndex = glShit.reportPBOIndex || 0;
        const curPBO = (glShit.reportPBOs && glShit.reportPBOs.length > 0) ? glShit.reportPBOs[pboIndex] : null;

        // If a pack program exists, run the pack pass to reduce readback size
        if (glShit.reportPackProgram) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportPackedFBO);
            gl.viewport(0, 0, packedW, packedH);
            gl.useProgram(glShit.reportPackProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glShit.reportTex);
            gl.uniform1i(glShit.reportPackUniforms.u_reportTex, 0);
            gl.uniform2i(glShit.reportPackUniforms.u_srcSize, srcW, srcH);
            drawFullscreenQuad(gl);
            gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO); // restore for downstream state
            gl.viewport(0, 0, srcW, srcH);
        }

        if (curPBO) {
            // Bind current PBO and issue readPixels into it (no CPU stall)
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, curPBO);
            // Allocate/ensure buffer size (may be a no-op if already sized)
            gl.bufferData(gl.PIXEL_PACK_BUFFER, glShit.reportPBOSize, gl.STREAM_READ);
            // When PIXEL_PACK_BUFFER is bound, passing a numeric offset writes into the PBO
            // Read from packed FBO if available
            if (glShit.reportPackProgram) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportPackedFBO);
                gl.readPixels(0, 0, packedW, packedH, gl.RGBA, gl.UNSIGNED_BYTE, 0);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
                gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, 0);
            }

            // Insert a fence to know when GPU is done writing this PBO
            if (glShit.reportPBOSyncs && Array.isArray(glShit.reportPBOSyncs)) {
                if (glShit.reportPBOSyncs[pboIndex]) {
                    // Delete any old sync for this slot
                    gl.deleteSync(glShit.reportPBOSyncs[pboIndex]);
                }
                glShit.reportPBOSyncs[pboIndex] = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            }

            // Advance PBO index for next frame
            glShit.reportPBOIndex = (pboIndex + 1) % (glShit.reportPBOs.length || 1);

            // If we've primed the pipeline, try to read back the previous PBO without blocking
            if (glShit.reportPBOPrimed) {
                const readIndex = glShit.reportPBOIndex; // buffer used two frames ago
                const sync = glShit.reportPBOSyncs[readIndex];
                if (sync) {
                    const wait = gl.clientWaitSync(sync, 0, 0);
                    if (wait === gl.CONDITION_SATISFIED || wait === gl.ALREADY_SIGNALED) {
                        // Data ready: copy from PBO to CPU memory without blocking GPU
                        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, glShit.reportPBOs[readIndex]);
                        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, glShit.reportData);

                        // We can now process collisions from reportData
                        gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
                        // Unpack packed buffer (each RGBA pixel holds four source cells)
                        const pW = glShit.reportPackedW || Math.ceil(uraniumAtomsCountX / 2);
                        for (let i = 0; i < uraniumAtoms.length; i++) {
                            if (!uraniumAtoms[i].hasAtom) continue;
                            const gridIndex = uraniumAtoms[i].index;
                            const x = gridIndex % uraniumAtomsCountX;
                            const y = Math.floor(gridIndex / uraniumAtomsCountX);
                            const px = Math.floor(x / 2);
                            const py = Math.floor(y / 2);
                            const packedIdx = (py * pW + px) * 4;
                            const channel = (y % 2) * 2 + (x % 2);
                            const hitCount = glShit.reportData[packedIdx + channel];
                            if (hitCount > 0) {
                                ui.collisionsThisSecond += hitCount;
                                for (let j = 0; j < hitCount; j++) {
                                    uraniumAtoms[i].hitByNeutron();
                                    neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                                    neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                                }
                            }
                        }

                        // Cleanup sync and bound PBO
                        gl.deleteSync(glShit.reportPBOSyncs[readIndex]);
                        glShit.reportPBOSyncs[readIndex] = null;
                        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
                    } else {
                                    // GPU hasn't finished writing previous PBO yet; fallback to a
                                    // synchronous read to ensure collisions are not dropped on slow CPUs.
                                    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
                                    if (glShit.reportPackProgram) {
                                        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportPackedFBO);
                                        gl.readPixels(0, 0, packedW, packedH, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
                                    } else {
                                        gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
                                        gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
                                    }

                        gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
                        const pW = glShit.reportPackedW || Math.ceil(uraniumAtomsCountX / 2);
                        for (let i = 0; i < uraniumAtoms.length; i++) {
                            if (!uraniumAtoms[i].hasAtom) continue;
                            const gridIndex = uraniumAtoms[i].index;
                            const x = gridIndex % uraniumAtomsCountX;
                            const y = Math.floor(gridIndex / uraniumAtomsCountX);
                            const px = Math.floor(x / 2);
                            const py = Math.floor(y / 2);
                            const packedIdx = (py * pW + px) * 4;
                            const channel = (y % 2) * 2 + (x % 2);
                            const hitCount = glShit.reportData[packedIdx + channel];
                            if (hitCount > 0) {
                                ui.collisionsThisSecond += hitCount;
                                for (let j = 0; j < hitCount; j++) {
                                    uraniumAtoms[i].hitByNeutron();
                                    neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                                    neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                                }
                            }
                        }
                    }
                }
            } else {
                // First-time: pipeline not primed -> do synchronous read to ensure correctness
                gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
                if (glShit.reportPackProgram) {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportPackedFBO);
                    gl.readPixels(0, 0, packedW, packedH, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
                } else {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
                    gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
                }

                gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
                const pW = glShit.reportPackedW || Math.ceil(uraniumAtomsCountX / 2);
                for (let i = 0; i < uraniumAtoms.length; i++) {
                    if (!uraniumAtoms[i].hasAtom) continue;
                    const gridIndex = uraniumAtoms[i].index;
                    const x = gridIndex % uraniumAtomsCountX;
                    const y = Math.floor(gridIndex / uraniumAtomsCountX);
                    const px = Math.floor(x / 2);
                    const py = Math.floor(y / 2);
                    const packedIdx = (py * pW + px) * 4;
                    const channel = (y % 2) * 2 + (x % 2);
                    const hitCount = glShit.reportData[packedIdx + channel];
                    if (hitCount > 0) {
                        ui.collisionsThisSecond += hitCount;
                        for (let j = 0; j < hitCount; j++) {
                            uraniumAtoms[i].hitByNeutron();
                            neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                            neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                        }
                    }
                }
                glShit.reportPBOPrimed = true;
            }
        } else {
            // No PBOs available: fall back to synchronous read
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            if (glShit.reportPackProgram) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportPackedFBO);
                gl.readPixels(0, 0, packedW, packedH, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
                gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
            }
            gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
            const pW = glShit.reportPackedW || Math.ceil(uraniumAtomsCountX / 2);
            for (let i = 0; i < uraniumAtoms.length; i++) {
                if (!uraniumAtoms[i].hasAtom) continue;
                const gridIndex = uraniumAtoms[i].index;
                const x = gridIndex % uraniumAtomsCountX;
                const y = Math.floor(gridIndex / uraniumAtomsCountX);
                const px = Math.floor(x / 2);
                const py = Math.floor(y / 2);
                const packedIdx = (py * pW + px) * 4;
                const channel = (y % 2) * 2 + (x % 2);

                const hitCount = glShit.reportData[packedIdx + channel];
                if (hitCount > 0) {
                    ui.collisionsThisSecond += hitCount;
                    for (let j = 0; j < hitCount; j++) {
                        uraniumAtoms[i].hitByNeutron();
                        neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                        neutron.spawn(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                    }
                }
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    reset(gl) {
        const activeGl = gl || glShit.simGL;
        if (!activeGl) return;

            glShit.reportData.fill(0);

        if (glShit.reportPBOSyncs && Array.isArray(glShit.reportPBOSyncs)) {
            for (let i = 0; i < glShit.reportPBOSyncs.length; i++) {
                const sync = glShit.reportPBOSyncs[i];
                if (sync) {
                    activeGl.deleteSync(sync);
                    glShit.reportPBOSyncs[i] = null;
                }
            }
        }

        if (glShit.reportPBOs && Array.isArray(glShit.reportPBOs)) {
            for (let i = 0; i < glShit.reportPBOs.length; i++) {
                const pbo = glShit.reportPBOs[i];
                if (!pbo) continue;
                activeGl.bindBuffer(activeGl.PIXEL_PACK_BUFFER, pbo);
                activeGl.bufferData(activeGl.PIXEL_PACK_BUFFER, glShit.reportPBOSize || 0, activeGl.STREAM_READ);
            }
            activeGl.bindBuffer(activeGl.PIXEL_PACK_BUFFER, null);
        }

        if (glShit.reportFBO) {
            activeGl.bindFramebuffer(activeGl.FRAMEBUFFER, glShit.reportFBO);
            activeGl.viewport(0, 0, uraniumAtomsCountX, uraniumAtomsCountY);
            activeGl.clearColor(0, 0, 0, 0);
            activeGl.clear(activeGl.COLOR_BUFFER_BIT);
            activeGl.bindFramebuffer(activeGl.FRAMEBUFFER, null);
        }

        if (glShit.reportPackedFBO) {
            const pW = glShit.reportPackedW || Math.ceil(uraniumAtomsCountX / 2);
            const pH = glShit.reportPackedH || Math.ceil(uraniumAtomsCountY / 2);
            activeGl.bindFramebuffer(activeGl.FRAMEBUFFER, glShit.reportPackedFBO);
            activeGl.viewport(0, 0, pW, pH);
            activeGl.clearColor(0, 0, 0, 0);
            activeGl.clear(activeGl.COLOR_BUFFER_BIT);
            activeGl.bindFramebuffer(activeGl.FRAMEBUFFER, null);
        }

        glShit.reportPBOIndex = 0;
        glShit.reportPBOPrimed = false;
    }
}

const reportSystem = new ReportSystem();
