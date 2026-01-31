#version 300 es
precision highp float;
out vec4 outColor;

void main(){
    // Write 1 (integer) into the red channel.
    // In an UNSIGNED_BYTE texture, 1.0/255.0 becomes value 1.
    outColor=vec4(1./255.,0.,0.,1.);
}