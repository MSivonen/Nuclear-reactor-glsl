#version 300 es
precision highp float;

out vec4 outColor;

void main() {
    float coreSize = 0.15;
    float glowAmount = -4.0;

    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(p, p);
    if (d2 > 1.0) discard; // Tee pisteestä pyöreä

    float core = 1.0 - smoothstep(0.0, coreSize, d2);
    float glow = exp(glowAmount * d2);
    
    // Kellertävä väri (nykyinen neutroniväri)
    vec3 col = vec3(1.0, 1.0, 0.8) * core;
    // Lisätään vihertävä/sinertävä tšerenkov-hehku
    col += vec3(0.3, 0.8, 1.0) * glow * 0.4;
    
    outColor = vec4(col, 1.0);
}
