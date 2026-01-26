// ==========================================================
// GPU neutron simulation helpers
// ==========================================================

// ----------------------------------------------------------
// Texture creation
// ----------------------------------------------------------
function createNeutronTexture(gl, data) {
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

// ----------------------------------------------------------
// Framebuffer
// ----------------------------------------------------------
function createFBO(gl, tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    );

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("FBO incomplete:", status.toString(16));
        throw new Error("Framebuffer not complete");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
}

// ----------------------------------------------------------
// Shader program
// ----------------------------------------------------------
function createProgram(gl, vertSrc, fragSrc) {
    function compile(type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);

        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            throw new Error("Shader compile failed");
        }
        return s;
    }

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        throw new Error("Program link failed");
    }

    return program;
}

// ----------------------------------------------------------
// Fullscreen quad
// ----------------------------------------------------------
function drawFullscreenQuad(gl) {
    if (!glShit.quadVao) {
        glShit.quadVao = gl.createVertexArray();
        gl.bindVertexArray(glShit.quadVao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        const verts = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        // layout(location = 0) in vec2 a_pos;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    gl.bindVertexArray(glShit.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
}

// ----------------------------------------------------------
// GPU simulation step
// ----------------------------------------------------------
function gpuUpdateNeutrons(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.writeFBO);
    gl.viewport(0, 0, MAX_NEUTRONS, MAX_NEUTRONS);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(glShit.simProgram);

    let rodYPos = controlRods[0].y+screenDrawHeight;
    let uRodsLoc = gl.getUniformLocation(glShit.simProgram, "u_controlRods");
    gl.uniform1f(uRodsLoc, rodYPos);

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

// ----------------------------------------------------------
// Readback (DEBUG / transitional only)
// ----------------------------------------------------------
function readFrameBuffer(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.readFBO);

    gl.readPixels(
        0,
        0,
        MAX_NEUTRONS,
        MAX_NEUTRONS,
        gl.RGBA,
        gl.FLOAT,
        neutronBuffer
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


// ----------------------------------------------------------
// CPU -> GPU Injection helper
// ----------------------------------------------------------
function updateNeutronInTexture(gl, index, x, y, vx, vy) {
    // Varmistetaan että kirjoitamme nykyiseen input-tekstuuriin
    gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);

    const data = new Float32Array([x, y, vx, vy]);

    // Muutetaan lineaarinen indeksi (0...MAX^2) 2D-koordinaateiksi (x, y)
    const texX = index % MAX_NEUTRONS;
    const texY = Math.floor(index / MAX_NEUTRONS);

    gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);
    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,          // level
        texX,       // xoffset
        texY,       // yoffset
        1,          // width
        1,          // height
        gl.RGBA,    // format
        gl.FLOAT,   // type
        data
    );

    gl.bindTexture(gl.TEXTURE_2D, glShit.writeTex);
    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,          // level
        texX,       // xoffset
        texY,       // yoffset
        1,          // width
        1,          // height
        gl.RGBA,    // format
        gl.FLOAT,   // type
        data
    );

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function initRenderShader(gl, vsSource, fsSource) {
    glShit.renderProgram = createProgram(gl, vsSource, fsSource);
    glShit.uRenderResLoc = gl.getUniformLocation(glShit.renderProgram, "u_resolution");
    glShit.uRenderTexSizeLoc = gl.getUniformLocation(glShit.renderProgram, "u_textureSize");
}

function gpuDrawNeutrons(gl) {
    gl.useProgram(glShit.renderProgram);

    gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(glShit.simGL.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let uTexSizeLoc = gl.getUniformLocation(glShit.renderProgram, "u_textureSize");
    let uResLoc = gl.getUniformLocation(glShit.renderProgram, "u_resolution");
    let uSimLoc = gl.getUniformLocation(glShit.renderProgram, "u_simSize");
    let uNeutronSize = gl.getUniformLocation(glShit.renderProgram, "u_neutronSize");

    gl.uniform1i(uTexSizeLoc, MAX_NEUTRONS); // 256
    gl.uniform2f(uResLoc, glShit.simCanvas.width, glShit.simCanvas.height);
    gl.uniform2f(uSimLoc, 800.0, 600.0); // Simulaation sisäinen koko
    gl.uniform1f(uNeutronSize, settings.neutronSize); 

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glShit.readTex);

    // Piirretään pisteet
    gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);
    gl.disable(gl.BLEND);
    gl.useProgram(null);
}

