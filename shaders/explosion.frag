#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_shopWidth;
uniform float u_elapsed;
uniform float u_viewportX;
uniform float u_viewportY;
out vec4 outColor;

#define UVScale 			 1.0
#define Speed				 1.0

#define FBM_WarpPrimary		0.5
#define FBM_WarpSecond		 0.3
#define FBM_WarpPersist 	 0.8
#define FBM_EvalPersist 	 0.9
#define FBM_Persistence 	 0.6
#define FBM_Lacunarity 		 2.0
#define FBM_Octaves 		 8

vec4 hash43(vec3 p)
{
	vec4 p4 = fract(vec4(p.xyzx) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy+19.19);
	return -1.0 + 2.0 * fract(vec4(
        (p4.x + p4.y)*p4.z, (p4.x + p4.z)*p4.y,
        (p4.y + p4.z)*p4.w, (p4.z + p4.w)*p4.x)
    );
}

//offsets for noise
const vec3 nbs[] = vec3[8] (
    vec3(0.0, 0.0, 0.0),vec3(0.0, 1.0, 0.0),vec3(1.0, 0.0, 0.0),vec3(1.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),vec3(0.0, 1.0, 1.0),vec3(1.0, 0.0, 1.0),vec3(1.0, 1.0, 1.0)
);

//'Simplex out of value noise', forked from: https://www.shadertoy.com/view/XltXRH
vec4 AchNoise3D(vec3 x)
{
    vec3 p = floor(x);
    vec3 fr = smoothstep(0.0, 1.0, fract(x));

    vec4 L1C1 = mix(hash43(p+nbs[0]), hash43(p+nbs[2]), fr.x);
    vec4 L1C2 = mix(hash43(p+nbs[1]), hash43(p+nbs[3]), fr.x);
    vec4 L1C3 = mix(hash43(p+nbs[4]), hash43(p+nbs[6]), fr.x);
    vec4 L1C4 = mix(hash43(p+nbs[5]), hash43(p+nbs[7]), fr.x);
    vec4 L2C1 = mix(L1C1, L1C2, fr.y);
    vec4 L2C2 = mix(L1C3, L1C4, fr.y);
    return mix(L2C1, L2C2, fr.z);
}

vec4 ValueSimplex3D(vec3 p)
{
	vec4 a = AchNoise3D(p);
	vec4 b = AchNoise3D(p + 120.5);
	return (a + b) * 0.5;
}

//my FBM
vec4 FBM(vec3 p)
{
    vec4 f, s, n = vec4(0.0);
    float a = 1.0, w = 0.0;
    for (int i=0; i<FBM_Octaves; i++)
    {
        n = ValueSimplex3D(p);
        f += n * a;	// regular noise
        s += n.zwxy *a;
        a *= FBM_Persistence;
        w *= FBM_WarpPersist;
        p *= FBM_Lacunarity;
        p += n.xyz * FBM_WarpPrimary *w;
        p += s.xyz * FBM_WarpSecond;
        p.z *= FBM_EvalPersist +(f.w *0.5+0.5) *0.0003;
    }
    return f;
}

vec3 firePalette(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c1 = vec3(0.0, 0.0, 0.0); // black
    vec3 c2 = vec3(1.0, 0.0, 0.0); // red
    vec3 c3 = vec3(1.0, 0.5, 0.0); // orange
    vec3 c4 = vec3(1.0, 1.0, 0.0); // yellow
    vec3 c5 = vec3(1.0, 1.0, 1.0); // white
    
    if (t < 0.2) return mix(c1, c2, t * 5.0);
    if (t < 0.4) return mix(c2, c3, (t - 0.2) * 5.0);
    if (t < 0.6) return mix(c3, c4, (t - 0.4) * 5.0);
    if (t < 0.8) return mix(c4, c5, (t - 0.6) * 5.0);
    return c5;
}

vec4 computeBg(float elapsed) {
    float t = elapsed * 5.0; // 0 to 5 over 2 seconds
    int phase = int(t);
    float frac = fract(t);
    
    vec3 colors[5] = vec3[5](
        vec3(1.0, 1.0, 1.0), // white
        vec3(1.0, 1.0, 1.0), // white
        vec3(1.0, 1.0, 0.0), // yellow
        vec3(1.0, 0.0, 0.0), // red
        vec3(0.0, 0.0, 0.0)  // black
    );
    
    float alphas[5] = float[5](0.0, 1.0, 0.9, 0.8, 0.85);
    
    vec3 bgColor;
    float bgAlpha;
    
    if (phase < 4) {
        bgColor = mix(colors[phase], colors[phase+1], frac);
        bgAlpha = mix(alphas[phase], alphas[phase+1], frac);
    } else {
        bgColor = colors[4];
        bgAlpha = alphas[4];
    }
    
    return vec4(bgColor, bgAlpha);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - vec2(u_viewportX, u_viewportY)) / u_resolution.xy;
    
    // Background color transition
    vec4 bg = computeBg(u_elapsed);
    
    // Fire effect
    vec3 fireColor = vec3(0.0);
        // Turbulent noise for color
        vec2 p1 = uv * UVScale * 5.0;
        vec4 fbm1 = FBM(vec3(p1, u_time * Speed));
        float noise1 = fbm1.x;
        
        // Turbulent noise for intensity variation
        vec2 p2 = uv * UVScale * 10.0;
        vec4 fbm2 = FBM(vec3(p2, u_time * Speed * 1.1 + 10.0));
        float noise2 = fbm2.x;
        
        // Fire color palette
        vec3 baseFireColor = firePalette(noise1);
        
        // Intensity with turbulence
        float baseIntensity = smoothstep(0.0, 1.0, noise1);
        float turbulence = (noise2 * 0.5 + 0.5);
        float intensity = baseIntensity * turbulence * 4.0;
        
        fireColor = baseFireColor * intensity;
    
    // Combine background and fire
    vec3 finalColor = bg.rgb + fireColor;
    float maxAlpha = max(bg.a, clamp(intensity * 0.5, 0.0, 1.0)); // Ensure fire contributes to alpha

    outColor = vec4(finalColor, maxAlpha);
}