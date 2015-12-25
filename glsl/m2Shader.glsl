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
attribute vec4 bones;
attribute vec4 boneWeights;
attribute vec2 aTexCoord;
attribute vec2 aTexCoord2;

attribute vec4 aColor;

uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;
uniform int isBillboard;
uniform mat4 uBoneMatrixes[10]; //TODO: investigate maximal number for this

#ifdef INSTANCED
attribute mat4 uPlacementMat;
#else
uniform mat4 uPlacementMat;
#endif

varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec4 vColor;
varying vec3 EyespaceNormal;

#ifdef drawBuffersIsSupported
varying vec3 vPosition;
#endif


mat3 inverse(mat3 m) {
    float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];
    float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];
    float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];

    float b01 =  a22 * a11 - a12 * a21;
    float b11 = -a22 * a10 + a12 * a20;
    float b21 =  a21 * a10 - a11 * a20;

    float det = a00 * b01 + a01 * b11 + a02 * b21;

    return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),
                b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),
                b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;
}

void main() {
    vec4 worldPoint = vec4(0,0,0,0);
    vec4 aPositionVec4 = vec4(aPosition, 1);

    worldPoint += (boneWeights.x ) * (uBoneMatrixes[int(bones.x)] * aPositionVec4);
    worldPoint += (boneWeights.y ) * (uBoneMatrixes[int(bones.y)] * aPositionVec4);
    worldPoint += (boneWeights.z ) * (uBoneMatrixes[int(bones.z)] * aPositionVec4);
    worldPoint += (boneWeights.w ) * (uBoneMatrixes[int(bones.w)] * aPositionVec4);

    worldPoint = uLookAtMat * uPlacementMat * vec4(worldPoint.xyz, 1);

    vTexCoord = aTexCoord;
    vTexCoord2 = aTexCoord2;
    vColor = aColor;

    EyespaceNormal = normalize((uLookAtMat*uPlacementMat * vec4(aNormal, 0)).xyz);
#ifndef drawBuffersIsSupported
    gl_Position = uPMatrix * worldPoint;
#else
    gl_Position = worldPoint;
    vPosition = worldPoint.xyz;
#endif //drawBuffersIsSupported

}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision lowp float;
varying vec3 EyespaceNormal;
varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec4 vColor;
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
        (tex.g * vColor.g) ,
        (tex.b * vColor.r) ,
        tex.a * vColor.a);

    finalColor = finalColor * tex2;

    vec3 N = normalize(EyespaceNormal);
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
    gl_FragColor = vec4(color, finalColor.a);

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

}

#endif //COMPILING_FS