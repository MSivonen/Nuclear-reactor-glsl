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
        this.gl = simGL;
        this.program = createProgram(this.gl, vsSourceExternal, fsSourceExternal);
        
        this.texture = this.loadTexture('assets/brickwall.jpg');

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
    
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                      new Uint8Array([0, 0, 255, 255]));
    
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        };
        image.src = url;
        return texture;
    }

    render(timeSeconds) {
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.uniform2f(this.uResolutionLoc, screenSimWidth, screenHeight);
        this.gl.uniform1f(this.uTimeLoc, timeSeconds);
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.uTextureLoc, 0);

        if (glShit.vectorFieldTex) {
            const uVectorLoc = this.gl.getUniformLocation(this.program, "u_vectorField");
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, glShit.vectorFieldTex);
            this.gl.uniform1i(uVectorLoc, 1);
            
            this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_shopWidth"), SHOP_WIDTH);
        }

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.gl.bindVertexArray(null);
    }
}

const waterLayer = new WaterLayer();
