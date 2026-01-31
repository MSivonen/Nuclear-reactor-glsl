// waterLayer.js
// Renders a fullscreen water shader pass into the existing simGL context.

const waterLayer = (function () {
    let gl = null;
    let program = null;
    let vao = null;
    let uResolutionLoc = null;
    let uTimeLoc = null;

    function init(simGL, vsSourceExternal, fsSourceExternal) {
        if (!simGL) return;
        if (!vsSourceExternal || !fsSourceExternal) {
            console.error('waterLayer.init requires vertex and fragment shader source strings');
            return;
        }
        gl = simGL;
        const vert = vsSourceExternal;
        const frag = fsSourceExternal;
        program = createProgram(gl, vert, frag);

        // Fullscreen quad (two triangles)
        const quad = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);

        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        uTimeLoc = gl.getUniformLocation(program, 'u_time');

        gl.bindVertexArray(null);
    }

    function render(timeSeconds) {
        if (!gl || !program) return;
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        if (uResolutionLoc) gl.uniform2f(uResolutionLoc, gl.canvas.width, gl.canvas.height);
        if (uTimeLoc) gl.uniform1f(uTimeLoc, timeSeconds || 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    }

    return { init, render };
})();
