#version 300 es
precision highp float;

uniform sampler2D u_vectorField;
uniform vec2 u_resolution;
uniform float u_shopWidth;

in vec4 vColor;
in float vFlash;

in vec2 vQuadPos;

out vec4 outColor;

void main(){
    // vQuadPos ranges from -0.5..0.5; scale to -1..1 for radial calc
    vec2 p = vQuadPos * 2.0;
    vec2 stretched = p * vec2(1.0, 0.5); // Elongate 2x in y direction
    float d2 = dot(stretched, stretched);
    if(d2 > 1.0) discard;

    // Sample light vector
    vec2 uv = vec2((gl_FragCoord.x - u_shopWidth) / u_resolution.x, gl_FragCoord.y / u_resolution.y);
    vec3 lightData = texture(u_vectorField, uv).rgb;
    float intensity = lightData.z;
    vec2 lightOffset = lightData.xy * 0.5;

    // Glow-only layer: the opaque core is drawn in the main p5 canvas.
    // Here we only emit light that will be screen-blended via CSS.
    float fast = exp(-d2 * 500.0);
    float tail = exp(-d2 * 1.0) * 0.25;
    
    // Directional glow boost
    vec2 shiftedP = p - lightOffset;
    float d2Shifted = dot(shiftedP * vec2(1.0, 0.5), shiftedP * vec2(1.0, 0.5));
    float directionalGlow = exp(-d2Shifted * 3.0) * intensity * 1.5;

    float glow = fast + tail + directionalGlow;

    // Determine glow strength from color intensity (less temp -> less glow)
    float maxc = max(max(vColor.r, vColor.g), vColor.b);
    // Delay glow onset: start later, ramp later
    float glowScale = smoothstep(0.30, 1.0, maxc);
    glow *= 11.2;
    glow *= glowScale;

    vec3 glowCol = vColor.rgb * glow;
    
    // Add neutron light tint
    glowCol += vec3(0.4, 0.6, 1.0) * intensity * 5.0;

    // Radial falloff: make alpha strongest in center and fall to 0 at edges
    float rad = sqrt(d2); // 0.0 at center, up to 1.0 at discard boundary
    float radialFalloff = 1.0 - smoothstep(0.0, 1.0, rad);

    float alpha = clamp(glow, 0.0, 1.0) * radialFalloff;

    outColor = vec4(glowCol, alpha * 0.5);
}
