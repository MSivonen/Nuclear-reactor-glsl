#version 300 es
precision highp float;

out vec4 outColor;

void main(){
    float coreSize=.003;
    float glowAmount=-4.;
    
    // Centered coordinates
    vec2 p=gl_PointCoord*2.-1.;
    float d2=dot(p,p);
    if(d2>1.)discard;
    
    // Core and glow
    float core=1.-smoothstep(0.,coreSize,d2);
    float glow=exp(glowAmount*d2);
    
    float fast=exp(-d2*200.);
    float tail=exp(-d2*12.)*.25;
    
    //   int loops=100000;
    //   for(int i=0;i<loops;i++){
    //       tail+=sin(float(i)*d2*12.3456)*.0000001;
    //   }
    // DEBUG TO SLOW DOWN THE GPU

    glow=fast+tail;
    
    vec3 col=vec3(core);
    col+=vec3(.2941,1.,.2)*glow;
    
    outColor=vec4(col,glow+core);
}
