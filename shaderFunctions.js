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
    if (!quadVao) {
        quadVao = gl.createVertexArray();
        gl.bindVertexArray(quadVao);

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

    gl.bindVertexArray(quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
}

// ----------------------------------------------------------
// GPU simulation step
// ----------------------------------------------------------
function gpuUpdateNeutrons(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO);
    gl.viewport(0, 0, MAX_NEUTRONS, MAX_NEUTRONS);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(simProgram);


    // Huom: käytä rod.position.y jos ControlRod on p5-tyylinen olio, 
    // tai rod.y jos se on simppeli objekti.
    let rodYPos = controlRods.map(r => r.position ? r.position.y + screenDrawHeight / 2 : 0);
    let uRodsLoc = gl.getUniformLocation(simProgram, "u_controlRods");
    gl.uniform1fv(uRodsLoc, rodYPos);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex);
    gl.uniform1i(uNeutronsLoc, 0);

    drawFullscreenQuad(gl);

    // Ping-pong
    const tmpTex = readTex;
    readTex = writeTex;
    writeTex = tmpTex;

    const tmpFbo = readFBO;
    readFBO = writeFBO;
    writeFBO = tmpFbo;
}

// ----------------------------------------------------------
// Readback (DEBUG / transitional only)
// ----------------------------------------------------------
function readFrameBuffer(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, readFBO);

    gl.readPixels(
        0,
        0,
        MAX_NEUTRONS,
        MAX_NEUTRONS,
        gl.RGBA,
        gl.FLOAT,
        neutronSystem.buffer
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


// ----------------------------------------------------------
// CPU -> GPU Injection helper
// ----------------------------------------------------------
function updateNeutronInTexture(gl, index, x, y, vx, vy) {
    // Varmistetaan että kirjoitamme nykyiseen input-tekstuuriin
    gl.bindTexture(gl.TEXTURE_2D, readTex);

    const data = new Float32Array([x, y, vx, vy]);

    // Muutetaan lineaarinen indeksi (0...MAX^2) 2D-koordinaateiksi (x, y)
    const texX = index % MAX_NEUTRONS;
    const texY = Math.floor(index / MAX_NEUTRONS);

    gl.bindTexture(gl.TEXTURE_2D, readTex);
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

    gl.bindTexture(gl.TEXTURE_2D, writeTex);
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

// Kutsu tätä setupissa
function initRenderShader(gl, vsSource, fsSource) {
    renderProgram = createProgram(gl, vsSource, fsSource);
    uRenderResLoc = gl.getUniformLocation(renderProgram, "u_resolution");
    uRenderTexSizeLoc = gl.getUniformLocation(renderProgram, "u_textureSize");
}

function gpuDrawNeutrons(gl) {
    gl.useProgram(renderProgram);

    gl.viewport(0, 0, simCanvas.width, simCanvas.height);
    gl.clearColor(0, 0, 0, 0); // Läpinäkyvä tausta
    gl.clear(simGL.COLOR_BUFFER_BIT);

    // Asetetaan uniformit
    let uTexSizeLoc = gl.getUniformLocation(renderProgram, "u_textureSize");
    let uResLoc = gl.getUniformLocation(renderProgram, "u_resolution");
    let uSimLoc = gl.getUniformLocation(renderProgram, "u_simSize");

    gl.uniform1i(uTexSizeLoc, MAX_NEUTRONS); // 256
    gl.uniform2f(uResLoc, simCanvas.width, simCanvas.height); // 1324, 768
    gl.uniform2f(uSimLoc, 800.0, 600.0); // Simulaation sisäinen koko

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex);

    // Piirretään pisteet
    gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);

    gl.useProgram(null);
}

function initReportSystem(gl) {
    // Luodaan tekstuuri, joka on tarpeeksi suuri kaikille atomeille
    // 41x30 grid -> esim. 64x64 tekstuuri on helppo
    reportTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, reportTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, uraniumAtomsCountX, uraniumAtomsCountY, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    reportFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, reportFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reportTex, 0);

    gl.useProgram(reportProgram);

    // 1. Hae muuttujien sijainnit (tämä kannattaa tehdä vain kerran initissä, mutta toimii tässäkin)
    let uCountXLoc = gl.getUniformLocation(reportProgram, "u_uraniumCountX");
    let uCountYLoc = gl.getUniformLocation(reportProgram, "u_uraniumCountY");
    let uTexSizeLoc = gl.getUniformLocation(reportProgram, "u_textureSize");

    // 2. Aseta arvot: gl.uniform1i(location, value)
    gl.uniform1i(uCountXLoc, uraniumAtomsCountX); // uraniumAtomsCountX
    gl.uniform1i(uCountYLoc, uraniumAtomsCountY); // uraniumAtomsCountY
    gl.uniform1i(uTexSizeLoc, MAX_NEUTRONS); // Esim. 256

    reportData = new Uint8Array(uraniumAtomsCountX * uraniumAtomsCountY * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // Lataa reportProgram täällä vastaavasti kuin muut
}


function processCollisions(gl) {
    // 1. Piirretään osumat raporttitekstuuriin (GPU sisäinen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, reportFBO);
    gl.viewport(0, 0, 64, 64); // Pieni koko riittää atomeille
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(reportProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex); // Luetaan neutronien tila
    gl.uniform1i(gl.getUniformLocation(reportProgram, "u_neutrons"), 0);

    // Käytetään Additive Blendingiä: jos useampi neutroni osuu samaan atomiin, 
    // väriarvo kasvaa (1.0, 2.0, jne.)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.drawArrays(gl.POINTS, 0, MAX_NEUTRONS_SQUARED);

    gl.disable(gl.BLEND);

    // 2. Luetaan vain raporttitekstuuri (paljon nopeampi kuin neutronitekstuuri)
    gl.readPixels(0, 0, uraniumAtomsCountX, uraniumAtomsCountY, gl.RGBA, gl.UNSIGNED_BYTE, reportData);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, simCanvas.width, simCanvas.height);
    if (frameCount % 60 === 0) { // Kerran sekunnissa
        console.log("Osumadataa raportissa:", reportData.find(x => x > 0));
    }
    // 3. Reagoidaan osumiin CPU:lla
    for (let i = 0; i < uraniumAtoms.length; i++) {
        // Punainen kanava sisältää osumien määrän (Additive blendingin ansiosta)
        let hitCount = reportData[i * 4];
        if (hitCount > 0) {
            for (let j = 0; j < hitCount; j++) {
                uraniumAtoms[i].hitByNeutron();
                // Syntyy kaksi uutta neutronia
                spawnNeutron(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
                spawnNeutron(uraniumAtoms[i].position.x, uraniumAtoms[i].position.y, uraniumAtoms[i].radius);
            }
        }
    }
}


function spawnNeutron(x, y, atomRadius) {
    // Ring-buffer logiikka
    currentNeutronIndex = (currentNeutronIndex + 1) % MAX_NEUTRONS_SQUARED;

    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * neutronSpeed;
    const vy = Math.sin(angle) * neutronSpeed;

    // Siirto atomin ulkopuolelle
    const spawnOffset = atomRadius * 2;
    const finalX = x + Math.cos(angle) * spawnOffset;
    const finalY = y + Math.sin(angle) * spawnOffset;

    // Päivitetään vain tekstuurin tiettyä kohtaa (yksi pikseli)
    updateNeutronInTexture(simGL, currentNeutronIndex, finalX, finalY, vx, vy);
}