class UiOverlay {
    constructor() {
        this.program = null;
        this.uTexture = null;
        this.vao = null;
        this.texture = null;
    }

    init(gl) {
        if (this.program) return; // already inited

        const vert = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        out vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }`;

        const frag = `#version 300 es
        precision mediump float;
        uniform sampler2D u_tex;
        in vec2 v_texCoord;
        out vec4 outColor;
        void main() {
            outColor = texture(u_tex, v_texCoord);
        }`;

        this.program = createProgram(gl, vert, frag);
        this.uTexture = gl.getUniformLocation(this.program, "u_tex");

        // Quad that covers the whole screen
        // x, y, u, v
        // In WebGL, textures are upside down relative to canvas usually? 
        // HTML Canvas 0,0 is top-left. GL 0,0 is bottom-left. 
        // So we might need to flip Y in tex coords (0,0 -> 0,1).
        const quad = new Float32Array([
            // x, y, u, v
            -1, -1, 0, 1,
             1, -1, 1, 1,
            -1,  1, 0, 0,
            -1,  1, 0, 0,
             1, -1, 1, 1,
             1,  1, 1, 0
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

        const FSIZE = quad.BYTES_PER_ELEMENT;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * FSIZE, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * FSIZE, 2 * FSIZE);

        gl.bindVertexArray(null);

        // Create texture object once
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    render(gl, canvasElement) {

        // Normal alpha blending for UI
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        // Upload the 2D canvas to the texture
        // This can be expensive, but necessary for mixing 2D canvas with WebGL
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasElement);

        gl.uniform1i(this.uTexture, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

const uiOverlay = new UiOverlay();
