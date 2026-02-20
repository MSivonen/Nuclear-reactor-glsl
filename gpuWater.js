/* Lightweight GPU water diffusion helper
 * Creates two RGBA32F textures and FBOs and runs a ping-pong thermal shader.
 */
function GpuWaterSystem() {
    this.width = 0;
    this.height = 0;
    this.readTex = null;
    this.writeTex = null;
    this.readFBO = null;
    this.writeFBO = null;
    this.uploadBuffer = null; // RGBA float buffer for uploads
}

GpuWaterSystem.prototype.init = function(gl, width, height, initialTemps) {
    this.width = width;
    this.height = height;

    // Allocate textures
    const w = width;
    const h = height;

    const makeTex = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // Allocate RGBA32F texture; initial null data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return tex;
    };

    this.readTex = makeTex();
    this.writeTex = makeTex();

    const makeFbo = (tex) => {
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return f;
    };

    this.readFBO = makeFbo(this.readTex);
    this.writeFBO = makeFbo(this.writeTex);

    // Preallocate upload buffer (RGBA per pixel)
    this.uploadBuffer = new Float32Array(w * h * 4);
    if (initialTemps && initialTemps.length === w * h) {
        for (let i = 0; i < w * h; i++) {
            const base = i * 4;
            this.uploadBuffer[base] = initialTemps[i];
            this.uploadBuffer[base + 1] = 0.0;
            this.uploadBuffer[base + 2] = 0.0;
            this.uploadBuffer[base + 3] = 1.0;
        }
        // upload to readTex
        gl.bindTexture(gl.TEXTURE_2D, this.readTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.FLOAT, this.uploadBuffer);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Cache thermal program uniform locations if program exists
    if (glShit && glShit.thermalProgram) {
        gl.useProgram(glShit.thermalProgram);
        glShit.thermalUniforms = {
            u_texture: gl.getUniformLocation(glShit.thermalProgram, 'u_texture'),
            u_resolution: gl.getUniformLocation(glShit.thermalProgram, 'u_resolution'),
            u_dt: gl.getUniformLocation(glShit.thermalProgram, 'u_dt'),
            u_heatTransferCoefficient: gl.getUniformLocation(glShit.thermalProgram, 'u_heatTransferCoefficient'),
            u_waterFlowSpeed: gl.getUniformLocation(glShit.thermalProgram, 'u_waterFlowSpeed'),
            u_inletTemp: gl.getUniformLocation(glShit.thermalProgram, 'u_inletTemp')
        };
        gl.useProgram(null);
    }
};

GpuWaterSystem.prototype.uploadAll = function(gl, temps) {
    const w = this.width;
    const h = this.height;
    const buf = this.uploadBuffer;
    if (!buf || buf.length !== w * h * 4) this.uploadBuffer = buf = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const base = i * 4;
        buf[base] = temps[i];
        buf[base + 1] = 0.0;
        buf[base + 2] = 0.0;
        buf[base + 3] = 1.0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.readTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.FLOAT, buf);
    gl.bindTexture(gl.TEXTURE_2D, null);
};

GpuWaterSystem.prototype.step = function(gl, dtSeconds, settings) {
    if (!glShit || !glShit.thermalProgram) return;
    const w = this.width;
    const h = this.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeFBO);
    gl.viewport(0, 0, w, h);
    gl.useProgram(glShit.thermalProgram);

    // bind input
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.readTex);
    const u = (glShit.thermalUniforms || {});
    if (u.u_texture) gl.uniform1i(u.u_texture, 0);
    if (u.u_resolution) gl.uniform2f(u.u_resolution, w, h);
    if (u.u_dt) gl.uniform1f(u.u_dt, dtSeconds);
    if (u.u_heatTransferCoefficient) gl.uniform1f(u.u_heatTransferCoefficient, settings.heatTransferCoefficient || 0.1);
    if (u.u_waterFlowSpeed) gl.uniform1f(u.u_waterFlowSpeed, settings.waterFlowSpeed || 0.0);
    if (u.u_inletTemp) gl.uniform1f(u.u_inletTemp, settings.inletTemperature || 25.0);

    drawFullscreenQuad(gl);

    // ping-pong
    const tmpTex = this.readTex;
    this.readTex = this.writeTex;
    this.writeTex = tmpTex;
    const tmpFbo = this.readFBO;
    this.readFBO = this.writeFBO;
    this.writeFBO = tmpFbo;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

GpuWaterSystem.prototype.readTopRow = function(gl, dest) {
    // dest is Float32Array of length width
    const w = this.width;
    if (!dest || dest.length < w) return;
    const tmp = new Float32Array(w * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFBO);
    gl.readPixels(0, 0, w, 1, gl.RGBA, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (let x = 0; x < w; x++) dest[x] = tmp[x * 4];
};

GpuWaterSystem.prototype.readAll = function(gl, destTemps) {
    const w = this.width;
    const h = this.height;
    const tmp = new Float32Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFBO);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (let i = 0; i < w * h; i++) destTemps[i] = tmp[i * 4];
};

// Export to global so sceneHelpers can instantiate
window.GpuWaterSystem = GpuWaterSystem;
