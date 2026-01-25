#version 300 es
precision highp float;

uniform sampler2D u_neutrons;
uniform float u_controlRods;
uniform int u_uraniumCountX;
uniform float collision_prob;
uniform float controlRodHitProbability;
uniform float controlRodAbsorptionProbability;

const float SCREEN_W=800.;
const float SCREEN_H=600.;
const float ATOM_SPACING_X=800./41.;
const float ATOM_SPACING_Y=600./30.;
const float ATOM_RADIUS=5.;

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
  
  if(pos.x<0.||pos.x>SCREEN_W||pos.y<0.||pos.y>SCREEN_H){
    outColor=vec4(-200.,-200.,0.,0.);
    return;
  }
  
  int col=int(pos.x/ATOM_SPACING_X);
  int row=int(pos.y/ATOM_SPACING_Y);
  
  if((col+1)%7==0){
    if(pos.y<u_controlRods){
      // Hit a control rod. Choose deterministically (per-fragment) whether
      // the neutron is absorbed (dies) or slowed to half speed.
      // Create a simple hash/random value based on position+coord.
      float r=fract(sin(dot(pos+vec2(float(gl_FragCoord.x),float(gl_FragCoord.y)),vec2(12.9898,78.233)))*43758.5453);
      float r2=fract(sin(dot(pos+vec2(float(gl_FragCoord.x),float(gl_FragCoord.y)),vec2(12.98938,78.233)))*43758.5453);
      if(r<controlRodHitProbability){
        if(r2<controlRodAbsorptionProbability){
          // absorbed: zero velocity so next frame it'll be marked dead
          outColor=vec4(-200.,-200.,0.,0.);
          return;
        }else if(length(vel)>2.5){
          // slow down: reduce velocity to exactly half (preserve direction)
          vec2 newVel=vel*.5;
          outColor=vec4(pos+newVel,newVel.x,newVel.y);
          return;
        }
      }
    }
  }else{
    // Use the full column index so atom IDs refer to the same full-grid
    // indexing the CPU uses (atom.index = x + y * uraniumAtomsCountX).
    int atomIndex=row*u_uraniumCountX+col;
    
    vec2 atomPos=vec2(
      float(col)*ATOM_SPACING_X+ATOM_SPACING_X*.5,
      float(row)*ATOM_SPACING_Y+ATOM_SPACING_Y*.5
    );
    
    float distSq=dot(pos-atomPos,pos-atomPos);
    float speed=length(vel);
    float adaptedRadius=ATOM_RADIUS*(collision_prob*(20./speed));
    
    if(distSq<adaptedRadius*adaptedRadius){
      hitID=float(atomIndex)+1.;
      vel=vec2(0.);
      pos=vec2(-100.,-100.);// Siirretään se pois pelikentältä
    }
  }
  
  if(hitID>0.){
    outColor=vec4(-200.,-200.,0.,hitID);// Alpha kantaa ID:n vielä kerran CPU:lle
  }else{
    outColor=vec4(pos,vel.x,vel.y);
  }
}