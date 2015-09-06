#ifdef COMPILING_VS
/* vertex shader code */
attribute float aHeight;
attribute float aIndex;

uniform vec3 aPos;
uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;

const float UNITSIZE = 533.333333333 / 16.0 / 8.0;

void main() {

    /*
    Point.x = aPos.x - iX * 0.5 * UNITSIZE;
    Point.y = aPos.y - iY * UNITSIZE;
    Point.z = aPos.z + aHeight;
    */

    vec4 worldPoint = vec4(
        aPosition.x*uBBScale.x + uBBCenter.x,
        aPosition.y*uBBScale.y + uBBCenter.y,
        aPosition.z*uBBScale.z + uBBCenter.z,
        1);

    gl_Position = uPMatrix * uLookAtMat * worldPoint;
}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision lowp float;
void main() {
    vec4 finalColor = vec4(0.027, 0.643, 0.075, 1.0);

    finalColor.a = 1.0;
    gl_FragColor = finalColor;
}

#endif //COMPILING_FS