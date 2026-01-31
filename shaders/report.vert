#version 300 es
precision highp float;

uniform sampler2D u_neutrons;
uniform int u_textureSize;
uniform int u_uraniumCountX;
uniform int u_uraniumCountY;


void main() {
    int id = gl_VertexID;
    vec2 uv = (vec2(id % u_textureSize, id / u_textureSize) + 0.5) / float(u_textureSize);
    vec4 data = texture(u_neutrons, uv);
    
    // sim.frag writes pos = (-200,-200) and w = atomID (>0) on a hit.
    // Confirm a real hit: pos.x < 0.0 and w > 0.0.
    float atomID = data.w;

    if (!(data.x < 0.0 && atomID > 0.0)) {
        // No hit -> draw offscreen.
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    } else {
        // Convert atomID (0...1229) back to 2D coordinates in the report texture.
        float x = mod(atomID - 1.0, float(u_uraniumCountX));
        float y = floor((atomID - 1.0) / float(u_uraniumCountX));
        
        // NDC coordinates -1...1 across the report texture.
        vec2 reportPos = (vec2(x, y) + 0.5) / vec2(u_uraniumCountX, u_uraniumCountY);
        gl_Position = vec4(reportPos * 2.0 - 1.0, 0.0, 1.0);
    }

    gl_PointSize = 1.0;
}