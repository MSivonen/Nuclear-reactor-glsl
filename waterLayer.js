// waterLayer.js
// Renders a fullscreen water shader pass into the existing WebGL context.

class WaterLayer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.uResolutionLoc = null;
        this.uTimeLoc = null;
        this.texture = null;
        this.uTextureLoc = null;
    }

    init(simGL, vsSourceExternal, fsSourceExternal) {
        if (!simGL) return;
        if (!vsSourceExternal || !fsSourceExternal) {
            console.error('waterLayer.init requires vertex and fragment shader source strings');
            return;
        }
        this.gl = simGL;
        this.program = createProgram(this.gl, vsSourceExternal, fsSourceExternal);
        
        // Load background texture
        this.texture = this.loadTexture('assets/brickwall.jpg');

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
        this.uTextureLoc = this.gl.getUniformLocation(this.program, 'u_backgroundTexture');

        this.gl.bindVertexArray(null);
    }

    loadTexture(url) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
    
        // Put a single pixel in the texture so we can use it immediately.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                      new Uint8Array([0, 0, 255, 255]));
    
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
            // Assume WebGL2, generate mips if possible, set parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        };
        image.src = url;
        return texture;
    }

    render(timeSeconds) {
        if (!this.gl || !this.program) return;
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.disable(this.gl.DEPTH_TEST);
        // this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height); // Controlled externally
        
        // Pass SimWidth not CanvasWidth for resolution, because we are rendering to a viewport that is only SimWidth wide
        // And the shader likely uses u_res to correct aspect ratio or UVs.
        // Actually, if we use viewport, gl_FragCoord is in window space.
        // If shader uses gl_FragCoord / u_resolution, it expects 0..1 range.
        // If viewport is offset, gl_FragCoord.x is offset. 
        // We should probably pass the Viewport Size here, not full canvas size.
        // But since we can't easily access the viewport rect, let's assume the sceneHelper sets it up.
        // The original code passed canvas.width which was SimWidth.
        if (this.uResolutionLoc) this.gl.uniform2f(this.uResolutionLoc, screenSimWidth, screenHeight);
        if (this.uTimeLoc) this.gl.uniform1f(this.uTimeLoc, timeSeconds || 0.0);
        
        if (this.texture && this.uTextureLoc) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.uniform1i(this.uTextureLoc, 0);
        }

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.gl.bindVertexArray(null);
    }
}

const waterLayer = new WaterLayer();
