#version 300 es
precision highp float;

uniform sampler2D u_neutrons;
uniform int u_textureSize; // MAX_NEUTRONS (esim. 32 tai 64)
uniform vec2 u_resolution;  // screenDrawWidth, screenDrawHeight (800, 600)

void main() {
    int id = gl_VertexID; 
    int x = id % u_textureSize;
    int y = id / u_textureSize;

    vec2 uv = (vec2(x, y) + 0.5) / float(u_textureSize);
    vec4 data = texture(u_neutrons, uv);
    vec2 pos = data.xy;
    vec2 vel = data.zw;

    // Jos neutroni on kuollut (nopeus nolla), heitetään se ruudun ulkopuolelle
    if (length(vel) < 0.0001) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    } else {
        // Muunnos 0...800 -> -1...1 (p5js -> WebGL NDC)
        vec2 ndcPos = (pos / u_resolution) * 2.0 - 1.0;
        // Invertoidaan Y, koska WebGL:ssä 0 on alhaalla
        gl_Position = vec4(ndcPos.x, -ndcPos.y, 0.0, 1.0);
    }

    gl_PointSize = 12.0; // Voit säätää tätä tarpeen mukaan
}
