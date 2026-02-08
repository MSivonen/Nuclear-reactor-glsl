#version 300 es
precision highp float;

out vec4 outColor;

void main() {
    vec2 p = gl_PointCoord - 0.5;
    float dist = length(p);
    float alpha = smoothstep(0.5, 0.0, dist);
    // Exponential falloff for softer glow
    alpha = pow(alpha, 2.0) * 0.001; 
    outColor = vec4(vec3(alpha), 1.0);
}
