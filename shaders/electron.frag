#version 300 es
precision highp float;

in vec3 vColor;
out vec4 outColor;

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float dist = length(coord);
    if(dist > 1.0) discard;
    
    // Blue-white glow like special.frag
    // eCore = exp(-eDist * 40.0 / eSize);
    // eGlow = exp(-eDist * 7.0 / eSize);
    // Here dist is 0..1.
    
    float core = exp(-dist * dist * 10.0);
    float glow = exp(-dist * 2.0);
    
    float alpha = max(core, glow * 0.5);
    
    vec3 col = vColor * (core + glow * 0.5);
    // Tint towards white at center
    col += vec3(0.8) * core;
    
    outColor = vec4(col, alpha);
}
