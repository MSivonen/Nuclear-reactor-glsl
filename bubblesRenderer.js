// GPU instanced renderer for bubbles
class BubblesRenderer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.instanceBuffer = null;
        this.maxInstances = 0;
        this.instanceFloatCount = 5; // startX, speed, phase, size, offset
        this.instanceData = null;
    }

    init(simGL, maxInst, vsSource, fsSource) {
        if (!simGL) return false;
        this.gl = simGL;
        this.maxInstances = maxInst || 100;
        this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);

        // Initialize random data
        for (let i = 0; i < this.maxInstances; i++) {
            const idx = i * this.instanceFloatCount;

            this.instanceData[idx + 0] = Math.random() * screenSimWidth;

            // size: "small" -> 2..22
            const minSize = 2 * globalScale;
            const maxSize = 22 * globalScale;
            const size = minSize + Math.random() * (maxSize - minSize);
            this.instanceData[idx + 3] = size;

            // phase: random 0..PI*2
            this.instanceData[idx + 2] = Math.random() * Math.PI * 2;

            // speed: map from size so bigger bubbles are faster (100..400)
            const minSpeed = 100 * globalScale;
            const maxSpeed = 300 * globalScale;
            const t = (size - minSize) / (maxSize - minSize);
            this.instanceData[idx + 1] = minSpeed + t * (maxSpeed - minSpeed);

            // offset
            this.instanceData[idx + 4] = 0;
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
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData, this.gl.STATIC_DRAW);

        // a_params (location 1) vec4
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 4, this.gl.FLOAT, false, this.instanceFloatCount * 4, 0);
        this.gl.vertexAttribDivisor(1, 1);

        // a_offset (location 2) float
        this.gl.enableVertexAttribArray(2);
        this.gl.vertexAttribPointer(2, 1, this.gl.FLOAT, false, this.instanceFloatCount * 4, 4 * 4);
        this.gl.vertexAttribDivisor(2, 1);

        this.gl.bindVertexArray(null);
        return true;
    }

    render(width, height, time) {
        if (!this.gl || !this.program) return;

        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        const uRes = this.gl.getUniformLocation(this.program, "u_resolution");
        const uTime = this.gl.getUniformLocation(this.program, "u_time");

        this.gl.uniform2f(uRes, width, height);
        this.gl.uniform1f(uTime, time);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.maxInstances);

        this.gl.bindVertexArray(null);
        this.gl.disable(this.gl.BLEND);
    }

    updateSpeeds(waterFlowSpeed, time) {
        for (let i = 0; i < this.maxInstances; i++) {
            const idx = i * this.instanceFloatCount;
            const oldSpeed = this.instanceData[idx + 1];
            const size = this.instanceData[idx + 3];
            const minSize = 2;
            const maxSize = 22;
            const t = (size - minSize) / (maxSize - minSize);
            const baseSpeed = 100 + t * 200; // 100 to 300
            const newSpeed = baseSpeed * (waterFlowSpeed / 0.3);
            const speedDiff = oldSpeed - newSpeed;
            this.instanceData[idx + 4] += time * speedDiff;
            this.instanceData[idx + 1] = newSpeed;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }
}

const bubblesRenderer = new BubblesRenderer();
