#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

void main() {
    // Distance from center (0.5, 0.5)
    float dist = length(v_uv - 0.5);
    
    // Ring parameters
    float radius = 0.25;
    float thickness = 0.1;
    
    // Create a ring using smoothstep for anti-aliasing
    // Outer edge: alpha goes from 1 to 0 around radius
    // Inner edge: alpha goes from 0 to 1 around radius - thickness
    float outer = 1.0 - smoothstep(radius - 0.02, radius + 0.02, dist);
    float inner = 1.0 - smoothstep(radius - thickness - 0.02, radius - thickness + 0.02, dist);
    
    // Ring contribution
    float ring = outer - inner;
    
    // Fill contribution (inside the ring)
    float fill = inner;
    
    // Combine them
    float combinedAlpha = (ring * 0.1) + (fill * 0.05);
    
    if (combinedAlpha < 0.001) discard;
    
    fragColor = vec4(1.0, 1.0, 1.0, combinedAlpha*.5);
}
