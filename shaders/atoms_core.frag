#version 300 es
precision highp float;

in vec4 vColor;
in float vFlash;
in vec2 vQuadPos;

out vec4 outColor;

void main() {
    // vQuadPos ranges from -0.5..0.5; scale to -1..1 for radial calc
    vec2 p = vQuadPos * 2.0;
    float d2 = dot(p, p);
    if (d2 > 1.0) discard;

    // Soft circular core (opaque center, antialiased edge)
    float coreSize = 0.60;
    float core = 1.0 - smoothstep(0.0, coreSize, d2);

    vec3 col = vColor.rgb;
    if (vFlash > 0.5) {
        col = vec3(1.0);
    }

    outColor = vec4(col * core, core);
}
