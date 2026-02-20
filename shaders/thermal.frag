precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_dt;
uniform float u_heatTransferCoefficient;
uniform float u_waterFlowSpeed;
uniform float u_inletTemp;
varying vec2 v_uv;

// Read temperature from texture (stored in R channel)
float tempAt(ivec2 coord) {
    vec2 uv = (vec2(coord) + 0.5) / u_resolution;
    return texture2D(u_texture, uv).r;
}

void main() {
    ivec2 size = ivec2(int(u_resolution.x), int(u_resolution.y));
    vec2 texPos = v_uv * u_resolution;
    ivec2 coord = ivec2(int(floor(texPos.x)), int(floor(texPos.y)));
    int x = coord.x;
    int y = coord.y;

    float center = tempAt(coord);

    // neighbor coords (clamped)
    ivec2 left = ivec2(max(x-1, 0), y);
    ivec2 right = ivec2(min(x+1, size.x-1), y);
    ivec2 up = ivec2(x, max(y-1, 0));
    ivec2 down = ivec2(x, min(y+1, size.y-1));

    float tL = tempAt(left);
    float tR = tempAt(right);
    float tU = tempAt(up);
    float tD = tempAt(down);

    // Simple conduction: discrete Laplacian
    float lap = (tL + tR + tU + tD - 4.0 * center) * 0.5;
    float conduction = u_heatTransferCoefficient * lap;

    // Vertical advection: mix with below cell according to flow speed
    float below = tempAt(down);
    float advect = (below - center) * u_waterFlowSpeed;

    float nextTemp = center + (conduction + advect) * u_dt;

    // optionally clamp to realistic bounds
    gl_FragColor = vec4(nextTemp, 0.0, 0.0, 1.0);
}
