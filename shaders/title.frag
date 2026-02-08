#version 300 es
precision highp float;

uniform sampler2D u_fontTex;
uniform vec3 u_color;
uniform float u_time;
uniform vec2 u_neutrons[20]; // Array of positions
uniform int u_neutronCount;

in vec2 v_uv;
in vec2 v_pos;

out vec4 outColor;

// Noise functions from atoms_core.frag
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.71, 31.17))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    // 1. MSDF Lookups
    vec3 msdf = texture(u_fontTex, v_uv).rgb;
    float sd = median(msdf.r, msdf.g, msdf.b) - 0.5;
    
    // 2. Screen Space Dist & Edge Opacity
    
    // Outline configuration
    float outlineWidth = 0.25; // Width in SDF units
    float outerSD = sd + outlineWidth;
    
    // Opacity for the entire shape (Body + Outline)
    float pxDist = outerSD / fwidth(outerSD);
    float opacity = clamp(pxDist + 0.5, 0.0, 1.0);
    
    // if (opacity < 0.01) discard;

    // Body Mix factor (0 = Outline, 1 = Inner Body)
    // We sharpen the transition between outline and body
    float bodyDist = sd / fwidth(sd);
    float bodyMix = clamp(bodyDist + 0.5, 0.0, 1.0);

    // 3. Fake 3D / Bevel
    // Reduce bevel width to sharpen edges and avoid exposing low-res SDF interior
    float bevelWidth = 0.14; 
    // Calculate height based on inner body SD, clamped so outline area doesn't affect derivatives wildly
    float hSD = max(0.0, sd);
    float height = smoothstep(0.0, bevelWidth, hSD);
    
    // Gradient of height for normal
    float dHdx = dFdx(height);
    float dHdy = dFdy(height);
    
    // Base Normal
    // Sharpen the normal transition - higher multiplier = steeper visual slope at edge
    vec3 N = normalize(vec3(-dHdx * 128.0, -dHdy * 128.0, 1.0));
    
    // 4. Scratched Metal Texture (Procedural Detail)
    // Scale screen coords for noise to create detailed material
    vec2 p = v_pos * 111.02; 
    
    float bumpScale = 0.15;
    
    // Multilayer noise for better material definition
    vec3 scratchVec = vec3(
        noise(p * 8.0) - 0.5,
        noise(p * 8.0 + vec2(12.3, 45.6)) - 0.5,
        0.0
    );
    // Finer grain
    scratchVec += vec3(
        noise(p * 32.0) - 0.5,
        noise(p * 32.0 + 7.8) - 0.5,
        0.0
    ) * 0.5;
    
    // Apply scratches to normal
    N = normalize(N + scratchVec * bumpScale);

    // 5. Lighting Setup
    vec3 lightDir = normalize(vec3(-0.5, 0.5, 1.0)); // Top-Left Directional
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Directional calculation
    float diff = max(0.0, dot(N, lightDir));
    
    // Specular (Metal)
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(0.0, dot(N, halfVec)), 24.0); 
    
    // 6. Point Lights from Neutrons
    vec3 neutronLight = vec3(0.0);
    for(int i=0; i<u_neutronCount; i++) {
        vec2 nPos = u_neutrons[i];
        float d = distance(v_pos, nPos);
        
        // Intensity falloff
        float intensity = exp(-d * 0.005) * 2.0; 
        
        // Approximate point light direction 
        vec3 L_point = normalize(vec3(nPos - v_pos, 40.0)); 
        
        float diffP = max(0.0, dot(N, L_point));
        float specP = pow(max(0.0, dot(N, normalize(L_point + viewDir))), 16.0);
        
        // Blueish neutron color
        vec3 nColor = vec3(0.0039, 0.3059, 0.0275);
        neutronLight += nColor * (diffP * intensity + specP * intensity * 1.1);
    }

    // 7. Composition
    // Base Color (Uranium green/grey metal)
    vec3 baseCol = vec3(0.2, 0.25, 0.22);
    
    // Scratches darken the surface (AO-like)
    float scratchTex = smoothstep(0.45, 0.55, noise(p * vec2(1.0, 20.0)));
    baseCol *= (1.0 - scratchTex * 0.3);
    
    // Add lighting
    vec3 finalCol = baseCol * (0.3 + diff * 0.8); // Ambient + Diffuse
    finalCol += vec3(0.3843, 0.4784, 0.3843) * spec; // Specular
    
    // Add Neutron contribution (Additive)
    finalCol += neutronLight;
    
    // Inner Glow for "Radioactive" look
    float innerGlow = smoothstep(0.5, 1.0, height);
    finalCol += vec3(0.0, 0.4, 0.1) * innerGlow * 0.4;

    // Rim Light (Edge catch)
    float rim = pow(1.0 - max(0.0, dot(viewDir, N)), 2.0);
    finalCol += vec3(0.6118, 0.7333, 0.6118) * rim * 0.4;

    // 8. Outer Glow (Bloom-like) for soft edges
    // Only apply glow if we are near the edge of the outline
    if (opacity < 1.0) {
       // outerSD < 0.0 roughly
       if (outerSD < 0.0) {
           float d = abs(pxDist);
           float glow = exp(-d * 0.3);
           vec3 glowColor = vec3(0.5529, 1.0, 0.6392); 
           
           // Blend glow
           finalCol = mix(finalCol, glowColor, 0.4);
           opacity = max(opacity, glow * 0.5); 
       }
    }

    // Cleanup
    // if (opacity < 0.05) discard;
    
    // Apply Black Outline
    finalCol = mix(vec3(0.0), finalCol, bodyMix);
    
    outColor = vec4(finalCol, opacity);
}
