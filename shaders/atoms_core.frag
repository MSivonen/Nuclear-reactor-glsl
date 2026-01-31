#version 300 es
precision highp float;

in vec4 vColor;
in float vFlash;
in vec2 vQuadPos;

out vec4 outColor;

void main(){
    // vQuadPos ranges from -0.5..0.5; scale to -1..1
    vec2 p=vQuadPos*2.;

    vec3 centerColor=vec3(0.47f, 0.59f, 0.45f);
    
    // Rectangular core with soft edges (antialiased)
    float halfX=.5;// half-width of rectangle in -1..1 space
    float halfY=1.1;// half-height
    float feather=.12;// softness of the edges
    
    vec2 ap=abs(p);
    float ax=1.-smoothstep(halfX-feather,halfX+1e-5,ap.x);
    float ay=1.-smoothstep(halfY-feather,halfY+1e-5,ap.y);
    float core=ax*ay;
    
    // X-direction gray -> narrow white -> gray gradient
    float centerDist=abs(p.x);// 0.0 at center, up to 1.0 at edges
    float whiteBand=.33;// narrow white band half-width
/*     if(vFlash>.5){
        centerColor=vec3(0.39f, 0.63f, 0.39f);
    } */
    float whiteFactor=1.-smoothstep(0.,whiteBand,centerDist);
    
    vec3 baseGray=vec3(.2784,.2784,.2784);
    vec3 col=mix(baseGray,centerColor,whiteFactor);
    
    outColor=vec4(col*core,core);
}
