#version 300 es
precision highp float;

layout(location=0) in vec2 a_position;
layout(location=1) in vec2 a_uv;

uniform vec2 u_resolution;
uniform float u_time;

out vec2 v_uv;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    
    // Correct UV aspect ratio for proper circle rendering if needed
    // Assuming a_position is -1..1 quad
    // We want UV centered at 0,0
    vec2 uv = a_position * 0.5;
    
    // If we want it strictly circular regardless of aspect ratio:
    uv.x *= u_resolution.x / u_resolution.y;
    
    v_uv = uv; 
}
