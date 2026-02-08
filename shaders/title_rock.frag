#version 300 es
precision highp float;

in vec2 v_uv;
uniform float u_time;
uniform float u_seed;
uniform vec3 u_neutrons[20];
uniform int u_neutronCount;

out vec4 outColor;

// Variables for easy editing
float shapeChangeSpeed = 0.0;
float rotationSpeed = 0.02;

// Simplex Noise 2D (No grid artifacts)
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Map to 0..1 for compatibility
float noise(vec2 p) {
    return snoise(p) * 0.5 + 0.5;
}

// Better FBM with octaves and rotation for no axis alignment
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// Higher frequency rugged noise
float ruggedNoise(vec2 p) {
    return abs(noise(p) - 0.5) * 2.0;
}

// Get the rock shape displacement (negative = indent, positive = protrude)
float getDisplacement(vec2 p) {
    float t = u_time * shapeChangeSpeed;
    
    // Apply seed offset
    float s = u_seed;
    
    // Large shape distortion (avoiding polar singularity)
    float d = noise(p * 2.0 + 5.0 + t + s) * 0.15;
    // Medium detail 'blob' breaker
    d += noise(p * 5.0 - 2.0 - t * 0.5 + s * 1.3) * 0.05;
    // High frequency roughness (smaller rough angles)
    d += ruggedNoise(p * 15.0 + t * 0.2 + s * 2.1) * 0.02;
    // Very high frequency grain (static or fast?) let's make it slow too
    d += noise(p * 40.0 + s) * 0.005;
    return d;
}

float getHeight(vec2 p) {
    float distRaw = length(p);
    
    // Apply displacement to the distance field itself
    // This distorts the "circle" shape into a rock shape
    float disp = getDisplacement(p);
    
    // Distorted distance
    float r = distRaw - disp;
    
    // Base radius of the rock
    float baseRadius = 0.15;
    
    // Return a valid height even if outside (clamped to 0 base + detail)
    // This allows normal calculation at the edge to remain stable
    
    // Height profile: somewhat spherical but distorted by the same noise
    // We map 'r' (0..baseRadius) to height.
    // h = sqrt(R^2 - r^2)
    float h = sqrt(max(0.0, baseRadius*baseRadius - r*r));
    
    // Add surface texture detail to height (bump mapping effect)
    float surfaceDetail = fbm(p * 10.0 + u_time * 0.00) * 0.05;
    
    // Fade detail at very edge? No, AA will handle visibility.
    
    return h + surfaceDetail;
}

void main() {
    float ang = u_time * rotationSpeed;
    float c = cos(ang);
    float s = sin(ang);
    mat2 rot = mat2(c, -s, s, c);
    
    vec2 p_rot = rot * v_uv;

    // --- AA Calculation ---
    // 1. Determine distance to "surface" (edge of rock)
    float disp = getDisplacement(p_rot);
    float r = length(p_rot) - disp; 
    float baseRadius = 0.15;
    
    float distToEdge = baseRadius - r; 
    // distToEdge > 0 inside, < 0 outside
    
    // 2. Compute coverage using fwidth
    float aaWidth = fwidth(distToEdge);
    float coverage = smoothstep(-aaWidth, aaWidth, distToEdge);
    
    // --- Background / Glow ---
    // Calculated everywhere for blending
    float d_glow = max(0.0, r - baseRadius);
    float glow = exp(-d_glow * 10.0);
    
    // Atmosphere noise (static background)
    float dust = noise(v_uv * 12.0 - vec2(0, u_time * 0.2));
    float glowAlpha = glow * (0.6 + 0.4 * dust);
    vec3 glowCol = vec3(0.05, 0.8, 0.2) * glowAlpha;
    
    vec3 rockFinalCol = vec3(0.0);
    
    // --- Rock Rendering ---
    // Only compute expensive rock lighting where visible
    if (coverage > 0.001) {
    
        float h = getHeight(p_rot);
        
        // Normal Calculation
        vec2 e = vec2(0.005, 0.0);
        float h_right = getHeight(rot * (v_uv + e.xy));
        float h_up = getHeight(rot * (v_uv + e.yx));
        
        // Edge handling for neighbors (if they fall "off" the rock)
        // Since we removed the -1.0 return in getHeight, they return 
        // a height based on baseRadius 0 (flat), providing a smooth-ish transition
        // But we clamp negative heights to 0 just in case logic changes
        if (h_right < 0.0) h_right = 0.0;
        if (h_up < 0.0) h_up = 0.0;
        if (h < 0.0) h = 0.0;
        
        float dHdx = (h_right - h) / e.x;
        float dHdy = (h_up - h) / e.x;
        
        vec3 N = normalize(vec3(-dHdx, -dHdy, 1.0)); 
     
        // Normal map detail boost
        float nNoise = noise(p_rot * 20.0);
        N = normalize(N + vec3(nNoise-0.5, nNoise-0.5, 0.0) * 0.2);

        // Material & Color
        vec3 baseDark = vec3(0.02, 0.03, 0.02);
        vec3 rockHigh = vec3(0.15, 0.18, 0.15);
        
        float tex = fbm(p_rot * 10.0);
        vec3 albedo = mix(baseDark, rockHigh, tex);
        
        // Veins
        float veinN = noise(p_rot * 5.0 + vec2(sin(u_time*0.1), cos(u_time*0.15))*0.5);
        float veinMask = 1.0 - smoothstep(0.0, 0.04, abs(veinN - 0.5));
        vec3 veinColor = vec3(0.2, 0.9, 0.3) * 3.0;
        
        // Global Lighting
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 globalLightDir = normalize(vec3(-1.0, 1.0, 0.5));
        
        float diff = max(0.0, dot(N, globalLightDir));
        float rim = pow(1.0 - max(0.0, dot(N, viewDir)), 3.0);
        
        vec3 finalCol = albedo * (0.1 + diff);
        finalCol += veinColor * veinMask;
        finalCol += vec3(0.1, 0.7, 0.2) * rim * 0.5;
        
        // Neutron Lighting
        vec3 neutronLight = vec3(0.0);
        vec3 surfacePos = vec3(v_uv, h);
        
        for(int i = 0; i < u_neutronCount; i++) {
            vec3 lightPos = u_neutrons[i];
            
            vec3 L_vec = lightPos - surfacePos;
            float distSq = dot(L_vec, L_vec);
            distSq = max(0.001, distSq);
            float dist = sqrt(distSq);
            vec3 L = L_vec / dist;
            
            float att = 1.0 / (0.1 + distSq * 10.0);
            
            float nDif = max(0.0, dot(N, L));
            
            // Specular (Dry look)
            vec3 H = normalize(L + viewDir);
            float nSpec = pow(max(0.0, dot(N, H)), 4.0); 
            
            vec3 nColor = vec3(0.1569, 0.2471, 0.2431); 
            
            neutronLight += nColor * att * (nDif + nSpec * 1.0);
        }
        
        finalCol += neutronLight;
        
        // Tone mapping
        rockFinalCol = finalCol / (1.0 + finalCol * 0.5);
    }
    
    // --- Blending ---
    // Combine Glow (background) and Rock (foreground) based on coverage
    
    vec3 outRGB = mix(glowCol, rockFinalCol, coverage);
    
    // Alpha blending:
    // Where coverage is 0 (outside), alpha is glowAlpha.
    // Where coverage is 1 (inside), alpha is 1.0 (rock is opaque).
    float outA = mix(glowAlpha, 1.0, coverage);
    
    // Final discard for very low alpha
    if (outA < 0.01) discard;
    
    outColor = vec4(outRGB, outA);
}
