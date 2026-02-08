#version 300 es
precision highp float;

layout(location=0) in vec2 a_pos;
layout(location=1) in vec3 a_color;
layout(location=2) in float a_size;

uniform vec2 u_resolution;

out vec3 vColor;
out vec2 vUv;

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    
    // a_pos is center in pixels.
    // VertexID 0..3 for quad? 
    // Actually simplicity: gl_PointCoord in frag if using POINTS?
    // Max point size is limited. Quads are safer.
    // Let's assume we pass center + quad offset.
    // But easier: use instancing or just a uniform array + 4 verts?
    // Or just generating triangles on CPU in `draw`.
    
    // Simplest: Send 4 verts per electron in a dynamic buffer.
    
    gl_Position = vec4(
        (a_pos.x / u_resolution.x) * 2.0 - 1.0,
        (a_pos.y / u_resolution.y) * -2.0 + 1.0, // Flip Y
        0.0,
        1.0
    );
    gl_PointSize = a_size; // Enable points
    vColor = a_color;
}
