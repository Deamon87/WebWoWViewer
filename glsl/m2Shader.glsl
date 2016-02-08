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

#ifdef drawBuffersIsSupported
varying vec3 vPosition;
varying float fs_Depth;
#endif


// constructors are column major
mat2 transpose(mat2 m) {
  return mat2(  m[0][0], m[1][0],   // new col 0
                m[0][1], m[1][1]    // new col 1
             );
  }

mat3 transpose(mat3 m) {
  return mat3(  m[0][0], m[1][0], m[2][0],  // new col 0
                m[0][1], m[1][1], m[2][1],  // new col 1
                m[0][2], m[1][2], m[2][2]   // new col 1
             );
  }

mat4 transpose(mat4 m) {
  return mat4(  m[0][0], m[1][0], m[2][0], m[3][0],   // new col 0
                m[0][1], m[1][1], m[2][1], m[3][1],    // new col 1
                m[0][2], m[1][2], m[2][2], m[3][2],    // new col 1
                m[0][3], m[1][3], m[2][3], m[3][3]
             );
  }

float determinant(mat2 m) {
  return m[0][0]*m[1][1] - m[1][0]*m[0][1] ;
  }

float determinant(mat3 m) {
  return   m[0][0]*( m[1][1]*m[2][2] - m[2][1]*m[1][2])
         - m[1][0]*( m[0][1]*m[2][2] - m[2][1]*m[0][2])
         + m[2][0]*( m[0][1]*m[1][2] - m[1][1]*m[0][2]) ;
  }

// 4x4 determinate inplemented by blocks ..
//     | A B |
// det | C D | = det (A) * det(D - CA'B)
//

float determinant(mat4 m) {
  mat2 a = mat2(m);
  mat2 b = mat2(m[2].xy,m[3].xy);
  mat2 c = mat2(m[0].zw,m[1].zw);
  mat2 d = mat2(m[2].zw,m[3].zw);
  float s = determinant(a);
  return s*determinant(d-(1.0/s)*c*mat2(a[1][1],-a[0][1],-a[1][0],a[0][0])*b);
  }

mat2 inverse(mat2 m) {
  float d = 1.0 / determinant(m) ;
  return d * mat2( m[1][1], -m[0][1], -m[1][0], m[0][0]) ;
  }

mat3 inverse(mat3 m) {
  float d = 1.0 / determinant(m) ;
  return d * mat3( m[2][2]*m[1][1] - m[1][2]*m[2][1],
                    m[1][2]*m[2][0] - m[2][2]*m[1][0],
                     m[2][1]*m[1][0] - m[1][1]*m[2][0] ,

                   m[0][2]*m[2][1] - m[2][2]*m[0][1],
                    m[2][2]*m[0][0] - m[0][2]*m[2][0],
                     m[0][1]*m[2][0] - m[2][1]*m[0][0],

                   m[1][2]*m[0][1] - m[0][2]*m[1][1],
                    m[0][2]*m[1][0] - m[1][2]*m[0][0],
                     m[1][1]*m[0][0] - m[0][1]*m[1][0]
                 );
  }

// This implements block wise inverse
// | e f |   | A B |'    | A'+A'B(D-CA'B)'CA'    -A'B(D-CA'B)'  |
// | g h | = | C D |   = |  -(D-CA'B)'CA'         (D-CA'B)'     |
//
// with
// a inverted immediately
// and sub expressions t = CA'
// noting that h and f are subexpression also
//
mat4 inverse(mat4 m) {
  mat2 a = inverse(mat2(m));
  mat2 b = mat2(m[2].xy,m[3].xy);
  mat2 c = mat2(m[0].zw,m[1].zw);
  mat2 d = mat2(m[2].zw,m[3].zw);

  mat2 t = c*a;
  mat2 h = inverse(d - t*b);
  mat2 g = - h*t;
  mat2 f = - a*b*h;
  mat2 e = a - f*t;

  return mat4( vec4(e[0],g[0]), vec4(e[1],g[1]),
                  vec4(f[0],h[0]), vec4(f[1],f[1]) );
  }

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

    mat4 cameraMatrixInv = inverse(cameraMatrix);

    mat3 invWorldMat = mat3(
        uPlacementMat[0].xyz,
        uPlacementMat[1].xyz,
        uPlacementMat[2].xyz);
    vec3 worldNormal = normalize((aNormal * invWorldMat));

    mat3 invCameraMat = mat3(
      uLookAtMat[0].xyz,
      uLookAtMat[1].xyz,
      uLookAtMat[2].xyz);

    vec3 normal = normalize((worldNormal * invCameraMat));

    if (isEnviroment == 1) {
        vec3 normPos = -(normalize(cameraPoint.xyz));
        vec3 temp = (normPos - (normal * (2.0 * dot(normPos, normal))));
        temp.z = (temp.z + 1.0);

        vTexCoord = ((normalize(temp).xy * 0.5) + vec2(0.5));
    }else {
        vTexCoord = aTexCoord;
    }
    vTexCoord2 = aTexCoord2;
    vColor = aColor;

#ifndef drawBuffersIsSupported
    gl_Position = uPMatrix * cameraPoint;
    vNormal = normal;
#else
    gl_Position = uPMatrix * cameraPoint;
    fs_Depth = gl_Position.z / gl_Position.w;

    vNormal = normalize((uPlacementMat * vec4(aNormal, 0)).xyz);
    vPosition = cameraPoint.xyz;
#endif //drawBuffersIsSupported

}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision lowp float;
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
    vec2 texCoord =  (uTextMat1 * vec4(vTexCoord, 0, 1)).xy;
    vec2 texCoord2 = (uTextMat2 * vec4(vTexCoord2, 0, 1)).xy;

    /* Get color from texture */
    vec4 tex = texture2D(uTexture, texCoord).rgba;
    vec4 tex2 = texture2D(uTexture2, texCoord2).rgba;

    vec4 finalColor = vec4(
        (tex.r * vColor.b) ,
        (tex.g * vColor.g) ,
        (tex.b * vColor.r) ,
        tex.a * vColor.a);

    finalColor = finalColor * tex2;

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
    //gl_FragColor = finalColor;
    gl_FragData[0] = vec4(vec3(fs_Depth), 1.0);
    gl_FragData[1] = vec4(vPosition.xyz,0);
    gl_FragData[2] = vec4(vNormal.xyz,0);
    gl_FragData[3] = finalColor;
#endif //drawBuffersIsSupported
}

#endif //COMPILING_FS

