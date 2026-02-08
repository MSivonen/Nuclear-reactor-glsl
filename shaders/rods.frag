#version 300 es
precision highp float;

uniform sampler2D u_vectorField;
uniform vec2 u_resolution; 
uniform float u_shopWidth;
uniform float u_time;

in vec4 vColor;
in vec2 vQuadPos;
in float vIsHandle;

out vec4 outColor;

// Reuse the noise from atoms for consistency
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.71, 31.17))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main(){
    vec2 p = vQuadPos * 2.0; // -1 to 1

    // 0. Soft Target Handle check
    if (vIsHandle > 1.5) {
        float d = length(p);
        if (d > 1.0) discard;

        // Hazy white transparent fill
        float hazy = (1.0 - d) * 0.25;
        
        // Soft white outline
        // Concentrated around the edge (0.8 to 1.0)
        float outline = smoothstep(0.7, 0.95, d) * smoothstep(1.0, 0.95, d);
        outline *= 0.8;

        float alpha = clamp(hazy + outline, 0.0, 1.0) * vColor.a;
        outColor = vec4(vColor.rgb, alpha);
        return;
    }
    
    // 1. Light Data Sampling
    vec2 uv = vec2((gl_FragCoord.x - u_shopWidth) / u_resolution.x, gl_FragCoord.y / u_resolution.y);
    vec3 lightData = texture(u_vectorField, uv).rgb;
    vec3 lightDir = normalize(vec3(lightData.xy * 20.0, 0.5));
    float neutronIntensity = lightData.z;

    vec3 normal;
    float mask = 1.0;

    if (vIsHandle > 0.5) {
        // Sphere logic
        float d = length(p);
        if (d > 1.0) discard;
        float z = sqrt(max(0.0, 1.0 - d*d));
        // Flip p.y to match WebGL's Y-up screen space for light directions
        normal = normalize(vec3(p.x, -p.y, z));
        mask = smoothstep(1.0, 0.98, d);
    } else {
        // Vertical Cylinder logic
        if (abs(p.x) > 1.0) discard;
        float nx = p.x;
        float nz = sqrt(max(0.0, 1.0 - nx*nx));
        normal = vec3(nx, 0.0, nz);
    }

    // Add subtle bumps
    float bumpScale = 0.1;
    vec3 perturbedNormal = normalize(normal + vec3(noise(vQuadPos*40.0)-0.5, noise(vQuadPos*40.0+vec2(1,1))-0.5, 0.0) * bumpScale);

    // 2. Shading
    vec3 baseCol = vColor.rgb; 
    // If color is too dark, boost it for the "ultra good" look
    if (length(baseCol) < 0.3) baseCol = vec3(0.25, 0.2, 0.3); // Deep metallic violet/gray

    float diff = max(0.0, dot(perturbedNormal, lightDir));
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(0.0, dot(perturbedNormal, halfVec)), 32.0);
    
    float rim = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);
    float ambient = 0.15;

    // 3. Composition
    vec3 col = baseCol * (ambient + diff * neutronIntensity * 3.0);
    col += vec3(0.9, 0.9, 1.0) * spec * neutronIntensity * 2.0;
    col += vec3(0.8, 0.8, 1.0) * rim * 0.3;

    // Metal texture (vertical brushed metal look)
    float brush = noise(vQuadPos * vec2(100.0, 2.0));
    col *= (0.9 + 0.1 * brush);

    outColor = vec4(col * mask, mask);
}
