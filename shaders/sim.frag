#version 300 es
precision highp float;

uniform sampler2D u_neutrons;

// Vastaa CPU:n arvoja
const float SCREEN_W = 800.0;
const float SCREEN_H = 600.0;

out vec4 outColor;

void main() {
    // Yksi fragmentti = yksi neutroni
    ivec2 coord = ivec2(gl_FragCoord.xy);

    vec4 data = texelFetch(u_neutrons, coord, 0);

    vec2 pos = data.xy;
    vec2 vel = data.zw;

    // Kuollut neutroni pysyy kuolleena
    if (abs(vel.x) + abs(vel.y) < 0.0001) {
        outColor = vec4(0.0);
        return;
    }

    // 1️⃣ LIIKE ENNEN MITÄÄN MUUTA
    pos += vel;

    // 2️⃣ SEINÄKUOLEMA
    if (
        pos.x < 0.0 || pos.x > SCREEN_W ||
        pos.y < 0.0 || pos.y > SCREEN_H
    ) {
        outColor = vec4(0.0);
        return;
    }

    // 3️⃣ EI MUUTA LOGIIKKAA TÄSSÄ VAIHEESSA
    outColor = vec4(pos, vel);
}
