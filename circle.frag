uniform float time;
uniform vec2 resolution;

uniform int numNeutrons;
uniform vec2[] neutronPositions;
uniform float[] neutronSpeeds;
uniform bool[] neutronAlives;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;

    vec3 color = vec3(1, 1, 1);
    for (int i = 0; i < numNeutrons; ++i) {
        if (neutronAlives[i]) {
            float d = distance(neutronPositions[i], uv);
            if (d < 10.0) {
                color = mix(color, vec3(1, 0, 0), pow(d / 10.0, 2));
                break;
            }
        }
    }

    gl_FragColor = vec4(color, 1);
}