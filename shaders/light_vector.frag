#version 300 es
precision highp float;

uniform sampler2D u_lightMap;
uniform vec2 u_resolution;

out vec4 outColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texelSize = 1.0 / u_resolution;

    // Sobel-ish gradient
    float t  = texture(u_lightMap, uv + vec2(0, texelSize.y)).r;
    float b  = texture(u_lightMap, uv - vec2(0, texelSize.y)).r;
    float l  = texture(u_lightMap, uv - vec2(texelSize.x, 0)).r;
    float r  = texture(u_lightMap, uv + vec2(texelSize.x, 0)).r;

    // Center density for absolute light intensity
    float center = texture(u_lightMap, uv).r;

    // dx and dy are the direction of light increase (gradient)
    // This points TOWARD the light sources.
    float dx = (r - l);
    float dy = (t - b);
    
    // RGB = [Direction X, Direction Y, Combined Intensity]
    outColor = vec4(dx, dy, center, 1.0);
}
