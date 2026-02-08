#version 300 es
precision highp float;

in vec4 vColor;
in float vFlash;
in vec2 vQuadPos;
in vec2 vInstPos;

uniform float u_time;

out vec4 outColor;

// --- Noise Functions ---
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

float noise(vec2 p) {
    return snoise(p) * 0.5 + 0.5;
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

float ruggedNoise(vec2 p) {
    return abs(noise(p) - 0.5) * 2.0;
}

// Variables adapted for this shader
float shapeChangeSpeed = 0.0; // No shape change by time
float rotationSpeed = 0.3;

// Core shape displacement
float getDisplacement(vec2 p, float seed) {
    float t = 0.0; // shape fixed in time
    float s = seed;
    
    // Adapted from title_rock.frag
    float d = noise(p * 2.0 + 5.0 + t + s) * 0.15;
    d += noise(p * 5.0 - 2.0 - t * 0.5 + s * 1.3) * 0.05;
    d += ruggedNoise(p * 15.0 + t * 0.2 + s * 2.1) * 0.02;
    return d;
}

float getHeight(vec2 p, float seed) {
    float distRaw = length(p);
    float disp = getDisplacement(p, seed);
    float r = distRaw - disp;
    float baseRadius = 0.0875; // -50% again (0.175 * 0.5)
    
    // Spherical profile
    float h = sqrt(max(0.0, baseRadius*baseRadius - r*r));
    
    // Detail
    float surfaceDetail = fbm(p * 10.0 + seed) * 0.05;
    
    return h + surfaceDetail;
}

void main() {
    // Determine Type by color
    // Plutonium: (80,80,80) -> r=0.31
    // Californium: (200,200,200) -> r=0.78
    bool isCalifornium = (vColor.r > 0.5);
    // Use the seed passed in the alpha channel
    float seed = vColor.a; 

    // Rotation
    float ang = u_time * rotationSpeed + seed; 
    float c = cos(ang);
    float s = sin(ang);
    mat2 rot = mat2(c, -s, s, c);
    
    vec2 p_rot = rot * vQuadPos; // vQuadPos is -0.5 to 0.5

    // --- 1. Rock Shape & Coverage ---
    float disp = getDisplacement(p_rot, seed);
    float r = length(p_rot) - disp;
    float baseRadius = 0.0875; // -50%
    float distToEdge = baseRadius - r;
    
    // AA
    float aaWidth = fwidth(distToEdge);
    if(aaWidth == 0.0) aaWidth = 0.01;
    float coverage = smoothstep(-aaWidth, aaWidth, distToEdge);
    
    // Glow (Background)
    float d_glow = max(0.0, r - baseRadius);
    float glow = exp(-d_glow * 30.0); // Tighter glow for smaller rock
    float dust = noise(vQuadPos * 12.0 - vec2(0, u_time * 0.2));
    float glowAlpha = glow * (0.6 + 0.4 * dust);
    
    // Colors
    vec3 glowColorBase = isCalifornium ? vec3(1.0, 0.9, 0.1) : vec3(0.05, 0.8, 0.2); // Yellow vs Green
    vec3 glowCol = glowColorBase * glowAlpha;
    
    vec3 rockFinalCol = vec3(0.0);
    
    // --- 2. Rock Rendering ---
    if (coverage > 0.001) {
        float h = getHeight(p_rot, seed);
        
        // Normal Calculation
        vec2 e = vec2(0.005, 0.0);
        float h_right = getHeight(rot * (vQuadPos + e.xy), seed);
        float h_up = getHeight(rot * (vQuadPos + e.yx), seed);
        
         if (h_right < 0.0) h_right = 0.0;
        if (h_up < 0.0) h_up = 0.0;
        if (h < 0.0) h = 0.0;
        
        float dHdx = (h_right - h) / e.x;
        float dHdy = (h_up - h) / e.x;
        
        vec3 N = normalize(vec3(-dHdx, -dHdy, 1.0));
        
        float nNoise = noise(p_rot * 20.0);
        N = normalize(N + vec3(nNoise-0.5, nNoise-0.5, 0.0) * 0.2);
        
        // Material
        vec3 baseDark = vec3(0.02, 0.02, 0.02);
        vec3 rockHigh = vec3(0.2, 0.2, 0.2); // Dark grey rock
        
        float tex = fbm(p_rot * 10.0 + seed);
        vec3 albedo = mix(baseDark, rockHigh, tex);
        
        // Veins
        float veinN = noise(p_rot * 5.0 + vec2(sin(u_time*0.1+seed), cos(u_time*0.15+seed))*0.5);
        float veinMask = 1.0 - smoothstep(0.0, 0.06, abs(veinN - 0.5)); // Slightly thicker veins
        
        vec3 veinColor = isCalifornium ? vec3(1.0, 0.85, 0.0) : vec3(0.2, 0.9, 0.3); // Yellow vs Green
        
        // Lighting
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 globalLightDir = normalize(vec3(-1.0, 1.0, 0.5));
        
        float diff = max(0.0, dot(N, globalLightDir));
        float rim = pow(1.0 - max(0.0, dot(N, viewDir)), 3.0);
        
        vec3 finalCol = albedo * (0.1 + diff);
        finalCol += veinColor * veinMask * 2.5; // Glowing veins
        finalCol += glowColorBase * rim * 0.5;
        
        rockFinalCol = finalCol / (1.0 + finalCol * 0.5);
    }
    
    // --- 3. Electrons (Layered on top / behind) ---
    vec3 colElectronFront = vec3(0.0);
    float alphaElectronFront = 0.0;
    
    vec3 colElectronBehind = vec3(0.0);
    float alphaElectronBehind = 0.0;
    
    for (int i = 0; i < 8; i++) { // 8 electrons
         float fi = float(i) + seed;
         float eSeed = seed + fi * 12.34;
         
         // Speed up electrons if dragging too? NO, user wants constant speed everywhere
         float extraSpeed = 1.0; 
         float speed = (1.5 + fract(eSeed)*1.0) * extraSpeed;
         float t = u_time * speed + eSeed * 45.0;
         
         float rFreq = 0.2 + fract(eSeed * 0.456) * 0.15;
         float iFreq = 0.15 + fract(eSeed * 0.123) * 0.1;
         
         // Orbit radius +20% (0.225 -> 0.27)
         float orbitBase = 0.27;
         float orbitRadius = orbitBase + 0.03 * sin(u_time * rFreq + eSeed);
         float inclination = sin(u_time * iFreq + eSeed * 2.5) * 1.5;
         
         vec3 ePos;
         ePos.x = orbitRadius * cos(t);
         ePos.y = orbitRadius * sin(t) * sin(inclination);
         ePos.z = orbitRadius * sin(t) * cos(inclination); 
         
         // In 2D view, we just check distance to projected xy
         // vQuadPos is the 2D plane
         float eDist = distance(vQuadPos, ePos.xy);
         
         // eSize +20% (0.007 -> 0.0084)
         float eSize = 0.0084 * (1.2 + ePos.z * 0.5);  
         if(eSize < 0.002) eSize = 0.002;
         
         float eCore = exp(-eDist * eDist / (2.0 * eSize * eSize));
         float eGlow = exp(-eDist * 20.0) * 0.5;

         // Color depends on type too?
         // Maybe Californium electrons are yellow, Plutonium blue?
         // I'll keep them Blue/Cyan for techy look.
         vec3 eColVal = vec3(0.2, 0.8, 1.0); 
         if (isCalifornium) eColVal = vec3(0.4, 0.9, 1.0); 
         
         float eAlphaVal = max(eCore, eGlow);
         
         // Occlusion check
         // If z < 0, render into 'behind' layer
         if (ePos.z < 0.0) {
             colElectronBehind += eColVal * eAlphaVal;
             alphaElectronBehind = max(alphaElectronBehind, eAlphaVal);
         } else {
             colElectronFront += eColVal * eAlphaVal;
             alphaElectronFront = max(alphaElectronFront, eAlphaVal);
         }
    }
    
    // Composite Layers:
    // 1. Background + Behind Electrons
    vec3 outRGB = glowCol + colElectronBehind;
    // (Add alpha of behind electrons for coverage calc?) 
    // Usually Glow is additive, electrons are additive. 
    // Let's assume background is the "base".
    
    // 2. Mix Rock on top
    // "coverage" is rock opacity
    outRGB = mix(outRGB, rockFinalCol, coverage);
    
    // Alpha so far:
    // If coverage=1 -> Rock is opaque -> alpha=1
    // If coverage=0 -> Glow + BehindElectrons
    float currentAlpha = mix(max(glowAlpha, alphaElectronBehind), 1.0, coverage);
    
    // 3. Front Electrons on top
    outRGB += colElectronFront;
    currentAlpha = max(currentAlpha, alphaElectronFront);
    
    if (currentAlpha < 0.01) discard;
    
    outColor = vec4(outRGB, currentAlpha);
}