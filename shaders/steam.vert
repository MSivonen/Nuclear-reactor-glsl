#version 300 es
precision highp float;

layout(location=0) in vec2 a_quadPos;
layout(location=1) in vec2 a_instPos;
layout(location=2) in vec2 a_instSize;
layout(location=3) in float a_instAlpha;

uniform vec2 u_targetSize;

out float vAlpha;
out vec2 vLocal;

void main(){
    vec2 pos = a_instPos + a_quadPos * a_instSize;
    float x = (pos.x / u_targetSize.x) * 2.0 - 1.0;
    float y = (pos.y / u_targetSize.y) * -2.0 + 1.0;
    gl_Position = vec4(x, y, 0.0, 1.0);
    vAlpha = a_instAlpha;
    vLocal = a_quadPos;
}
