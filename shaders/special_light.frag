#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vQuadPos;

out vec4 outColor;

void main() {
    float dist = length(vQuadPos * 2.0);
    // Soft radial falloff for the light emission
    float falloff = smoothstep(1.0, 0.0, dist);
    falloff = pow(falloff, 2.5); // Softer edges
    
    // Intensity 0.02 as requested
    vec3 col = vColor.rgb * falloff * 0.18;
    outColor = vec4(col, 1.0);
}
