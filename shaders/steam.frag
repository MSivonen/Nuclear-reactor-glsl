#version 300 es
precision highp float;

out vec4 outColor;

uniform sampler2D u_steamField;
uniform vec2 u_resolution;
uniform vec2 u_fieldResolution;
uniform vec2 u_viewportOrigin;
uniform float u_time;

// Noise stats
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
        v += amp * noise(p);
        p *= 2.02;
        amp *= 0.5;
    }
    return v;
}

// Simple texture UV function
vec2 getFieldUv(vec2 uv){
    return clamp(uv, vec2(0.001), vec2(0.999));
}

void main(){
    // Calculate UV based on screen position
    vec2 localPx = gl_FragCoord.xy - u_viewportOrigin;
    vec2 uv = localPx / u_resolution;

    // Sample the accumulated density field
    float density = texture(u_steamField, getFieldUv(uv)).r;

    // Soft mask for the blob shape
    float mask = smoothstep(0.15, 0.45, density);

    // Generate scrolling smoke noise
    // Moving upwards means decreasing Y in texture space if texture is static, 
    // or offsetting the lookup.
    vec2 noiseUv = localPx * 0.008; // Noise scale
    vec2 flow = vec2(0.0, -u_time * 0.5); // Upward flow
    
    // Dual layer noise for better smoke look
    float n1 = fbm(noiseUv + flow);
    float n2 = fbm(noiseUv * 1.5 + flow * 1.2 + vec2(3.4, 1.2));
    float n3 = fbm(noiseUv * 1.5 + flow * 3.2 + vec2(8.4, 2.2));
    
    float smokeTex = mix(n1, n2, n3);
    
    // Increase contrast to create real "holes" in the smoke
    // Values below 0.35 become transparent
    float holes = smoothstep(0.25, 0.8, smokeTex);
    
    // Apply holes to the mask
    // Multiply mask by holes. Add a tiny base (0.05) so it's not totally invisible in gaps but very faint.
    float opacity = mask * (0.05 + 0.95 * holes);
    
    // Color also darkens slightly in holes for depth
    vec3 col = mix(vec3(0.85, 0.9, 0.95), vec3(1.0), holes);
    
    // Slightly reduce max alpha overall to prevent blowout
    outColor = vec4(col, opacity * 0.9);
}
