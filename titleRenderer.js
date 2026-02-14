class TitleRenderer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.vbo = null;
        this.count = 0;
        
        this.fontData = null;
        this.fontImage = null;
        this.fontTexture = null;
        
        this.neutrons = [];
        this.neutronCount = 10;
        
        // Random seed for rock shape
        this.rockSeed = Math.random() * 100.0;
        
        // Neutron orbiting params
        this.orbitTime = 0;
    }

    initNeutrons() {
        this.neutrons = [];
        for (let i = 0; i < this.neutronCount; i++) {
            this.neutrons.push({
                angle: (Math.PI * 2 * i) / this.neutronCount,
                radiusX: 300 + Math.random() * 50,
                radiusY: 100 + Math.random() * 30,
                speed: 0.2 + Math.random() * 0.2,
                tilt: (Math.random() - 0.5) * 0.5
            });
        }
    }

    resetNeutrons() {
        this.orbitTime = 0;
        this.initNeutrons();
    }

    async loadAssets(jsonPath, imagePath) {
        // Load JSON
        const res = await fetch(jsonPath);
        this.fontData = await res.json();
        
        // Load Image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.fontImage = img;
                resolve();
            };
            img.onerror = reject;
            img.src = imagePath;
        });
    }

    init(gl, vsSource, fsSource, rockVsSource, rockFsSource) {
        this.gl = gl;
        this.program = createProgram(gl, vsSource, fsSource);
        
        this.fontTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.fontTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.fontImage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        
        // a_position (vec2), a_uv (vec2)
        const stride = 4 * 4; 
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
        
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);
        
        gl.bindVertexArray(null);
        
        this.initNeutrons();
        
        this.createFullTitleMesh();
        
        this.rockProgram = createProgram(gl, rockVsSource, rockFsSource);
        this.rockVao = gl.createVertexArray();
        this.rockBuffer = gl.createBuffer();
        gl.bindVertexArray(this.rockVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.rockBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1, 1,   1, -1,   1, 1
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
    }
    
    createFullTitleMesh() {
        if (!this.fontData) return;
        
        const mainVerts = this.generateTextVerts("Atom's Blessing", 1.0);
        const subVerts = this.generateTextVerts("-the great glow-", 0.6);
        
        // Offset subtitle
        // Determine spacing
        const spacing = 100; // pixels approx
        
        // Offset logic - Separate loops to avoid bugs and OOB access!
        
        // Shift main title up
        for(let i=1; i<mainVerts.length; i+=4) {
             mainVerts[i] -= 20.0;
        }

        // Shift subtitle down
        for(let i=1; i<subVerts.length; i+=4) {
             subVerts[i] += 20.0;
        }
        
        const allVerts = new Float32Array(mainVerts.length + subVerts.length);
        allVerts.set(mainVerts, 0);
        allVerts.set(subVerts, mainVerts.length);
        
        this.count = allVerts.length / 4;
        
        // Upload
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, allVerts, this.gl.STATIC_DRAW);
    }
    
    generateTextVerts(text, scale) {
        const verts = [];
        let cursorX = 0;
        let cursorY = 0;
        
        const scaleW = this.fontData.common.scaleW;
        const scaleH = this.fontData.common.scaleH;
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const charData = this.fontData.chars.find(c => c.id === charCode);
            if (!charData) continue;
            
            const x = cursorX + charData.xoffset * scale;
            const y = cursorY + charData.yoffset * scale;
            const w = charData.width * scale;
            const h = charData.height * scale;
            
            const u = charData.x / scaleW;
            const v = charData.y / scaleH;
            const uw = charData.width / scaleW;
            const vh = charData.height / scaleH;
            
            const x0 = x;
            const y0 = y;
            const x1 = x + w;
            const y1 = y + h;
            
            minX = Math.min(minX, x0); maxX = Math.max(maxX, x1);
            minY = Math.min(minY, y0); maxY = Math.max(maxY, y1);

            // TL
            verts.push(x0, y0, u, v);
            // TR
            verts.push(x1, y0, u + uw, v);
            // BL
            verts.push(x0, y1, u, v + vh);
            
            // TR
            verts.push(x1, y0, u + uw, v);
            // BR
            verts.push(x1, y1, u + uw, v + vh);
            // BL
            verts.push(x0, y1, u, v + vh);
            
            cursorX += charData.xadvance * scale;
        }
        
        const width = maxX - minX;
        const height = maxY - minY;
        const cx = minX + width / 2;
        const cy = minY + height / 2;
        
        // Center it
        for(let i=0; i<verts.length; i+=4) {
            verts[i] -= cx;
            verts[i+1] -= cy;
        }
        
        return verts;
    }

    update(dt, mx, my, width, height) {
        this.orbitTime += dt;
        const scale = 200.0; // Orbit base size in pixels
        
        for(let i=0; i<this.neutronCount; i++) {
            // attach first neutron to mouse if mouse info is present
            if (i === 0 && mx !== undefined && my !== undefined && width !== undefined && height !== undefined) {
                // Constrain to canvas
                const cMx = Math.max(0, Math.min(width, mx));
                const cMy = Math.max(0, Math.min(height, my));
                
                // Convert to center-relative coords
                this.neutrons[i].x = cMx - width/2;
                this.neutrons[i].y = cMy - height/2;
                
                // Bring it to front Z-wise
                this.neutrons[i].z = 2.0; 
                continue;
            }

            const fi = i;
            const seed = 7.0 + fi * 17.31;
            
            // speedBase reduced for slower neutrons
            const speedBase = (1.2 + fi * 0.12) * 0.4;
            const speedRandom = (seed * 0.9123 % 1.0) * 0.6 * 0.4; // approx fract
            const t = this.orbitTime * (speedBase + speedRandom) + seed * 456.78;
            
            const rFreq = 0.2 + (seed * 0.456 % 1.0) * 0.15;
            const iFreq = 0.15 + (seed * 0.123 % 1.0) * 0.1;
            
            const orbitRadiusModel = 1.6 + 0.6 * Math.sin(this.orbitTime * rFreq + seed);
            const inclination = Math.sin(this.orbitTime * iFreq + seed * 2.5) * 1.5;
            
            // 3D pos on model
            const x = orbitRadiusModel * Math.cos(t);
            const y = orbitRadiusModel * Math.sin(t) * Math.sin(inclination);
            
            // Apply to neutron array
            this.neutrons[i].x = x * scale; // Center 0,0
            this.neutrons[i].y = y * scale;
            this.neutrons[i].z = orbitRadiusModel * Math.sin(t) * Math.cos(inclination);
        }
    }

    drawRockBackground(width, height) {
        const gl = this.gl;
        gl.useProgram(this.rockProgram);
        gl.bindVertexArray(this.rockVao);
        gl.uniform2f(gl.getUniformLocation(this.rockProgram, "u_resolution"), width, height);
        gl.uniform1f(gl.getUniformLocation(this.rockProgram, "u_time"), this.orbitTime);
        gl.uniform1f(gl.getUniformLocation(this.rockProgram, "u_seed"), this.rockSeed);

        const rockNeutrons = [];
        const invH = 1.0 / height;
        const zScaleFactor = 200.0;
        for (let i = 0; i < this.neutronCount; i++) {
            const n = this.neutrons[i];
            rockNeutrons.push(n.x * invH, -n.y * invH, n.z * zScaleFactor * invH);
        }

        gl.uniform3fv(gl.getUniformLocation(this.rockProgram, "u_neutrons"), new Float32Array(rockNeutrons));
        gl.uniform1i(gl.getUniformLocation(this.rockProgram, "u_neutronCount"), this.neutronCount);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    draw(width, height) {
        const gl = this.gl;
        
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Drawn background or rock first
        this.drawRockBackground(width, height);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        
        // Uniforms
        gl.uniform2f(gl.getUniformLocation(this.program, "u_resolution"), width, height);
        
        // Scale & Transl
        // Scale title relative to screen
        const scale = height / 400.0;
        gl.uniform1f(gl.getUniformLocation(this.program, "u_scale"), scale * 2.0);
        gl.uniform2f(gl.getUniformLocation(this.program, "u_translation"), width/2, height/2);
        
        gl.uniform3f(gl.getUniformLocation(this.program, "u_color"), 0.1, 0.8, 0.1); // Uranium green/cyan
        gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), this.orbitTime);
        
        // Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.fontTexture);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_fontTex"), 0);
        
        // Neutrons - Use the new 3D positions calculated in update, projected to 2D for lighting
        const neutronPos = [];
        for(let i=0; i<this.neutronCount; i++) {
             const n = this.neutrons[i];
             // x,y are already center-relative pixels
             neutronPos.push(width/2 + n.x, height/2 + n.y);
        }
        
        gl.uniform2fv(gl.getUniformLocation(this.program, "u_neutrons"), new Float32Array(neutronPos));
        gl.uniform1i(gl.getUniformLocation(this.program, "u_neutronCount"), this.neutronCount);
        
        gl.drawArrays(gl.TRIANGLES, 0, this.count);
        
        // --- Draw Electrons (New Pass) ---
        // Use a simple shader to draw points
        if (!this.electronProgram) {
            // Lazy init electron shader 
            const vs = `#version 300 es
            precision highp float;
            layout(location=0) in vec2 a_pos;
            layout(location=1) in vec3 a_color;
            layout(location=2) in float a_size;
            uniform vec2 u_resolution;
            out vec3 vColor;
            void main() {
                gl_Position = vec4((a_pos.x / u_resolution.x) * 2.0 - 1.0, (a_pos.y / u_resolution.y) * -2.0 + 1.0, 0.0, 1.0);
                gl_PointSize = a_size;
                vColor = a_color;
            }`;
            const fs = `#version 300 es
            precision highp float;
            in vec3 vColor;
            out vec4 outColor;
            void main() {
                vec2 coord = gl_PointCoord * 2.0 - 1.0;
                float dist = length(coord);
                if(dist > 1.0) discard;
                
                // Sharp intense core
                float core = exp(-dist * dist * 20.0);
                
                // Broad soft glow
                float glow = exp(-dist * 2.5);
                
                // Combine: Core adds white/brightness, Glow adds color
                // Boost VColor for the glow so it's visible
                vec3 finalColor = vColor * glow * 1.5 + vec3(1.0, 1.0, 1.0) * core;
                
                outColor = vec4(finalColor, glow);
            }`;
            this.electronProgram = createProgram(gl, vs, fs);
            this.electronVao = gl.createVertexArray();
            this.electronVbo = gl.createBuffer();
        }
        
        // Build electron data
        const eData = [];
        const cx = width/2;
        const cy = height/2;
        for(let i=0; i<this.neutronCount; i++) {
            const n = this.neutrons[i]; // Updated in update()
            // Pos (x, y) relative to center, needs adding center
            eData.push(cx + n.x, cy + n.y); 
            // Color (Blue-ish like special.frag)
            eData.push(0.2, 0.6, 1.0);
            // Size (vary with Z)
            // n.z is roughly -2..2 scale? orbitRadius is ~1.6..2.2
            // Let's bias size by Z slightly
            const zScale = 1.0 + (n.z || 0) * 0.2;
            eData.push(100.0 * zScale); // Increased size for glow
        }
        
        gl.useProgram(this.electronProgram);
        gl.bindVertexArray(this.electronVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.electronVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(eData), gl.DYNAMIC_DRAW);
        
        // Attribs: 0:pos(2), 1:col(3), 2:size(1) -> stride 6 floats
        const stride = 6 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 2*4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 5*4);
        
        gl.uniform2f(gl.getUniformLocation(this.electronProgram, "u_resolution"), width, height);
        
        // Additive blend for light particles
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); 
        gl.drawArrays(gl.POINTS, 0, this.neutronCount);
        
        gl.bindVertexArray(null);
    }
}
