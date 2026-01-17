precision highp float;

attribute vec3 aPosition;

// The transform of the object being drawn
uniform mat4 uModelViewMatrix;

// Transforms 3D coordinates to 2D screen coordinates
uniform mat4 uProjectionMatrix;

void main(){
    // Apply the camera transform
    vec4 viewModelPosition=uModelViewMatrix*vec4(aPosition,1.);
    //viewModelPosition.x-=400.;
    //viewModelPosition.y-=300.;
    // Tell WebGL where the vertex goes
    gl_Position=uProjectionMatrix*viewModelPosition;
}