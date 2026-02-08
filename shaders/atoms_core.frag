#version 300 es
precision highp float;

uniform sampler2D u_vectorField;
uniform vec2 u_resolution; // This is screenSimWidth, screenHeight based on atomsRenderer.js
uniform float u_shopWidth;

in vec4 vColor;
in vec2 vQuadPos;

out vec4 outColor;

// Pseudo-random noise for "bumpy" texture
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
    // vQuadPos ranges from -0.5..0.5; scale to -1..1
    vec2 p=vQuadPos*2.;

    // Sample light vector from simulation-relative UV
    // gl_FragCoord is relative to canvas, so subtract shop offset
    vec2 uv = vec2((gl_FragCoord.x - u_shopWidth) / u_resolution.x, gl_FragCoord.y / u_resolution.y);
    vec3 lightData = texture(u_vectorField, uv).rgb;
    
    // lightData: x=dx, y=dy, z=intensity
    // Gradient points toward light, so use as is or normalize
    vec3 lightDir = normalize(vec3(lightData.xy * 25.0, 0.4)); // Assume light is slightly in front
    float intensity = lightData.z;

    // Procedural Normal for a vertical cylinder
    float nx = p.x; 
    float nz = sqrt(max(0.0, 1.0 - nx*nx));
    vec3 baseNormal = vec3(nx, 0.0, nz);

    // Add high-frequency noise bumps
    float bumpScale = 0.2;
    float n1 = noise(p * 8.0);
    float n2 = noise(p * 16.0) * 0.5;
    vec3 perturbedNormal = normalize(baseNormal + vec3(noise(p*15.0)-0.5, noise(p*15.0+vec2(1,1))-0.5, 0.0) * bumpScale);

    // Shading
    float diff = max(0.0, dot(perturbedNormal, lightDir));
    float ambient = 0.15;
    float lighting = ambient + diff * intensity * 4.0;
    
    // Rectangular core with soft edges (antialiased)
    float halfX=.5;// half-width of rectangle in -1..1 space
    float halfY=1.1;// half-height
    float feather=.08;// softness of the edges
    
    vec2 ap=abs(p);
    float ax=1.-smoothstep(halfX-feather,halfX+1e-5,ap.x);
    float ay=1.-smoothstep(halfY-feather,halfY+1e-5,ap.y);
    float core=ax*ay;
    
    // Metal-like Specular highlight
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 h = normalize(lightDir + viewDir);
    float spec = pow(max(0.0, dot(perturbedNormal, h)), 48.0);
    
    // Edge Rim Light (fresnel-ish)
    float rim = pow(1.0 - max(0.0, dot(baseNormal, viewDir)), 3.0);

    vec3 baseGray = vec3(0.2, 0.22, 0.25); // Darker metallic base
    vec3 centerColor = vec3(0.47, 0.59, 0.45);
    
    // Composition
    vec3 col = baseGray * lighting;
    
    // Internal radioactive glow (from heat)
    vec3 glowCol = vColor.rgb * (0.4 + 0.6 * (1.0 - nz)); 
    col = mix(col, glowCol, 0.3); // Mix metallic base with radioactive glow
    col += glowCol * 0.5; // Additive boost for core heat

    // Additive highlights from neutrons
    col += vec3(0.8, 0.9, 1.0) * spec * intensity * 2.5;
    col += vec3(0.7, 0.8, 1.0) * rim * 0.2;

    // Scratches / Metal Texture
    float textureDetail = smoothstep(0.45, 0.5, noise(p * vec2(1.0, 30.0)));
    col *= (1.0 - textureDetail * 0.2);
    
    outColor=vec4(col*core,core);
}
