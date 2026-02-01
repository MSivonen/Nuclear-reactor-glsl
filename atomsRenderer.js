// GPU instanced renderer for uranium atoms
class AtomsRenderer {
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
        if (!simGL) return false;
        this.gl = simGL;
        this.maxInstances = maxInst || 2048;
        this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
        if (!vsSource || !fsSource) {
            throw new Error('atomsRenderer shader sources missing');
        }
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
        offset += 1 * 4;

        this.gl.bindVertexArray(null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        return true;
    }

    updateInstances(atoms) {
        const count = atoms.length;
        if (count > this.maxInstances) {
            // reallocate
            this.maxInstances = count;
            this.instanceData = new Float32Array(this.maxInstances * this.instanceFloatCount);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        }

        for (let i = 0; i < count; i++) {
            const a = atoms[i];
            const base = i * this.instanceFloatCount;
            this.instanceData[base + 0] = a.position.x;
            this.instanceData[base + 1] = a.position.y;
            // color object -> components 0..255
            const r = (a.color && typeof a.color.r !== 'undefined') ? (a.color.r / 255.0) : 0.0;
            const g = (a.color && typeof a.color.g !== 'undefined') ? (a.color.g / 255.0) : 0.0;
            const b = (a.color && typeof a.color.b !== 'undefined') ? (a.color.b / 255.0) : 0.0;
            const alpha = (a.flash > 0) ? 1.0 : 1.0;
            this.instanceData[base + 2] = r;
            this.instanceData[base + 3] = g;
            this.instanceData[base + 4] = b;
            this.instanceData[base + 5] = alpha;
            this.instanceData[base + 6] = a.radius * 2.0; // size diameter
            this.instanceData[base + 7] = (a.flash > 0) ? 1.0 : 0.0;
        }

        // Upload to GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, count * this.instanceFloatCount);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        return count;
    }

    draw(count, { blendMode = 'additive' } = {}) {
        if (!this.gl || !this.program) return;
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        const uResLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
        // FIX: Use simulation width/height (viewport size), not full canvas size.
        // ScreenSimWidth is global from sketch.js
        this.gl.uniform2f(uResLoc, screenSimWidth, screenHeight);
        const rendHeightLoc = this.gl.getUniformLocation(this.program, "render_height");
        // Instance positions are in simulation/draw coordinates (screenDrawWidth/Height)
        // so the shader can scale+letterbox into the render canvas.
        this.gl.uniform1f(rendHeightLoc, screenHeight);
        const rendWidthLoc = this.gl.getUniformLocation(this.program, "render_width");
        this.gl.uniform1f(rendWidthLoc, screenSimWidth);

        if (blendMode && blendMode !== 'none') {
            this.gl.enable(this.gl.BLEND);
            if (blendMode === 'alpha') {
                if (this.gl.blendFuncSeparate) {
                    this.gl.blendFuncSeparate(
                        this.gl.SRC_ALPHA,
                        this.gl.ONE_MINUS_SRC_ALPHA,
                        this.gl.ONE,
                        this.gl.ONE_MINUS_SRC_ALPHA
                    );
                } else {
                    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
                }
            } else {
                // Default: alpha-weighted additive blending for glow accumulation
                if (this.gl.blendFuncSeparate) {
                    this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
                } else {
                    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
                }
            }
        }

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, count);
        if (blendMode && blendMode !== 'none') {
            this.gl.disable(this.gl.BLEND);
        }
        this.gl.bindVertexArray(null);
        this.gl.useProgram(null);
    }

    renderImage() {
        // Deprecated helper, but if called, it needs correct handling.
        const gl2 = glShit.simGL;

        gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
        // gl2.viewport(0, 0, glShit.simCanvas.width, glShit.simCanvas.height); // REMOVED
        // We assume caller sets viewport. If renderImage is called standalone, it might break.
        // gl2.clearColor(0, 0, 0, 0); // REMOVED
        // gl2.clear(gl2.COLOR_BUFFER_BIT); // REMOVED

        this.draw(uraniumAtoms.length);
    }
}

const atomsRenderer = new AtomsRenderer();
