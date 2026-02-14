#version 300 es
precision highp float;

in float vAlpha;
in vec2 vLocal;

out vec4 outColor;

void main(){
    // Calculate distance from center (0 to 1 at edge)
    float d = length(vLocal) * 2.0; 
    
    // Smooth falloff (Metaball kernel)
    // (1 - d^2)^2 gives a nice bell curve.
    // 1.0 at center, 0.0 at edge.
    float shape = max(0.0, 1.0 - d * d);
    shape = shape * shape;

    // Use alpha blending to accumulate the 'field'
    // This value represents density, not opacity directly.
    float val = shape * vAlpha;
    outColor = vec4(val, 0.0, 0.0, val);
}
