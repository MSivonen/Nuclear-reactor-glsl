#version 300 es
precision highp float;

layout(location = 0) in vec2 a_quadPos;
layout(location = 1) in vec4 a_params; // startX, speed, phase, size

uniform vec2 u_resolution;
uniform float u_time;

out vec2 v_uv;

void main() {
    float startX = a_params.x;
    float speed = a_params.y;
    float phase = a_params.z;
    float size = a_params.w;

    float buffer = 20.0; // Distance below/above screen to spawn/kill
    float loopHeight = u_resolution.y + buffer * 2.0;
    
    // Calculate Y position based on time
    // We use phase to offset the time per instance so they don't all move in sync
    // We also use it to offset start position so they don't all start at bottom at t=0
    float yOffset = phase * (loopHeight / 6.28); // Map phase 0..2PI to height approximately
    
    // Current Y in a continuous loop
    float linearY = u_time * speed + yOffset;
    
    // Modulo to wrap around
    float y = mod(linearY, loopHeight) - buffer;

    // Jiggle X
    // Jiggle depends on time and unique phase
    float jiggle = sin(u_time * 3.0 + phase) * 5.0;
    float x = startX + jiggle;

    vec2 screenPos = vec2(x, y);
    vec2 vertexPixelPos = screenPos + (a_quadPos * size);

    // Convert to clip space
    vec2 clipPos = (vertexPixelPos / u_resolution) * 2.0 - 1.0;
    
    gl_Position = vec4(clipPos, 0.0, 1.0);
    v_uv = a_quadPos + 0.5;
}
