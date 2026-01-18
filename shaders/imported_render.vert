#version 300 es
precision highp float;

uniform sampler2D state;
uniform int size;
uniform float radius;

out vec2 localPos;

void main() {
    int id = gl_InstanceID;
    int x = id % size;
    int y = id / size;

    vec2 uv = (vec2(x, y) + 0.5) / float(size);
    vec2 pos = texture(state, uv).xy;

    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = radius * 1000.0; // skaalataan ruutuun

    localPos = pos;
}
