// GPU instanced renderer for uranium atoms
const atomsRenderer = (function () {
    let gl = null;
    let program = null;
    let vao = null;
    let instanceBuffer = null;
    let maxInstances = 0;
    let instanceFloatCount = 8; // x,y, r,g,b,a, size, flash
    let instanceData = null;

    const vsSource = `#version 300 es
    precision highp float;
    layout(location=0) in vec2 a_quadPos;
    layout(location=1) in vec2 a_instPos;
    layout(location=2) in vec4 a_instColor;
    layout(location=3) in float a_instSize;
    layout(location=4) in float a_instFlash;
    uniform vec2 u_resolution;
    uniform float render_height;
    uniform float render_width;
    out vec4 vColor;
    out float vFlash;
    void main(){
        vec2 pos = a_instPos + a_quadPos * a_instSize;
        float scale = u_resolution.y / render_height;
        float drawWidth = render_width * scale;
        float offsetX = (u_resolution.x - drawWidth) / 2.0;
        float screenX = pos.x * scale + offsetX;
        float screenY = pos.y * scale;
        float x = (screenX / u_resolution.x) * 2.0 - 1.0;
        float y = (screenY / u_resolution.y) * -2.0 + 1.0;
        gl_Position = vec4(x, y, 0.0, 1.0);
        vColor = a_instColor;
        vFlash = a_instFlash;
    }
    `;

    const fsSource = `#version 300 es
    precision highp float;
    in vec4 vColor;
    in float vFlash;
    out vec4 outColor;
    void main(){
        vec4 col = vColor;
        if(vFlash>0.5) col = vec4(1.0,1.0,1.0,1.0);
        outColor = col;
    }
    `;

    function createShader(gl, type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    function createProgram(gl, vs, fs) {
        const vsS = createShader(gl, gl.VERTEX_SHADER, vs);
        const fsS = createShader(gl, gl.FRAGMENT_SHADER, fs);
        const p = gl.createProgram();
        gl.attachShader(p, vsS);
        gl.attachShader(p, fsS);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(p));
            return null;
        }
        return p;
    }

    function init(simGL, maxInst) {
        if (!simGL) return false;
        gl = simGL;
        maxInstances = maxInst || 2048;
        instanceData = new Float32Array(maxInstances * instanceFloatCount);

        program = createProgram(gl, vsSource, fsSource);

        // Quad (6 verts)
        const quad = new Float32Array([
            -0.5, -0.5,
            0.5, -0.5,
            -0.5, 0.5,
            -0.5, 0.5,
            0.5, -0.5,
            0.5, 0.5
        ]);

        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const quadVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        instanceBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.DYNAMIC_DRAW);

        // a_instPos (location 1) vec2
        let offset = 0;
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, instanceFloatCount * 4, offset);
        gl.vertexAttribDivisor(1, 1);
        offset += 2 * 4;

        // a_instColor (location 2) vec4
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, instanceFloatCount * 4, offset);
        gl.vertexAttribDivisor(2, 1);
        offset += 4 * 4;

        // a_instSize (location 3) float
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, instanceFloatCount * 4, offset);
        gl.vertexAttribDivisor(3, 1);
        offset += 1 * 4;

        // a_instFlash (location 4) float
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 1, gl.FLOAT, false, instanceFloatCount * 4, offset);
        gl.vertexAttribDivisor(4, 1);
        offset += 1 * 4;

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return true;
    }

    function updateInstances(atoms) {
        const count = atoms.length;
        if (count > maxInstances) {
            // reallocate
            maxInstances = count;
            instanceData = new Float32Array(maxInstances * instanceFloatCount);
            gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        for (let i = 0; i < count; i++) {
            const a = atoms[i];
            const base = i * instanceFloatCount;
            instanceData[base + 0] = a.position.x;
            instanceData[base + 1] = a.position.y;
            // p5 color -> components 0..255
            const r = red(a.color) / 255.0;
            const g = green(a.color) / 255.0;
            const b = blue(a.color) / 255.0;
            const alpha = (a.flash > 0) ? 1.0 : 1.0;
            instanceData[base + 2] = r;
            instanceData[base + 3] = g;
            instanceData[base + 4] = b;
            instanceData[base + 5] = alpha;
            instanceData[base + 6] = a.radius * 2.0; // size diameter
            instanceData[base + 7] = (a.flash > 0) ? 1.0 : 0.0;
        }

        // Upload to GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData, 0, count * instanceFloatCount);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return count;
    }

    function draw(count) {
        if (!gl || !program) return;
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        const uResLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(uResLoc, gl.canvas.width, gl.canvas.height);
        const rendHeightLoc = gl.getUniformLocation(program, "render_height");
        gl.uniform1f(rendHeightLoc, screenRenderHeight);
        const rendWidthLoc = gl.getUniformLocation(program, "render_width");
        gl.uniform1f(rendWidthLoc, screenRenderWidth);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }

    function renderImage() {
        const gl2 = glShit.simGL;

        gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
        gl2.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height);
        gl2.clearColor(0, 0, 0, 0);
        gl2.clear(gl2.COLOR_BUFFER_BIT);

        atomsRenderer.draw(uraniumAtoms.length);


        if (!glShit.p5Copy) {
            glShit.p5Copy = createGraphics(
                screenDrawWidth,
                screenDrawHeight
            );
        }

        glShit.p5Copy.drawingContext.drawImage(
            glShit.simCanvas,
            0,
            0
        );

        image(glShit.p5Copy, 0, 0);
    }

    return { init, updateInstances, draw, renderImage };
})();
