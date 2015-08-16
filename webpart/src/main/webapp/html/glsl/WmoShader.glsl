#ifdef COMPILING_VS

/* vertex shader code */
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
attribute vec4 aColor;

uniform float uAlphaTest;
uniform mat4 uModelView;
uniform mat4 uPMatrix;
uniform mat4 uPlacementMat;


varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec4 vColor;
varying float vAlphaTest;

void main() {
    vTexCoord = aTexCoord;
    vColor = aColor;
    gl_Position = uPMatrix * uModelView * uPlacementMat * vec4(aPosition, 1);
    vNormal = aNormal;
    vAlphaTest = uAlphaTest;
}
#else

#ifdef COMPILING_FS

/* fragment shader code */
precision lowp float;
varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec4 vColor;
varying float vAlphaTest;
uniform sampler2D uTexture;
void main() {
    vec4 tex = texture2D(uTexture, vTexCoord).rgba;
    //gl_FragColor =  vec4(tex.r, tex.g, tex.b, tex.a);

    vec4 trueColor = vColor;
    gl_FragColor =  vec4(
        (tex.r * trueColor.b) ,
        (tex.g * trueColor.g) ,
        (tex.b * trueColor.r) ,
        tex.a);

    if(gl_FragColor.a < vAlphaTest)
        discard;

    gl_FragColor.a = 1.0;
}
#endif

#endif
