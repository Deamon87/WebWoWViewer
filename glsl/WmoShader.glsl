//https://www.khronos.org/registry/webgl/extensions/WEBGL_draw_buffers/
//For drawbuffers in glsl of webgl you need to use GL_EXT_draw_buffers instead of WEBGL_draw_buffers

#ifdef ENABLE_DEFERRED
#ifdef GL_EXT_draw_buffers
    #extension GL_EXT_draw_buffers: require
    #extension OES_texture_float_linear : enable
    #define drawBuffersIsSupported 1
#endif
#endif

#ifdef COMPILING_VS
/* vertex shader code */
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

attribute vec4 aColor;

uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;

#ifdef INSTANCED
attribute mat4 uPlacementMat;
#else
uniform mat4 uPlacementMat;
#endif

varying vec2 vTexCoord;
varying vec4 vColor;

#ifdef drawBuffersIsSupported
varying vec3 vNormal;
varying vec3 vPosition;
#endif

void main() {
    vec4 worldPoint = vec4(normalize(aNormal),0);
    worldPoint = uPlacementMat * vec4(aPosition, 1);

    vTexCoord = aTexCoord;
    vColor = aColor;

#ifndef drawBuffersIsSupported
    gl_Position = uPMatrix * uLookAtMat * worldPoint;
#else
    gl_Position = worldPoint;

    vNormal = normalize((uPlacementMat * vec4(aNormal, 0)).xyz);
    vPosition = worldPoint.xyz;
#endif //drawBuffersIsSupported

}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision lowp float;
varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec4 vColor;
varying vec3 vPosition;

//uniform vec4  uGlobalLighting;
uniform float uAlphaTest;
uniform sampler2D uTexture;


void main() {
    vec4 tex = texture2D(uTexture, vTexCoord).rgba;

    vec4 finalColor = vec4(
        (tex.r * vColor.b) ,
        (tex.g * vColor.g) ,
        (tex.b * vColor.r) ,
        tex.a);

    if(finalColor.a < uAlphaTest)
        discard;

    //Apply global lighting
/*
    finalColor = vec4(
        (finalColor.r + uGlobalLighting.r) ,
        (finalColor.g + uGlobalLighting.g) ,
        (finalColor.b + uGlobalLighting.b) ,
        finalColor.a);
  */
    //finalColor.a = 1.0; //do I really need it now?

#ifndef drawBuffersIsSupported
    //Forward rendering without lights
    gl_FragColor = finalColor;
#else
    //Deferred rendering
    gl_FragData[0] = finalColor;
    gl_FragData[1] = vec4(vPosition.xyz,0);
    gl_FragData[2] = vec4(vNormal.xyz,0);
#endif //drawBuffersIsSupported
}

#endif //COMPILING_FS
