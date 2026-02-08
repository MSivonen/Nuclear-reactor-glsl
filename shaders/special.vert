#version 300 es
precision highp float;

layout(location=0) in vec2 a_quadPos;
layout(location=1) in vec2 a_instPos;
layout(location=2) in vec4 a_instColor;
layout(location=3) in float a_instSize;
layout(location=4) in float a_instFlash;

uniform vec2 u_resolution;
uniform float render_height;
uniform float render_width;

out vec4 vColor;
out float vFlash;
out vec2 vQuadPos;
out vec2 vInstPos;

void main(){
    vec2 pos = a_instPos + a_quadPos * a_instSize;
    float scale = u_resolution.y / render_height;
    float drawWidth = render_width * scale;
    float offsetX = (u_resolution.x - drawWidth) / 2.0;
    float screenX = pos.x * scale + offsetX;
    float screenY = pos.y * scale;
    float x = (screenX / u_resolution.x) * 2.0 - 1.0;
    float y = (screenY / u_resolution.y) * -2.0 + 1.0;
    gl_Position = vec4(x, y, 0.0, 1.0);
    vColor = a_instColor;
    vFlash = a_instFlash;
    vQuadPos = a_quadPos;
    vInstPos = a_instPos;
}