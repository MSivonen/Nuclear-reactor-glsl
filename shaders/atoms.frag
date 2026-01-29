#version 300 es
precision highp float;

in vec4 vColor;
in float vFlash;

in vec2 vQuadPos;

out vec4 outColor;

void main(){
    // vQuadPos ranges from -0.5..0.5; scale to -1..1 for radial calc
    vec2 p = vQuadPos * 2.0;
    float d2 = dot(p, p);
    if(d2 > 1.0) discard;

    // Glow-only layer: the opaque core is drawn in the main p5 canvas.
    // Here we only emit light that will be screen-blended via CSS.
    float fast = exp(-d2 * 200.0);
    float tail = exp(-d2 * 2.0) * 0.25;
    float glow = fast + tail;

    // Determine glow strength from color intensity (less temp -> less glow)
    float maxc = max(max(vColor.r, vColor.g), vColor.b);
    // below ~0.05 -> no glow, near 1.0 -> full glow
    float glowScale = smoothstep(0.05, 0.95, maxc);
    glow *= 11.2;
    glow *= glowScale;

    vec3 glowCol = vColor.rgb * glow;
    float alpha = clamp(glow, 0.0, 1.0);

    if (vFlash > 0.5) {
        float flashBoost = 1.5;
        glowCol = vec3(1.0) * (glow * flashBoost);
        alpha = clamp(glow * flashBoost, 0.0, 1.0);
    }

    outColor = vec4(glowCol, alpha*.5);
}
