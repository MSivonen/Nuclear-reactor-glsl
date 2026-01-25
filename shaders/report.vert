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
    
    // Sim.frag kirjoittaa osuman tapauksessa pos = (-200,-200) ja w = atomID (>0).
    // Varmistetaan että kyseessä on nimenomaan osuma: pos.x < 0.0 ja w > 0.0
    float atomID = data.w;

    if (!(data.x < 0.0 && atomID > 0.0)) {
        // Ei osumaa -> piirrä piste ruudun ulkopuolelle
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
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