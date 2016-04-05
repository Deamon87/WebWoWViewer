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
attribute vec4 bones;
attribute vec4 boneWeights;
attribute vec2 aTexCoord;
attribute vec2 aTexCoord2;

attribute vec4 aColor;

uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;
uniform int isBillboard;
uniform mat4 uBoneMatrixes[59]; //Max 59 for ANGLE implementation and max 120? bones in Wotlk client
uniform int isEnviroment;

#ifdef INSTANCED
attribute mat4 uPlacementMat;
#else
uniform mat4 uPlacementMat;
#endif

varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec4 vColor;
varying vec3 vNormal;
varying vec3 vPosition;

#ifdef drawBuffersIsSupported
varying float fs_Depth;
#endif

void main() {
    vec4 modelPoint = vec4(0,0,0,0);

    vec4 aPositionVec4 = vec4(aPosition, 1);
    mat4 boneTransformMat = mat4(0.0);

    boneTransformMat += (boneWeights.x ) * uBoneMatrixes[int(bones.x)];
    boneTransformMat += (boneWeights.y ) * uBoneMatrixes[int(bones.y)];
    boneTransformMat += (boneWeights.z ) * uBoneMatrixes[int(bones.z)];
    boneTransformMat += (boneWeights.w ) * uBoneMatrixes[int(bones.w)];

    mat4 cameraMatrix = uLookAtMat * uPlacementMat * boneTransformMat;
    vec4 cameraPoint = cameraMatrix * aPositionVec4;

    vec3 normal = mat3(cameraMatrix) * aNormal;

    vec2 texCoord;
    if (isEnviroment == 1) {

        vec3 normPos = -(normalize(cameraPoint.xyz));
        vec3 temp = (normPos - (normal * (2.0 * dot(normPos, normal))));
        temp = vec3(temp.x, temp.y, temp.z + 1.0);

        texCoord = ((normalize(temp).xy * 0.5) + vec2(0.5));

    } else {
        /* Animation support */
        texCoord = vec4(aTexCoord, 0, 1).xy;
    }

    vTexCoord = texCoord;
    vTexCoord2 = aTexCoord2;
    vColor = aColor;

#ifndef drawBuffersIsSupported
    gl_Position = uPMatrix * cameraPoint;
    vNormal = normal;
    vPosition = cameraPoint.xyz;
#else
    gl_Position = uPMatrix * cameraPoint;
    fs_Depth = gl_Position.z / gl_Position.w;

    vNormal = normal;
    vPosition = cameraPoint.xyz;
#endif //drawBuffersIsSupported

}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision highp float;
varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec4 vColor;
varying vec3 vPosition;

//uniform vec4  uGlobalLighting;
uniform float uAlphaTest;
uniform sampler2D uTexture;
uniform sampler2D uTexture2;

uniform mat4 uTextMat1;
uniform mat4 uTextMat2;

#ifdef drawBuffersIsSupported
varying float fs_Depth;
#endif

void main() {


    /* Animation support */
    vec2 texCoord = (uTextMat1 * vec4(vTexCoord, 0, 1)).xy;
    vec2 texCoord2 = (uTextMat2 * vec4(vTexCoord2, 0, 1)).xy;

    /* Get color from texture */
    vec4 tex = texture2D(uTexture, texCoord).rgba;
    vec4 tex2 = texture2D(uTexture2, texCoord2).rgba;

    vec4 finalColor = vec4((tex.rgb * tex2.rgb) * vColor.bgr, 1.0);
     finalColor.a = tex.a;

    if(tex.a < uAlphaTest)
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
    //gl_FragColor = finalColor;
    gl_FragData[0] = vec4(vec3(fs_Depth), 1.0);
    gl_FragData[1] = vec4(vPosition.xyz,0);
    gl_FragData[2] = vec4(vNormal.xyz,0);
    gl_FragData[3] = finalColor;
#endif //drawBuffersIsSupported
}

#endif //COMPILING_FS

