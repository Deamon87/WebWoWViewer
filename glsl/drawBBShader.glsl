#ifdef COMPILING_VS
/* vertex shader code */
attribute vec3 aPosition;

uniform vec4 uBBScale;
uniform vec4 uBBCenter;

uniform mat4 uLookAtMat;
uniform mat4 uPMatrix;

void main() {
    vec4 worldPoint = ((vec4(aPosition, 1) * uBBScale) + uBBCenter);

    gl_Position = uPMatrix * uLookAtMat * worldPoint;
}
#endif //COMPILING_VS

#ifdef COMPILING_FS

precision lowp float;
void main() {
    vec4 finalColor = vec4(0.027, 0.643, 0.075, 1.0);

    finalColor.a = 1.0; //do I really need it now?
    gl_FragColor = finalColor;
}

#endif //COMPILING_FS
