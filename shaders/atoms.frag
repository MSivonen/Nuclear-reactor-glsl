#version 300 es
precision highp float;

in vec4 vColor;
in float vFlash;

out vec4 outColor;

void main(){
    vec4 col = vColor;
    if(vFlash > 0.5) {
        col = vec4(1.0, 1.0, 1.0, 1.0);
    }
    outColor = col;
}
