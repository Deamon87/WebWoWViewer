#ifdef COMPILING_VS
/* vertex shader code */
attribute float aHeight;
attribute float aIndex;
attribute vec2 aTexCoord;

uniform vec3 aPos;
uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;

varying vec2 vChunkCoords;

const float UNITSIZE = 533.333333333 / 16.0 / 8.0;

void main() {

/*
     Y
  X  0    1    2    3    4    5    6    7    8
        9   10   11   12   13   14   15   16
*/
    float iX = mod(aIndex, 17.0);
    float iY = floor(aIndex/17.0);

    vec4 worldPoint = vec4(
        aPos.x - iY * UNITSIZE,
        aPos.y - iX * UNITSIZE,
        aPos.z + aHeight,
        1);

    vChunkCoords = vec2(iX, iY);

    //On Intel Graphics ">" is equal to ">="
    if (iX > 8.1) {
        worldPoint.y = aPos.y - (iX - 8.5) * UNITSIZE;
        worldPoint.y = aPos.x - (iY + 0.5) * UNITSIZE;
        vChunkCoords.x = (iX-8.5);
    }

    gl_Position = uPMatrix * uLookAtMat * worldPoint;
}
#endif //COMPILING_VS

#ifdef COMPILING_FS
precision lowp float;

varying vec2 vChunkCoords;

uniform int uNewFormula;

uniform sampler2D layer0;
uniform sampler2D layer1;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform sampler2D alphaTexture;


void main() {
    vec2 vTexCoord = vChunkCoords;

    vec2 a4Coords = vec2(3.0/4.0+ vChunkCoords.x/4.0/8.0, vChunkCoords.y/8.0 );
    vec2 a3Coords = vec2(2.0/4.0+ vChunkCoords.x/4.0/8.0, vChunkCoords.y/8.0 );
    vec2 a2Coords = vec2(1.0/4.0+ vChunkCoords.x/4.0/8.0, vChunkCoords.y/8.0 );

    vec3 tex4 = texture2D(layer3, vTexCoord).rgb;
    float a4 = texture2D(alphaTexture, a4Coords).a;

    vec3 tex3 = texture2D(layer2, vTexCoord).rgb;
    float a3 = texture2D(alphaTexture, a3Coords).a;

    vec3 tex2 = texture2D(layer1, vTexCoord).rgb;
    float a2 = texture2D(alphaTexture, a2Coords).a;
    //float a2 = 0.3;

    vec3 tex1 = texture2D(layer0, vTexCoord).rgb;
    //vec4 a1 = texture2D(uTexture, vTexCoord).rgba;

    //Mix formula for 4 texture mixing
    vec4 finalColor;
    if (uNewFormula >= 1) {
        finalColor = vec4(tex1 * (1.0 - (a2 + a3 + a4)) + tex2 * a2 + tex3 * a3 + tex4* a4, 1);
    } else {
        finalColor = vec4(a4 * tex4 - (a4  - 1.0) * ( (a3 - 1.0)*( tex1 * (a2 - 1.0) - a2*tex2) + a3*tex3), 1);
    }

    finalColor.a = 1.0;
    gl_FragColor = finalColor;
}

#endif //COMPILING_FS