#version 300 es
precision highp float;
uniform float coreSize; //.05
uniform float glowAmount; //-3.

out vec4 color;

void main(){
    vec2 p=gl_PointCoord*2.-1.;
    float d2=dot(p,p);
    
    // ydin
    float core=1.-smoothstep(0.,coreSize,d2);
    
    // glow
    float glow=exp(glowAmount*d2);
    
    vec3 col=vec3(core);
    col+=vec3(.2941,1.,.2)*glow*.3;
    
    color=vec4(col,1.);
}