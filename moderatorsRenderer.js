// GPU instanced renderer for moderators and their handles
class ModeratorsRenderer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.instanceBuffer = null;
        this.maxInstances = 0;
        this.instanceFloatCount = 9; // x,y, r,g,b,a, w,h, isHandle
        this.instanceData = null;
    }

    init(simGL, maxInst, vsSource, fsSource) {
        this.gl = simGL;
        this.maxInstances = maxInst || 64;
        this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
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
        // a_instPos (location 1) vec2
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(1, 1);
        offset += 2 * 4;

        // a_instColor (location 2) vec4
        this.gl.enableVertexAttribArray(2);
        this.gl.vertexAttribPointer(2, 4, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(2, 1);
        offset += 4 * 4;

        // a_instSize (location 3) vec2 (width, height)
        this.gl.enableVertexAttribArray(3);
        this.gl.vertexAttribPointer(3, 2, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(3, 1);
        offset += 2 * 4;

        // a_isHandle (location 4) float
        this.gl.enableVertexAttribArray(4);
        this.gl.vertexAttribPointer(4, 1, this.gl.FLOAT, false, this.instanceFloatCount * 4, offset);
        this.gl.vertexAttribDivisor(4, 1);
        offset += 1 * 4;

        this.gl.bindVertexArray(null);
        return true;
    }

    updateInstances(moderators, slider) {
        let writeIndex = 0;
        const HANDLE_RADIUS = 10 * globalScale;
        
        // Moderators first
        for (let i = 0; i < moderators.length; i++) {
            if (typeof isModeratorActive === 'function' && !isModeratorActive(i)) continue;
            const r = moderators[i];

            // 1. The Moderator Cylinder
            const b1 = writeIndex * this.instanceFloatCount;
            this.instanceData[b1 + 0] = r.x;
            this.instanceData[b1 + 1] = r.y;
            this.instanceData[b1 + 2] = r.color.r / 255.0;
            this.instanceData[b1 + 3] = r.color.g / 255.0;
            this.instanceData[b1 + 4] = r.color.b / 255.0;
            this.instanceData[b1 + 5] = 1.0;
            this.instanceData[b1 + 6] = r.width;
            this.instanceData[b1 + 7] = r.height;
            this.instanceData[b1 + 8] = 0.0; // Moderator
            writeIndex++;

            // 2. The Spherical Handle (Welded to the moderator)
            const b2 = writeIndex * this.instanceFloatCount;
            this.instanceData[b2 + 0] = r.x + r.width / 2;
            this.instanceData[b2 + 1] = r.y + r.height;
            this.instanceData[b2 + 2] = r.color.r / 255.0;
            this.instanceData[b2 + 3] = r.color.g / 255.0;
            this.instanceData[b2 + 4] = r.color.b / 255.0;
            this.instanceData[b2 + 5] = 1.0;
            this.instanceData[b2 + 6] = HANDLE_RADIUS * 2.5;
            this.instanceData[b2 + 7] = HANDLE_RADIUS * 2.5;
            this.instanceData[b2 + 8] = 1.0; // Welded Sphere
            writeIndex++;

            // 3. The Target Handle (If dragging/different from current position)
            if (slider && slider.handleY) {
                const targetY = slider.handleY[i];
                const currentEnd = r.y + r.height;
                if (Math.abs(targetY - currentEnd) > 2.0) {
                    const b3 = writeIndex * this.instanceFloatCount;
                    this.instanceData[b3 + 0] = r.x + r.width / 2;
                    this.instanceData[b3 + 1] = targetY;
                    this.instanceData[b3 + 2] = 1.0; // White
                    this.instanceData[b3 + 3] = 1.0;
                    this.instanceData[b3 + 4] = 1.0;
                    this.instanceData[b3 + 5] = 0.6; // Alpha
                    this.instanceData[b3 + 6] = HANDLE_RADIUS * 2.5;
                    this.instanceData[b3 + 7] = HANDLE_RADIUS * 2.5;
                    this.instanceData[b3 + 8] = 2.0; // Soft target
                    writeIndex++;
                }
            }
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, writeIndex * this.instanceFloatCount);
        return writeIndex;
    }

    draw(count, options = {}) {
        if (count === 0) return;
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);

        this.gl.uniform2f(this.gl.getUniformLocation(this.program, 'u_resolution'), screenSimWidth, screenHeight);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'render_height'), screenHeight);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'render_width'), screenSimWidth);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_shopWidth'), SHOP_WIDTH);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_time'), renderTime);

        if (glShit.vectorFieldTex) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, glShit.vectorFieldTex);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_vectorField'), 0);
        }

        this.gl.enable(this.gl.BLEND);
        if (options.blendMode === 'additive') {
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        } else {
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, count);
    }
}

const moderatorsRenderer = new ModeratorsRenderer();
