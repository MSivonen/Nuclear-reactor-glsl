#version 300 es
precision highp float;

in vec4 vColor;
in float vFlash;
in vec2 vQuadPos;

uniform float u_time;

out vec4 outColor;

void main(){
    // vQuadPos is -0.5 to 0.5. 
    // Quad size is item.radius * 6.0 in specialRenderer.js.
    // Scale vQuadPos so length(p) = 1.0 is the sphere radius.
    vec2 p = vQuadPos * 6.0;
    float dist = length(p);
    
    // Identify type: Plutonium (Green) vs Californium (Yellow)
    bool isCalifornium = (vColor.r > 0.5); 
    float seed = isCalifornium ? 1.0 : 7.0;
    
    // Base Colors
    vec3 baseGray = vec3(0.22, 0.24, 0.26); // Metallic base
    vec3 glowColor = isCalifornium ? vec3(1.0, 0.9, 0.1) : vec3(0.1, 1.0, 0.3);
    
    // Anti-aliased sphere mask
    float edgeWidth = fwidth(dist);
    if(edgeWidth <= 0.0) edgeWidth = 0.02; // Fallback
    float sphereMask = 1.0 - smoothstep(1.0 - edgeWidth, 1.0 + edgeWidth, dist);
    
    // --- Orbiting Electrons Logic ---
    vec3 colBehind = vec3(0.0);
    float alphaBehind = 0.0;
    vec3 colFront = vec3(0.0);
    float alphaFront = 0.0;
    
    for (int i = 0; i < 13; i++) {
        float fi = float(i);
        float eSeed = seed + fi * 17.31;
        
        // Speeds depend on index with unique per-electron offset
        float speedBase = 1.2 + fi * 0.12; 
        float speedRandom = fract(eSeed * 0.9123) * 0.6;
        float t = u_time * (speedBase + speedRandom) + eSeed * 456.78;
        
        // Individualized randomness for orbit behavior (radius and inclination)
        // Each electron gets its own oscillator frequencies
        float rFreq = 0.2 + fract(eSeed * 0.456) * 0.15;
        float iFreq = 0.15 + fract(eSeed * 0.123) * 0.1;
        
        float orbitRadius = 1.6 + 0.6 * sin(u_time * rFreq + eSeed);
        float inclination = sin(u_time * iFreq + eSeed * 2.5) * 1.5;
        
        // 3D Orbit Position (x, y, z)
        vec3 ePos;
        ePos.x = orbitRadius * cos(t);
        ePos.y = orbitRadius * sin(t) * sin(inclination);
        ePos.z = orbitRadius * sin(t) * cos(inclination);
        
        // Electron visual appearance
        float eDist = distance(p, ePos.xy);
        float eSize = 1.15 * (1.1 + 0.4 * ePos.z / orbitRadius); 
        
        // Electron core and glow (white-blue)
        float eCore = exp(-eDist * 40.0 / eSize);
        float eGlowIntensity = exp(-eDist * 7.0 / eSize);
        vec3 eColor = mix(vec3(0.2, 0.6, 1.0), vec3(0.8, 0.9, 1.0), eCore);
        float eAlpha = max(eCore, eGlowIntensity * 0.8);
        
        // Premultiply electron color by its fade-in/out logic
        vec3 preECol = eColor * eAlpha;
        
        if (ePos.z < 0.0) {
            // Blend electron behind
            colBehind = colBehind * (1.0 - eAlpha) + preECol;
            alphaBehind = max(alphaBehind, eAlpha);
        } else {
            // Blend electron front
            colFront = colFront * (1.0 - eAlpha) + preECol;
            alphaFront = max(alphaFront, eAlpha);
        }
    }
    
    // --- Sphere Surface Styling ---
    float z = sqrt(max(0.0, 1.0 - dot(p, p)));
    // Flip p.y to match WebGL's Y-up orientation for lightDir behavior
    vec3 normal = normalize(vec3(p.x, -p.y, z));
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    
    float diff = max(0.0, dot(normal, lightDir));
    float spec = pow(max(0.0, dot(reflect(-lightDir, normal), vec3(0,0,1))), 15.0);
    
    vec3 surfaceColor = baseGray * (diff * 0.7 + 0.3) + vec3(spec * 0.4);
    
    // Add radioactive "fleck" details
    float detail = sin(p.x * 6.0 + u_time) * cos(p.y * 6.0 - u_time * 0.8);
    // Increased glow/brightness on the surface
    surfaceColor = mix(surfaceColor, glowColor * 1.5, (0.35 + 0.2 * detail) * sphereMask);
    
    // --- Final Composition ---
    // Using explicit premultiplied composition for all layers
    vec3 finalCol = vec3(0.0);
    float finalAlpha = 0.0;
    
    // 1. Layer Behind (Premultiplied)
    finalCol = colBehind;
    finalAlpha = alphaBehind;
    
    // 2. External glow of the core (Premultiplied)
    float extGlowIntensity = exp(-(dist - 1.0) * 8.0) * (1.0 - sphereMask);
    vec3 extGlowCol = glowColor * extGlowIntensity * 0.7;
    float extGlowAlpha = extGlowIntensity * 0.6;
    
    // Mix ext glow into the background (standard "over" operator for premultiplied alpha)
    finalCol = finalCol * (1.0 - extGlowAlpha) + extGlowCol;
    finalAlpha = finalAlpha * (1.0 - extGlowAlpha) + extGlowAlpha;
    
    // 3. Sphere Surface (Premultiplied)
    vec3 surfacePremult = surfaceColor * sphereMask;
    finalCol = finalCol * (1.0 - sphereMask) + surfacePremult;
    finalAlpha = finalAlpha * (1.0 - sphereMask) + sphereMask;
    
    // 4. Layer Front (Premultiplied)
    // colFront is already premultiplied in the loop
    finalCol = finalCol * (1.0 - alphaFront) + colFront;
    finalAlpha = finalAlpha * (1.0 - alphaFront) + alphaFront;
    
    // Boundary fade (applied to both color and alpha to maintain premultiplication)
    float mask = (1.0 - smoothstep(2.5, 3.0, dist));
    finalCol *= mask;
    finalAlpha *= mask;
    
    if (finalAlpha < 0.001) discard;
    
    outColor = vec4(finalCol, finalAlpha);
}
