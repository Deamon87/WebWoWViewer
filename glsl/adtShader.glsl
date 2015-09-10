#ifdef COMPILING_VS
/* vertex shader code */
attribute float aHeight;
attribute int aIndex;

uniform vec3 aPos;
uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;

const float UNITSIZE = 533.333333333 / 16.0 / 8.0;

void main() {

/*   0    1    2    3    4    5    6    7    8
        9   10   11   12   13   14   15   16
*/
    int iX = mod(aIndex, 17);
    int iY = div(aIndex, 17);

    vec4 worldPoint = vec4(
        aPos.x + iX * UNITSIZE,
        aPos.y + iY * UNITSIZE,
        aPos.z + aHeight,
        1);

    if (iX > 8) {
        worldPoint.x = worldPoint.x - 8.5 * UNITSIZE;
    }

    gl_Position = uPMatrix * uLookAtMat * worldPoint;
}
#endif //COMPILING_VS

#ifdef COMPILING_FS
varying vec2 vTexCoord;

uniform sampler2D Layer0;
uniform sampler2D Layer1;
uniform sampler2D Layer2;
uniform sampler2D Layer3;
uniform sampler2D Alpha1;
uniform sampler2D Alpha2;
uniform sampler2D Alpha3;

precision lowp float;

void main() {
    vec4 tex4 = texture2D(Layer3, vTexCoord).rgb;
    float a4 = texture2D(Alpha3, vTexCoord).a;

    vec4 tex3 = texture2D(Layer2, vTexCoord).rgb;
    float a3 = texture2D(Alpha2, vTexCoord).a;

    vec4 tex2 = texture2D(Layer1, vTexCoord).rgb;
    float a2 = texture2D(Alpha1, vTexCoord).a;

    vec4 tex1 = texture2D(Layer0, vTexCoord).rgb;
    //vec4 a1 = texture2D(uTexture, vTexCoord).rgba;


    vec4 finalColor = vec4(a4) * tex4 - vec4(a4  - 1.0) * (vec4(a3 - 1.0)*( tex1 * vec4(a2 - 1) - a2*tex2) + a3*tex3);

    finalColor.a = 1.0;
    gl_FragColor = finalColor;
}

#endif //COMPILING_FS