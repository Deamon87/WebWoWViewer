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

uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;
uniform mat4 uBoneMatrixes[59]; //Max 59 for ANGLE implementation and max 120? bones in Wotlk client
uniform int isEnviroment;
uniform lowp int isTransparent;

#ifdef INSTANCED
attribute vec4 aDiffuseColor;
attribute mat4 aPlacementMat;

#else
uniform mat4 uPlacementMat;
uniform vec4 uDiffuseColor;
#endif

varying vec2 vTexCoord;
varying vec2 vTexCoord2;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 vDiffuseColor;




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

    mat4 placementMat;
#ifdef INSTANCED
    placementMat = aPlacementMat;
#else
    placementMat = uPlacementMat;
#endif

    mat4 cameraMatrix = uLookAtMat * placementMat * boneTransformMat;
    vec4 cameraPoint = cameraMatrix * aPositionVec4;

    vec3 normal = mat3(cameraMatrix) * aNormal;

    vec2 texCoord;
    if (isEnviroment == 1) {

        vec3 normPos = -(normalize(cameraPoint.xyz));
        vec3 temp = reflect(normPos, normal);
        temp.z += 1.0;

        texCoord = ((normalize(temp).xy * 0.5) + vec2(0.5));

    } else {
        /* Animation support */
        texCoord = vec4(aTexCoord, 0, 1).xy;
    }

    vTexCoord = texCoord;
    vTexCoord2 = aTexCoord2;

    if (isTransparent == 0) {

#ifdef INSTANCED
    vDiffuseColor = aDiffuseColor;
#else
    vDiffuseColor = uDiffuseColor;
#endif
    } else {
        vDiffuseColor = vec4(1.0, 1.0, 1.0, 1.0);
    }


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
varying vec3 vPosition;

varying vec4 vDiffuseColor;

uniform lowp int isTransparent;

uniform int uBlendMode;

uniform vec4 uColor;
uniform vec3 uFogColor;

//uniform vec4  uGlobalLighting;
uniform float uAlphaTest;
uniform float uTransparency;
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

    vec4 meshColor = uColor;
    if (uBlendMode == 6) {
       meshColor.rbg *= vec3(0.65);
    }

    vec4 finalColor = vec4((tex.rgb * tex2.rgb), 1.0);
    finalColor.rgb = finalColor.rgb * meshColor.rgb * vDiffuseColor.bgr;


    finalColor.a = tex.a * tex2.a * uColor.a* uTransparency;

    if(finalColor.a < uAlphaTest)
        discard;

    if (isTransparent == 0) {
        vec3 fogColor = uFogColor;
        float fog_start = 1.0;
        float fog_end = 200.0;
        float fog_rate = 1.5;
        float fog_bias = 0.01;
    
        //vec4 fogHeightPlane = pc_fog.heightPlane;
        //float heightRate = pc_fog.color_and_heightRate.w;

        float distanceToCamera = length(vPosition.xyz);
        float z_depth = (distanceToCamera - fog_bias);
        float expFog = 1.0 / (exp((max(0.0, (z_depth - fog_start)) * fog_rate)));
        //float height = (dot(fogHeightPlane.xyz, vPosition.xyz) + fogHeightPlane.w);
        //float heightFog = clamp((height * heightRate), 0, 1);
        float heightFog = 1.0;
        expFog = (expFog + heightFog);
        float endFadeFog = clamp(((fog_end - distanceToCamera) / (0.699999988 * fog_end)), 0.0, 1.0);

        finalColor.rgb = mix(fogColor.rgb, finalColor.rgb, vec3(min(expFog, endFadeFog)));
    }
    /*
    vec3 matDiffuse_575 = (tex.rgb * tex2.rgb * meshColor.rgb);
    vec3 S_570 = vec3(mix(vec3(0.699999988), vec3(1.0), 1.0));
    vec3 lDiffuse_578 = vec3((1.0 * S_570));
    float mag_257 = length(lDiffuse_578);
    vec3 l_702;
    if ((mag_257 > 1.0))
    {
        // Block 258
        vec3 t265 = vec3(mag_257);
        vec3 l_266 = ((lDiffuse_578 * (1.0 + log(mag_257))) / t265);
        l_702 = l_266;
    }
    else
    {
        // Block 259
        l_702 = lDiffuse_578;
    }
    // Block 625
    vec3 l_267 = l_702;
    vec3 diffTerm_580 = (matDiffuse_575 * l_267);
    vec3 specTerm_583 = (vec3(0.0) * (S_570 * 1.0));
    vec4 final_599 = vec4(((diffTerm_580 + specTerm_583) + vec3(0.0)), (((tex.a * tex.b * meshColor.a) * 1.0) * 1.0));
    vec4 final_705;
    if ((vDiffuseColor.w != 0.0))
    {
        // Block 600
        vec3 t606 = final_599.xyz;
        vec3 t612 = vec3(dot(t606, vDiffuseColor.bgr));
        vec3 t613 = vec3(vDiffuseColor.w);
        vec4 final_615 = vec4(mix(t606, t612, t613), final_599.w);
        final_705 = final_615;
    }
    else
    {
        // Block 601
        final_705 = final_599;
    }


    vec4 finalColor = final_705;
    */

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

