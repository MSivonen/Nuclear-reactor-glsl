#version 300 es
precision highp float;

in float vAlpha;
in vec2 vLocal;

out vec4 outColor;

void main(){
    // Heavy blur: soft rectangle with large feather
    vec2 p = abs(vLocal);
    float edge = .5;
    float feather = 0.45;
    float maskX = 1.0 - smoothstep(edge - feather, edge, p.x);
    float maskY = 1.0 - smoothstep(edge - feather, edge, p.y);
    float mask = maskX * maskY;
    outColor = vec4(1.0, 1.0, 1.0, vAlpha * mask);
}
