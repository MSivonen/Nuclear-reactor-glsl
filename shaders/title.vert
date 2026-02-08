#version 300 es
precision highp float;

layout(location=0) in vec2 a_position;
layout(location=1) in vec2 a_uv;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform float u_scale;

out vec2 v_uv;
out vec2 v_pos;

void main() {
    vec2 pos = a_position * u_scale + u_translation;
    v_pos = pos;
    
    // Map to clip space -1..1
    // (0,0) is top-left in standard screen coords usually, but often bottom-left in GL
    // If we assume pos is in pixels (0..width, 0..height)
    
    vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0); // Flip Y if 0,0 is top-left
    v_uv = a_uv;
}
