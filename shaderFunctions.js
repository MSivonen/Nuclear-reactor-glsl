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
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
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

    // IMPORTANT: always clear write target
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(simProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex);
    gl.uniform1i(uNeutronsLoc, 0);

    drawFullscreenQuad(gl);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // ping-pong
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