#ifdef COMPILING_VS
/* vertex shader code */
attribute float aHeight;
attribute float aIndex;
attribute vec2 aTexCoord;

uniform vec3 aPos;
uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;

varying vec2 vTexCoord;

const float UNITSIZE = 533.333333333 / 16.0 / 8.0;

void main() {

/*
     Y
  X  0    1    2    3    4    5    6    7    8
        9   10   11   12   13   14   15   16
*/
    float iX = floor(aIndex/17.0);
    float iY = mod(aIndex, 17.0);

    vec4 worldPoint = vec4(
        aPos.x - iX * UNITSIZE,
        aPos.y - iY * UNITSIZE,
        aPos.z + aHeight,
        1);

    vTexCoord = vec2(iX / 8.0, iY / 8.0);

    //On Intel Graphics ">" is equal to ">="
    if (iY > 8.1) {
        worldPoint.y = aPos.y - (iY - 8.5) * UNITSIZE;
        vTexCoord.x = (iY-8.5) / 8.0;
    }

    gl_Position = uPMatrix * uLookAtMat * worldPoint;
}
#endif //COMPILING_VS

#ifdef COMPILING_FS
precision lowp float;

varying vec2 vTexCoord;
uniform sampler2D layer0;
uniform sampler2D layer1;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform sampler2D alphaTexture;

void main() {
    vec2 a4Coords = vec2(0, 3.0/4.0) + vTexCoord;
    vec2 a3Coords = vec2(0, 2.0/4.0) + vTexCoord;
    vec2 a2Coords = vec2(0, 1.0/4.0) + vTexCoord;

    vec3 tex4 = texture2D(layer3, vTexCoord).rgb;
    float a4 = texture2D(alphaTexture, a4Coords).a;

    vec3 tex3 = texture2D(layer2, vTexCoord).rgb;
    float a3 = texture2D(alphaTexture, a3Coords).a;

    vec3 tex2 = texture2D(layer1, vTexCoord).rgb;
    float a2 = texture2D(alphaTexture, a2Coords).a;

    vec3 tex1 = texture2D(layer0, vTexCoord).rgb;
    //vec4 a1 = texture2D(uTexture, vTexCoord).rgba;

    //Mix formula for 4 texture mixing
    //vec4 finalColor = vec4(a4 * tex4 - (a4  - 1.0) * ( (a3 - 1.0)*( tex1 * (a2 - 1.0) - a2*tex2) + a3*tex3), 1);
    vec4 finalColor = vec4(tex2, 1);

    finalColor.a = 1.0;
    gl_FragColor = finalColor;
}

#endif //COMPILING_FS