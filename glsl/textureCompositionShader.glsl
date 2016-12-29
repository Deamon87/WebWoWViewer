#ifdef COMPILING_VS
uniform float x;
uniform float y;
uniform float width;
uniform float height;

attribute vec2 aTextCoord;
varying vec2 vTextCoords;
void main() {
    vTextCoords = aTextCoord;

    vec2 pos;
    pos.x = x + aTextCoord.x*width;
    pos.y = y + aTextCoord.y*height;

    gl_Position = vec4(vec2(2.0)*pos - vec2(1.0), 0, 1);
}
#endif //COMPILING_VS
#ifdef COMPILING_FS
precision highp float;

varying vec2 vTextCoords;
uniform sampler2D uTexture;

void main() {
    vec4 alpha = texture2D( uTexture, vTextCoords );
    gl_FragColor = alpha;
}
#endif //COMPILING_FS