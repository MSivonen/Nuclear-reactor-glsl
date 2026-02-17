#version 300 es
precision highp float;

layout(location=0) in vec2 a_quadPos;      // -0.5 to 0.5
layout(location=1) in vec2 a_instPos;      // Top-left or Center? Let's say Center for simplicity
layout(location=2) in vec4 a_instColor;
layout(location=3) in vec2 a_instSize;     // width, height
layout(location=4) in float a_isHandle;    // 1.0 for sphere, 0.0 for moderator

uniform vec2 u_resolution;
uniform float render_height;
uniform float render_width;
uniform float u_shopWidth;

out vec4 vColor;
out vec2 vQuadPos;
out float vIsHandle;

void main(){
    // a_quadPos is -0.5..0.5
    // Scale by instance size
    vec2 sizePos = a_quadPos * a_instSize;
    
    // Position offset: a_instPos is top-left in current 2D logic.
    // Let's adjust to draw from top-left if a_isHandle is 0
    vec2 pos;
    if (a_isHandle > 0.5) {
        pos = a_instPos + sizePos; // Handle is centered
    } else {
        pos = a_instPos + sizePos + a_instSize * 0.5; // Moderator is top-left in JS, adjust to center-based draw
    }

    float scale = u_resolution.y / render_height;
    float drawWidth = render_width * scale;
    float offsetX = (u_resolution.x - drawWidth) / 2.0;
    
    float screenX = pos.x * scale + offsetX;
    float screenY = pos.y * scale;
    
    float x = (screenX / u_resolution.x) * 2.0 - 1.0;
    float y = (screenY / u_resolution.y) * -2.0 + 1.0;
    
    gl_Position = vec4(x, y, 0.0, 1.0);
    vColor = a_instColor;
    vQuadPos = a_quadPos;
    vIsHandle = a_isHandle;
}
