// waterLayer.js
// Renders a fullscreen water shader pass into the existing WebGL context.

class WaterLayer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.uResolutionLoc = null;
        this.uTimeLoc = null;
    }

    init(simGL, vsSourceExternal, fsSourceExternal) {
        if (!simGL) return;
        if (!vsSourceExternal || !fsSourceExternal) {
            console.error('waterLayer.init requires vertex and fragment shader source strings');
            return;
        }
        this.gl = simGL;
        this.program = createProgram(this.gl, vsSourceExternal, fsSourceExternal);

        // Fullscreen quad (two triangles)
        const quad = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);

        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        const vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quad, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        this.uResolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.uTimeLoc = this.gl.getUniformLocation(this.program, 'u_time');

        this.gl.bindVertexArray(null);
    }

    render(timeSeconds) {
        if (!this.gl || !this.program) return;
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        if (this.uResolutionLoc) this.gl.uniform2f(this.uResolutionLoc, this.gl.canvas.width, this.gl.canvas.height);
        if (this.uTimeLoc) this.gl.uniform1f(this.uTimeLoc, timeSeconds || 0.0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.gl.bindVertexArray(null);
    }
}

const waterLayer = new WaterLayer();
