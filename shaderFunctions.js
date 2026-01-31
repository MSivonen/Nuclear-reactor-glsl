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

function initRenderShader(gl, vsSource, fsSource) {
    glShit.renderProgram = createProgram(gl, vsSource, fsSource);
    glShit.uRenderResLoc = gl.getUniformLocation(glShit.renderProgram, "u_resolution");
    glShit.uRenderTexSizeLoc = gl.getUniformLocation(glShit.renderProgram, "u_textureSize");
    glShit.uRenderSimSizeLoc = gl.getUniformLocation(glShit.renderProgram, "u_simSize");
    glShit.uRenderNeutronSizeLoc = gl.getUniformLocation(glShit.renderProgram, "u_neutronSize");
    glShit.uRenderNeutronsLoc = gl.getUniformLocation(glShit.renderProgram, "u_neutrons");

    gl.useProgram(glShit.renderProgram);
    gl.uniform1i(glShit.uRenderNeutronsLoc, 0);
    gl.useProgram(null);
}

