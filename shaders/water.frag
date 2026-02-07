#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_backgroundTexture;
out vec4 outColor;

#define UVScale 			 1.0
#define Speed				 1.5

#define FBM_WarpPrimary		-0.65
#define FBM_WarpSecond		 0.34
#define FBM_WarpPersist 	-0.77
#define FBM_EvalPersist 	 0.24
#define FBM_Persistence 	 0.77
#define FBM_Lacunarity 		 1.08
#define FBM_Octaves 		 6

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
        f += (1.0-abs(n)) *a;	//ridged-like
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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Background texture
    vec4 bg = texture(u_backgroundTexture, uv);

    // Caustics calculations
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = uv * UVScale * 15.0; // Scaled down 1.5x (smaller features = higher frequency)
    p.x *= aspect;
    
    vec4 fbm = (FBM(vec3(p, u_time * Speed + 20.0))) * 0.29;
    
    // Caustic intensity
    // Narrower lines: higher exponent
    float causticMask = pow(fbm.x, 15.0);
    
    // Wave shadows: Darken the background where the wave pattern is low
    // We remap the noise value to get deeper blacks
    float shadow = smoothstep(0.05, 0.2, fbm.x); 

    // Apply tint and shadows to background
    // Dark spots go black (0.0 multiplier)
    vec3 waterColor = vec3(0.65f);
    vec3 bgCol = bg.rgb * (0.0 + 0.2 * shadow); 
    vec3 finalColor = mix(bgCol, waterColor, 0.1); // General blue tint
    
    // Caustic highlights
    // "Transparency to the full exposure" -> Reduce the additive intensity so it's not a solid block of white
    vec3 highlightColor = mix(waterColor, vec3(0.5451, 0.6549, 0.8549), smoothstep(.001, .106, causticMask));
    
    // Add caustics, but less intense to allow some "transparency" feel
    finalColor += highlightColor * causticMask * .21;

    outColor = vec4(finalColor, 1.);
}
