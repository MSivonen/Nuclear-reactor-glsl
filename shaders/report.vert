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
    
    // Oletetaan että sim.frag tallentaa osuman atomin ID:n neutronin w-komponenttiin
    // Jos w > 0, kyseessä on osuma
    float atomID = data.w; 
    
    if (atomID <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // Ruudun ulkopuolelle
    } else {
        // Muutetaan atomID (0...1229) takaisin 2D-koordinaateiksi raporttitekstuurissa
        float x = mod(atomID - 1.0, float(u_uraniumCountX));
        float y = floor((atomID - 1.0) / float(u_uraniumCountX));
        
        // NDC-koordinaatit -1...1 raporttitekstuurin alueella
        vec2 reportPos = (vec2(x, y) + 0.5) / vec2(u_uraniumCountX, u_uraniumCountY);
        gl_Position = vec4(reportPos * 2.0 - 1.0, 0.0, 1.0);
    }
    gl_PointSize = 1.0;
}