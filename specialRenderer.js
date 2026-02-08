// GPU instanced renderer for special items like plutonium and californium
class SpecialRenderer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.instanceBuffer = null;
        this.maxInstances = 0;
        this.instanceFloatCount = 8; // x,y, r,g,b,a, size, flash
        this.instanceData = null;
    }

    init(simGL, maxInst, vsSource, fsSource) {
        this.gl = simGL;
        this.maxInstances = maxInst || 16;
        this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
        this.program = createProgram(this.gl, vsSource, fsSource);

        // Quad (6 verts)
        const quad = new Float32Array([
            -0.5, -0.5,
            0.5, -0.5,
            -0.5, 0.5,
            -0.5, 0.5,
            0.5, -0.5,
            0.5, 0.5
        ]);

        this.vao = null; // Don't use VAO for compatibility

        const quadVbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadVbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quad, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        this.instanceBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);

        // a_instPos (location 1) vec2
        let offset = 0;
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(1, 1);
        offset += 2 * 4;

        // a_instColor (location 2) vec4
        this.gl.enableVertexAttribArray(2);
        this.gl.vertexAttribPointer(2, 4, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(2, 1);
        offset += 4 * 4;

        // a_instSize (location 3) float
        this.gl.enableVertexAttribArray(3);
        this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(3, 1);
        offset += 1 * 4;

        // a_instFlash (location 4) float
        this.gl.enableVertexAttribArray(4);
        this.gl.vertexAttribPointer(4, 1, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(4, 1);
    }

    updateInstances(items) {
        let count = 0;
        for (let i = 0; i < items.length && i < this.maxInstances; i++) {
            const item = items[i];
            if (!item) continue;
            const base = i * this.instanceFloatCount;
            this.instanceData[base + 0] = item.x;
            this.instanceData[base + 1] = item.y;
            this.instanceData[base + 2] = item.color.r / 255.0;
            this.instanceData[base + 3] = item.color.g / 255.0;
            this.instanceData[base + 4] = item.color.b / 255.0;
            this.instanceData[base + 5] = 1.0; // alpha
            this.instanceData[base + 6] = item.radius * 3.0; // quad size large enough for orbit/glow
            this.instanceData[base + 7] = 0.0; // flash
            count++;
        }
        return count;
    }

    draw(count, options = {}) {
        if (count === 0) return;

        this.gl.useProgram(this.program);

        // Update instance buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData);

        // Uniforms
        const uResLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.gl.uniform2f(uResLoc, screenSimWidth, screenHeight);

        const uRenderHeightLoc = this.gl.getUniformLocation(this.program, 'render_height');
        this.gl.uniform1f(uRenderHeightLoc, screenHeight);

        const uRenderWidthLoc = this.gl.getUniformLocation(this.program, 'render_width');
        this.gl.uniform1f(uRenderWidthLoc, screenSimWidth);

        const uTimeLoc = this.gl.getUniformLocation(this.program, 'u_time');
        if (uTimeLoc) {
            this.gl.uniform1f(uTimeLoc, renderTime);
        }

        // Enable blending explicitly
        this.gl.enable(this.gl.BLEND);

        // Use Premultiplied Alpha for better glows and transparency
        if (options.blendMode === 'additive') {
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        } else {
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        }

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, count);
    }
}

const specialRenderer = new SpecialRenderer();