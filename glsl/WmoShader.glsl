//https://www.khronos.org/registry/webgl/extensions/WEBGL_draw_buffers/
//For drawbuffers in glsl of webgl you need to use GL_EXT_draw_buffers instead of WEBGL_draw_buffers

#ifdef ENABLE_DEFERRED
#ifdef GL_EXT_draw_buffers
    #extension GL_EXT_draw_buffers: require
    #extension OES_texture_float_linear : enable
    #define drawBuffersIsSupported 1
#endif
#endif
#extension GL_OES_standard_derivatives : enable

#ifdef COMPILING_VS
/* vertex shader code */
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
attribute vec2 aTexCoord2;
attribute vec4 aColor;
attribute vec4 aColor2;

uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;
uniform mat4 uInvPlacementMat;
uniform mat4 uInvLookAtMat;


#ifdef INSTANCED
attribute mat4 uPlacementMat;
#else
uniform mat4 uPlacementMat;
#endif

varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec4 vColor;
varying vec4 vColor2;

varying vec3 vNormal;
#ifdef drawBuffersIsSupported
varying vec3 vPosition;
#endif

highp mat4 transpose(highp mat4 inMatrix) {
highp vec4 i0 = inMatrix[0];
highp vec4 i1 = inMatrix[1];
highp vec4 i2 = inMatrix[2];
highp vec4 i3 = inMatrix[3];

highp mat4 outMatrix = mat4(
                 vec4(i0.x, i1.x, i2.x, i3.x),
                 vec4(i0.y, i1.y, i2.y, i3.y),
                 vec4(i0.z, i1.z, i2.z, i3.z),
                 vec4(i0.w, i1.w, i2.w, i3.w)
                 );
return outMatrix;
}

void main() {
    mat4 modelViewMat = uLookAtMat * uPlacementMat;
    mat4 normalMatrix = transpose(uInvPlacementMat*uInvLookAtMat);

    vec4 worldPoint = vec4(aPosition, 1);

    vTexCoord = aTexCoord;
    vTexCoord2 = aTexCoord2;
    vColor = aColor;
    vColor2 = aColor2;

    vNormal = normalize((normalMatrix * vec4(aNormal, 0)).xyz);
#ifndef drawBuffersIsSupported
    gl_Position = uPMatrix * modelViewMat * worldPoint;
#else
    gl_Position = worldPoint;


    vPosition = worldPoint.xyz;
#endif //drawBuffersIsSupported

}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision lowp float;
varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec4 vColor;
varying vec4 vColor2;
varying vec3 vPosition;

//uniform vec4  uGlobalLighting;
uniform float uAlphaTest;
uniform sampler2D uTexture;
uniform sampler2D uTexture2;

uniform vec3 LightPosition;
uniform vec3 AmbientMaterial;
uniform vec3 SpecularMaterial;
uniform float Shininess;

float stepmix(float edge0, float edge1, float E, float x){
    float T = clamp(0.5 * (x - edge0 + E) / E, 0.0, 1.0);
    return mix(edge0, edge1, T);
}

void main() {
    vec4 tex = texture2D(uTexture, vTexCoord).rgba;
    vec4 tex2 = texture2D(uTexture2, vTexCoord2).rgba;

    vec4 finalColor = vec4(
        (tex.r * vColor.b) ,
        (tex.g * vColor.g),
        (tex.b * vColor.r),
        tex.a );

    if(finalColor.a < uAlphaTest)
        discard;

    vec3 N = normalize(vNormal);
    vec3 L = normalize(LightPosition);
    vec3 Eye = vec3(0, 0, 1);
    vec3 H = normalize(L + Eye);

    float df = max(0.0, dot(N, L));
    float sf = max(0.0, dot(N, H));
    sf = pow(sf, Shininess);

    const float A = 0.1;
    const float B = 0.3;
    const float C = 0.6;
    const float D = 1.0;
    float E = fwidth(df);

    if      (df > A - E && df < A + E) df = stepmix(A, B, E, df);
    else if (df > B - E && df < B + E) df = stepmix(B, C, E, df);
    else if (df > C - E && df < C + E) df = stepmix(C, D, E, df);
    else if (df < A) df = 0.0;
    else if (df < B) df = B;
    else if (df < C) df = C;
    else df = D;

    E = fwidth(sf);
    if (sf > 0.5 - E && sf < 0.5 + E)
    {
        sf = smoothstep(0.5 - E, 0.5 + E, sf);
    }
    else
    {
        sf = step(0.5, sf);
    }

    vec3 color = AmbientMaterial + df * finalColor.rgb + sf * SpecularMaterial;
    gl_FragColor = vec4(color, 1.0);

    //Apply global lighting
/*
    finalColor = vec4(
        (finalColor.r + uGlobalLighting.r) ,
        (finalColor.g + uGlobalLighting.g) ,
        (finalColor.b + uGlobalLighting.b) ,
        finalColor.a);
  */
    finalColor.a = 1.0; //do I really need it now?

#ifndef drawBuffersIsSupported
    //Forward rendering without lights
    //gl_FragColor = finalColor;
#else
    //Deferred rendering
    gl_FragData[0] = finalColor;
    gl_FragData[1] = vec4(vPosition.xyz,0);
    gl_FragData[2] = vec4(vNormal.xyz,0);
#endif //drawBuffersIsSupported
}

#endif //COMPILING_FS
