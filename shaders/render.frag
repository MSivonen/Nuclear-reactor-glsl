#version 300 es
precision highp float;

out vec4 outColor;

void main(){
    float coreSize=.08;
    float glowAmount=-2.;
    
    // Keskitetty koordinaatti
    vec2 p=gl_PointCoord*2.-1.;
    float d2=dot(p,p);
    if(d2>1.)discard;
    
    // Core ja glow
    float core=1.-smoothstep(0.,coreSize,d2);
    float glow=exp(glowAmount*d2);
    
    vec3 col=vec3(core);
    col+=vec3(.2941,1.,.2)*glow;
    
    outColor=vec4(col,glow+core);
}
