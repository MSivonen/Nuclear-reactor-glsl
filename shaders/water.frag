#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 outColor;

const float SCREEN_W = 800.;
const float SCREEN_H = 600.;

float wave(vec2 p, float freq, float speed, float amp) {
    return sin((p.x + p.y) * freq + u_time * speed) * amp;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = uv * vec2(SCREEN_W, SCREEN_H);

    float w = 0.0;
    w += wave(p * 0.01, 1.5, 0.6, 0.6);
    w += wave(p * 0.03, 3.0, 1.2, 0.25);
    w += wave(p * 0.08, 7.0, 1.8, 0.08);

    float ripple = smoothstep(-1.0, 1.0, w);

    vec3 base = vec3(52.0, 95.0, 214.0) / 255.0;
    vec3 light = base + vec3(0.08, 0.12, 0.14) * ripple;
    light *= mix(0.98, 1.06, uv.y);

    outColor = vec4(light, 1.0);
}
