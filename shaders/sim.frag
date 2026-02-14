#version 300 es
precision highp float;

uniform sampler2D u_neutrons;
uniform float u_controlRods[6]; // per-rod Y thresholds (in simulation coords)
uniform int u_controlRodCount;
uniform int u_uraniumCountX;
uniform int u_uraniumCountY;
uniform sampler2D u_atomMask;
uniform float collision_prob;
uniform float controlRodHitProbability;
uniform float controlRodAbsorptionProbability;

uniform float u_simWidth;
uniform float u_simHeight;
uniform float u_controlRodHeight;
uniform float u_atomSpacingX;
uniform float u_atomSpacingY;
uniform float u_atomRadius;
uniform float u_globalScale;
uniform float u_hitboxYScale;


out vec4 outColor;

void main(){
  ivec2 coord=ivec2(gl_FragCoord.xy);
  vec4 data=texelFetch(u_neutrons,coord,0);

  vec2 pos=data.xy;
  vec2 vel=data.zw;
  float hitID=0.;

  if(length(vel)<.0001||any(isnan(pos))||any(isnan(vel))||length(vel)>50.){
    outColor=vec4(-200.,-200.,0.,0.);
    return;
  }

  pos+=vel;

  if(pos.x<0.||pos.x>u_simWidth||pos.y<0.||pos.y>u_simHeight){
    outColor=vec4(-200.,-200.,0.,0.);
    return;
  }

  int col=int(pos.x/u_atomSpacingX);
  int row=int(pos.y/u_atomSpacingY);

  if((col+1)%7==0){
    // Map column to rod index: col=6 -> index 0, col=13 -> index 1, etc.
    int rodIndex = (col + 1) / 7 - 1;
    float rodY = 0.0;
    if (rodIndex >= 0 && rodIndex < u_controlRodCount) {
      rodY = u_controlRods[rodIndex];
    }
    if(pos.y > rodY && pos.y < rodY + u_controlRodHeight){
      // Hit a control rod. Deterministic pseudo-random for decisions
      float r=fract(sin(dot(pos+vec2(float(gl_FragCoord.x),float(gl_FragCoord.y)),vec2(12.9898,78.233)))*43758.5453);
      float r2=fract(sin(dot(pos+vec2(float(gl_FragCoord.x),float(gl_FragCoord.y)),vec2(12.98938,78.233)))*43758.5453);
      if(r<controlRodHitProbability){
        if(r2<controlRodAbsorptionProbability){
          outColor=vec4(-200.,-200.,0.,0.);
          return;
        }else if(length(vel)>2.5 * u_globalScale){
          vec2 newVel=vel*.5;
          outColor=vec4(pos+newVel,newVel.x,newVel.y);
          return;
        }
      }
    }
  }else{
    int atomIndex=row*u_uraniumCountX+col;

    if (col < 0 || col >= u_uraniumCountX || row < 0 || row >= u_uraniumCountY) {
      outColor=vec4(pos,vel.x,vel.y);
      return;
    }

    float hasAtom = texelFetch(u_atomMask, ivec2(col, row), 0).r;
    if (hasAtom < 0.5) {
      outColor=vec4(pos,vel.x,vel.y);
      return;
    }

    vec2 atomPos=vec2(
      float(col)*u_atomSpacingX+u_atomSpacingX*.5,
      float(row)*u_atomSpacingY+u_atomSpacingY*.5
    );

    float distSq=dot(pos-atomPos,pos-atomPos);
    float speed=length(vel);
    // Add deterministic per-neutron jitter to collision probability so hits vary.
    float rnd = fract(sin(dot(pos + vec2(float(gl_FragCoord.x), float(gl_FragCoord.y)), vec2(12.9898,78.233))) * 43758.5453);
    // jitter factor in range [0.75, 1.25]
    float jitter = mix(0.75, 1.25, rnd);
    float localCollisionProb = collision_prob * jitter;
    float adaptedRadius = u_atomRadius * (localCollisionProb * ((20.0 * u_globalScale) / speed));

    // Make hitbox taller in Y: use an elliptical test (rx=adaptedRadius, ry=adaptedRadius*yScale)
    float yScale = u_hitboxYScale;
    vec2 d = pos - atomPos;
    float test = d.x * d.x + (d.y * d.y) / (yScale * yScale);
    if (test < adaptedRadius * adaptedRadius) {
      hitID=float(atomIndex)+1.;
      vel=vec2(0.);
      pos=vec2(-100.,-100.);
    }
  }

  if(hitID>0.){
    outColor=vec4(-200.,-200.,0.,hitID);
  }else{
    outColor=vec4(pos,vel.x,vel.y);
  }
}