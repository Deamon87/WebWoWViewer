#ifdef COMPILING_VS
attribute vec4 a_position;
varying vec2 v_texcoord;

void main() {
    gl_Position = a_position;
    v_texcoord = a_position.xy * 0.5 + 0.5;
}

#endif //COMPILING_VS

#ifdef COMPILING_FS
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D u_sampler;

void main() {
    float depth = texture2D(u_sampler, v_texcoord).x;
    float depth65535 = depth * 65535.0;
    float depth_high = floor(depth65535/256.0) / 255.0;
    float depth_low = mod(depth65535, 256.0) / 25.0;

    vec4 color = vec4(depth, depth/2.0, 0 ,0);

    gl_FragColor = color;
}

#endif //COMPILING_FS