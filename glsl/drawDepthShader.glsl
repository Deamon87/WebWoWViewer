//Taken from http://media.tojicode.com/webgl-samples/depth-texture.html

#ifdef COMPILING_VS
attribute vec2 position;
attribute vec2 texture;
varying vec2 texCoord;

uniform float uWidth;
uniform float uHeight;
uniform float uX;
uniform float uY;


void main(void) {
    texCoord = texture;

    //gl_Position = vec4(position, 0.0, 1.0);
          gl_Position = vec4(
                (((position.x + 1.0)/2.0) * uWidth + uX)*2.0 - 1.0,
                (((position.y + 1.0)/2.0) * uHeight + uY)*2.0 - 1.0,
                0.0,
                1.0)  ;
}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision mediump float;
uniform sampler2D diffuse;
varying vec2 texCoord;

void main(void) {

    float f = 1000.0; //far plane
    float n = 1.0; //near plane
    float z = (2.0 * n) / (f + n - texture2D( diffuse, texCoord ).x * (f - n));


    //vec4 color = texture2D(diffuse, texCoord);
    gl_FragColor = vec4(z,z,z, 255);
}

#endif //COMPILING_FS