#version 300 es
precision highp float;

uniform sampler2D u_neutrons;
uniform float u_controlRods[6]; 
uniform float u_time;

const float SCREEN_W = 800.0;
const float SCREEN_H = 600.0;
const float ATOM_SPACING_X = 800.0 / 41.0;
const float ATOM_SPACING_Y = 600.0 / 30.0;
const float COLLISION_PROB = 0.08;
const float ATOM_RADIUS = 2.0;

out vec4 outColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 data = texelFetch(u_neutrons, coord, 0);

    vec2 pos = data.xy;
    vec2 vel = data.zw;
    float hitID = 0.0;

    if (length(vel) < 0.0001) {
        outColor = vec4(0.0);
        return;
    }

    pos += vel;

    if (pos.x < 0.0 || pos.x > SCREEN_W || pos.y < 0.0 || pos.y > SCREEN_H) {
        outColor = vec4(0.0);
        return;
    }

    int col = int(pos.x / ATOM_SPACING_X);
    int row = int(pos.y / ATOM_SPACING_Y);

    if ((col + 1) % 7 == 0) {
        int rodIdx = (col + 1) / 7 - 1;
        if (pos.y < u_controlRods[rodIdx]) {
            outColor = vec4(0.0);
            return;
        }
    } else {
        int rodColsBefore = (col + 1) / 7; 
        int actualAtomCol = col - rodColsBefore;
        int atomIndex = actualAtomCol * 30 + row;

        vec2 atomPos = vec2(
            float(col) * ATOM_SPACING_X + ATOM_SPACING_X * 0.5,
            float(row) * ATOM_SPACING_Y + ATOM_SPACING_Y * 0.5
        );

        float distSq = dot(pos - atomPos, pos - atomPos);
        float speed = length(vel);
        float adaptedRadius = ATOM_RADIUS * (COLLISION_PROB * 40.0 / speed);
        
        if (distSq < adaptedRadius * adaptedRadius) {
            hitID = float(atomIndex) + 1.0;
            vel = vec2(0.0);
        }
    }

    outColor = vec4(pos, vel.x, (hitID > 0.0) ? hitID : vel.y);
}