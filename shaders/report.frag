#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    // Kirjoitetaan 1 (kokonaisluku) punaiseen kanavaan
    // UNSIGNED_BYTE tekstuurissa 1.0/255.0 muuttuu arvoksi 1
    outColor = vec4(1.0/255.0, 0.0, 0.0, 1.0);
}