#version 300 es
precision highp float;

uniform sampler2D u_neutrons;
uniform int u_textureSize;
uniform vec2 u_resolution; // 1324, 768
uniform vec2 u_simSize;    // 800, 600

void main() {
    int id = gl_VertexID;
    vec2 uv = (vec2(id % u_textureSize, id / u_textureSize) + 0.5) / float(u_textureSize);
    
    vec4 data = texture(u_neutrons, uv);
    vec2 pos = data.xy;

    // 1. Lasketaan kuinka paljon 4:3 kuvaa skaalataan, jotta se täyttää pystysuunnan (768)
    float scale = u_resolution.y / u_simSize.y; 
    
    // 2. Lasketaan 4:3 alueen leveys näytöllä (600 -> 768, eli 800 -> 1024)
    float drawWidth = u_simSize.x * scale;
    
    // 3. Lasketaan mustien reunojen leveys ( (1324 - 1024) / 2 = 150 )
    float offsetX = (u_resolution.x - drawWidth) / 2.0;

    // 4. Muunnetaan simulaatiopiste (0..800) näyttöpisteeksi (150..1174)
    float screenX = pos.x * scale + offsetX;
    float screenY = pos.y * scale;

    // 5. Muunnetaan näyttöpisteet välille -1..1 (NDC)
    float x = (screenX / u_resolution.x) * 2.0 - 1.0;
    float y = (screenY / u_resolution.y) * -2.0 + 1.0; // Invert Y

    gl_Position = vec4(x, y, 0.0, 1.0);
    gl_PointSize = (length(data.zw) > 0.0) ? 25.0 : 0.0;
}