function initReportSystem(gl) {
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

        let uCountXLoc = gl.getUniformLocation(glShit.reportProgram, "u_uraniumCountX");
        let uCountYLoc = gl.getUniformLocation(glShit.reportProgram, "u_uraniumCountY");
        let uTexSizeLoc = gl.getUniformLocation(glShit.reportProgram, "u_textureSize");

    gl.uniform1i(uCountXLoc, uraniumAtomsCountX); 
    gl.uniform1i(uCountYLoc, uraniumAtomsCountY); 
    gl.uniform1i(uTexSizeLoc, MAX_NEUTRONS); // Esim. 256

    glShit.reportData = new Uint8Array(uraniumAtomsCountX * uraniumAtomsCountY * 4);
    // Try to create two PIXEL_PACK_BUFFERs (PBOs) for asynchronous readback
    if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext && typeof gl.getBufferSubData === 'function') {
        const pboSize = glShit.reportData.length; // bytes for Uint8Array
        glShit.reportPBOs = [gl.createBuffer(), gl.createBuffer()];
        for (let b of glShit.reportPBOs) {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b);
            // Allocate buffer storage (orphan previous to avoid stalls)
            gl.bufferData(gl.PIXEL_PACK_BUFFER, pboSize, gl.STREAM_READ);
        }
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        glShit.reportPBOIndex = 0;
        glShit.reportPBOSize = pboSize;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function processCollisions(gl) {
    // 1. Piirretään osumat raporttitekstuuriin (GPU sisäinen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, glShit.reportFBO);
    gl.viewport(0, 0, uraniumAtomsCountX, uraniumAtomsCountY); // Pieni koko riittää atomeille
    gl.disable(gl.BLEND);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(glShit.reportProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glShit.readTex); // Luetaan neutronien tila
    gl.uniform1i(gl.getUniformLocation(glShit.reportProgram, "u_neutrons"), 0);
    gl.uniform1i(gl.getUniformLocation(glShit.reportProgram, "u_textureSize"), MAX_NEUTRONS);
    // Käytetään Additive Blendingiä: jos useampi neutroni osuu samaan atomiin, 
    // väriarvo kasvaa (1.0, 2.0, jne.)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.bindVertexArray(glShit.reportVao);
    gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);

    // 2. Read back the report texture into CPU memory.
    // If WebGL2 PBOs are available we use double-buffered PIXEL_PACK_BUFFERs
    // to reduce GPU/CPU sync stalls. Otherwise fall back to readPixels.
    if (glShit.reportPBOs && typeof gl.getBufferSubData === 'function') {
        const w = uraniumAtomsCountX;
        const h = uraniumAtomsCountY;

        // Write into the 'current' PBO (orphan first to avoid stalls)
        const writePBO = glShit.reportPBOs[glShit.reportPBOIndex];
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, writePBO);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, glShit.reportPBOSize, gl.STREAM_READ);
        // readPixels with offset 0 writes into bound PIXEL_PACK_BUFFER
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0);

        // Read back data from the previous PBO (if any) into reportData.
        const readPBO = glShit.reportPBOs[(glShit.reportPBOIndex + 1) % 2];
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, readPBO);
        try {
            // getBufferSubData will copy PBO contents into the JS array.
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, glShit.reportData);
        } catch (e) {
            // If anything goes wrong, fall back to synchronous readPixels
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
        }

        // Unbind and advance PBO index so next frame we swap roles
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        glShit.reportPBOIndex = (glShit.reportPBOIndex + 1) % 2;
        gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
    } else {
        // Fallback: blocking readPixels
        gl.readPixels(0, 0, uraniumAtomsCountX, uraniumAtomsCountY, gl.RGBA, gl.UNSIGNED_BYTE, glShit.reportData);
        gl.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
    }
    /*     if (frameCount % 60 === 0) { // Kerran sekunnissa
    console.log("Osumadataa raportissa:", glState.reportData.find(x => x > 0));
    } */
    // 3. Reagoidaan osumiin CPU:lla
        for (let i = 0; i < uraniumAtoms.length; i++) {
            const gridIndex = uraniumAtoms[i].index;
            const x = gridIndex % uraniumAtomsCountX;
            const y = Math.floor(gridIndex / uraniumAtomsCountX);

            // report.vert maps atom row y -> same row in the report texture
            // and readPixels fills the buffer bottom-to-top, so the buffer row
            // corresponding to the atom is simply y. No additional flip needed.
            const idx = (y * uraniumAtomsCountX + x) * 4;

            let hitCount = glShit.reportData[idx];
            if (hitCount > 0) {
                for (let j = 0; j < hitCount; j++) {
                    uraniumAtoms[i].hitByNeutron();
                    // Syntyy kaksi uutta neutronia
                    spawnNeutron(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                    spawnNeutron(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                }
            }
        }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function spawnNeutron(x, y, atomRadius) {
    // Ring-buffer logiikka
    currentNeutronIndex = (currentNeutronIndex + 1) % MAX_NEUTRONS_SQUARED;

    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * settings.neutronSpeed;
    const vy = Math.sin(angle) * settings.neutronSpeed;

    // Siirto atomin ulkopuolelle
    const spawnOffset = atomRadius * 2;
    const finalX = x + Math.cos(angle) * spawnOffset;
    const finalY = y + Math.sin(angle) * spawnOffset;

    // Päivitetään vain tekstuurin tiettyä kohtaa (yksi pikseli)
    updateNeutronInTexture(glShit.simGL, currentNeutronIndex, finalX, finalY, vx, vy);
}