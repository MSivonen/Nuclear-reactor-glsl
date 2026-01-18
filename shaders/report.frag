#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    // Kirjoitetaan pieni arvo punaiseen kanavaan. 
    // Blending hoitaa summan jos useita osumia.
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}