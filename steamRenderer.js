// GPU instanced renderer for steam (water cells)
class SteamRenderer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.instanceBuffer = null;
        this.maxInstances = 0;
        this.instanceFloatCount = 5; // x,y, sizeX,sizeY, alpha
        this.instanceData = null;
        this.lastCount = 0;
    }

    init(simGL, maxInst, vsSource, fsSource) {
        if (!simGL) return false;
        this.gl = simGL;
        this.maxInstances = maxInst || 2048;
        this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
        if (!vsSource || !fsSource) {
            throw new Error('steamRenderer shader sources missing');
        }
        this.program = createProgram(this.gl, vsSource, fsSource);

        const quad = new Float32Array([
            -0.5, -0.5,
            0.5, -0.5,
            -0.5, 0.5,
            -0.5, 0.5,
            0.5, -0.5,
            0.5, 0.5
        ]);

        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        const quadVbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadVbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quad, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        this.instanceBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);

        let offset = 0;
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(1, 1);
        offset += 2 * 4;

        this.gl.enableVertexAttribArray(2);
        this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(2, 1);
        offset += 2 * 4;

        this.gl.enableVertexAttribArray(3);
        this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(3, 1);
        offset += 1 * 4;

        this.gl.bindVertexArray(null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        return true;
    }

    updateInstances(waterCells) {
        const count = waterCells.length;
        if (count > this.maxInstances) {
            this.maxInstances = count;
            this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        }

        const sizeX = uraniumAtomsSpacingX * 2.02;
        const sizeY = uraniumAtomsSpacingY * 2.02;
        const alphaScale = 200.0 / 255.0;

        for (let i = 0; i < count; i++) {
            const cell = waterCells[i];
            const base = i * this.instanceFloatCount;

            const t = (cell.temperature - 25) / (1700 - 25);
            const clamped = Math.max(0, Math.min(1, t));
            const alpha = clamped * alphaScale;

            this.instanceData[base + 0] = cell.position.x;
            this.instanceData[base + 1] = cell.position.y;
            this.instanceData[base + 2] = sizeX;
            this.instanceData[base + 3] = sizeY;
            this.instanceData[base + 4] = alpha;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, count * this.instanceFloatCount);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.lastCount = count;
        return count;
    }

    draw(count) {
        if (!this.gl || !this.program) return;
        const instanceCount = count ?? this.lastCount;
        this.gl.useProgram(this.program);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.bindVertexArray(this.vao);
        const uResLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.gl.uniform2f(uResLoc, this.gl.canvas.width, this.gl.canvas.height);
        const rendHeightLoc = this.gl.getUniformLocation(this.program, "render_height");
        // Instance positions are in simulation/draw coordinates (screenDrawWidth/Height)
        // so the shader can scale+letterbox into the render canvas.
        this.gl.uniform1f(rendHeightLoc, screenHeight);
        const rendWidthLoc = this.gl.getUniformLocation(this.program, "render_width");
        this.gl.uniform1f(rendWidthLoc, screenSimWidth);
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, instanceCount);
        this.gl.bindVertexArray(null);
        this.gl.disable(this.gl.BLEND);
        this.gl.useProgram(null);
    }
}

const steamRenderer = new SteamRenderer();
