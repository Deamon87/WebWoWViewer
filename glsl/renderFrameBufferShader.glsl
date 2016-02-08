#ifdef ENABLE_DEFERRED
    #extension OES_texture_float_linear : enable
#endif

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
uniform sampler2D u_depth;

uniform float gauss_offsets[5];
uniform float gauss_weights[5];

void main() {
   /*
    vec4 fragmentColor = texture2D(u_sampler, v_texcoord);
    float sourceDepth = texture2D(u_depth, v_texcoord).x;
    vec4 final = (fragmentColor * gauss_weights[0]);
    for (int i = 1; i < 5; i++) {

        float sampleDepth = texture2D(u_depth, (v_texcoord + vec2(0.0, gauss_offsets[i]))).x;
        float filterDepth = (((sourceDepth - sampleDepth) > 0.0700000003) ? 1.0 : 0.0);
        //float filterDepth = 1.0;
        vec4 t = vec4(filterDepth);
        final = (final + (gauss_weights[i] * mix(texture2D(u_sampler, (v_texcoord + vec2(0.0, gauss_offsets[i]))), fragmentColor, t)));
    }

    final.a = 1.0;
    gl_FragColor = final;   */


    gl_FragColor = vec4(texture2D(u_sampler, v_texcoord).rgb, 0);
}

#endif //COMPILING_FS


#ifdef deffered_light
precision highp float;

#define DISPLAY_DEPTH 0
#define DISPLAY_NORMAL 1
#define DISPLAY_POSITION 2
#define DISPLAY_COLOR 3
#define DISPLAY_TOTAL 4
#define DISPLAY_LIGHTS 5
#define DISPLAY_NONTILE_LIGHTS 6
#define DISPLAY_INK 7
#define DISPLAY_DEBUGTILE 8
#define MAXLIGHTNUM 1000

uniform sampler2D u_Depthtex;
uniform sampler2D u_Normaltex;
uniform sampler2D u_Positiontex;
uniform sampler2D u_Colortex;
//for light
uniform sampler2D u_LightGridtex;
uniform sampler2D u_LightIndextex;
uniform sampler2D u_LightPositiontex;
uniform sampler2D u_LightColorRadiustex;
uniform int u_LightNum;
uniform int u_DisplayType;
//uniform float u_Far;
//uniform float u_Near;
//uniform float u_Width;
//uniform float u_Height;
uniform int u_MaxTileLightNum;
uniform int u_TileSize;
//uniform Light u_Lights[LIGHTNUM];
uniform int u_LightIndexImageSize;
uniform float u_FloatLightIndexSize;
uniform float u_WidthTile;
uniform float u_HeightTile;
varying vec2 fs_Texcoord;
float linearizeDepth(float exp_depth, float near, float far) {
    return  (2.0 * near) / (far + near -  exp_depth * (far - near));
}
void main(void)
{
    vec3 normal = texture2D(u_Normaltex, fs_Texcoord).xyz;
    vec3 position = texture2D(u_Positiontex, fs_Texcoord).xyz;
    vec3 color = texture2D(u_Colortex, fs_Texcoord).xyz;
    //vec3 depth = texture2D(u_Depthtex, fs_Texcoord).xyz;
    //float exp_depth = texture2D(u_Depthtex, fs_Texcoord).r;
    //float lin_depth = linearizeDepth(exp_depth,u_Near,u_Far);
    //get the grid data index
    vec2 gridIndex = vec2(((fs_Texcoord.x*u_Width) / float(u_TileSize)) / (u_WidthTile), ((fs_Texcoord.y*u_Height) / float(u_TileSize)) / (u_HeightTile));
    //x for offset, y for count
    vec3 gridInfo = texture2D(u_LightGridtex, gridIndex).xyz;
    int offset = int(gridInfo.x);
    int count = int(gridInfo.y);
    int offset2 = int(gridInfo.z);
    vec3 lightColor = vec3(0.0);
    int lightCount = 0;
    if(count > 0){
        for(int i = 0; i < MAXLIGHTNUM; i++){
            if(i < count){
                int lightId;
                //float temp = (mod(float(offset+i), u_FloatLightIndexSize));
                float temp = float(offset + i);
                int addNext = 0;

                if(temp >= u_FloatLightIndexSize){
                    temp -= u_FloatLightIndexSize;
                    addNext++;
                }

                //precision problem
                if(temp == u_FloatLightIndexSize)
                   temp = 0.0;
                float lightSize =  u_FloatLightIndexSize-1.0;
                vec2 dataIndex = vec2(
                    temp / lightSize,
                    //floor(float((offset2+i) / (u_LightIndexImageSize))) / (lightSize)
                    float(offset2 + addNext) / lightSize
                    );

                //vec2 dataIndex = vec2(float(offset+i) / float(u_LightIndexImageSize-1), 1.0);
                lightId = int((texture2D(u_LightIndextex, dataIndex).x));
                vec3 lightPos = texture2D(u_LightPositiontex, vec2(float(lightId)/float(u_LightNum-1))).xyz;
                vec4 lightColorRadius = texture2D(u_LightColorRadiustex, vec2(float(lightId)/float(u_LightNum-1))).xyzw;
                if(distance(lightPos, position) < lightColorRadius.w){
                    //float distoL = distance(lightPos, position);
                    //distoL = max(lightColorRadius.w - distoL, 0.0);
                    float diffuse = abs(dot(normal, normalize(lightPos - position)));
                    //max(dot(normal, normalize(lightPos - position)),0.0);
                    // if(diffuse == 0.0)
                    //     diffuse = dot(-normal, normalize(lightPos - position));
                    float dist = distance(lightPos, position);
                    float lightR = lightColorRadius.w;
                    float attenuation = dist/(1.0 - (dist/lightR) * (dist/lightR));
                    attenuation = attenuation / lightR + 1.0;
                    attenuation = 1.0 / (attenuation * attenuation);

                    lightColor += diffuse * lightColorRadius.xyz * attenuation* color;// * ((lightColorRadius.w - distance(lightPos, position)) /     lightColorRadius.w);

                    //lightColor += lightColorRadius.xyz;
                    //if(distoL > 0.0)
                    lightCount ++;
                }
            }
            else
                break;
        }
        lightColor = mix(vec3(0.0), vec3(1.0), lightColor);
        lightColor = clamp(lightColor, vec3(0.0), vec3(1.0));
    }
    //gl_FragData[0] = vec4(vec3(float(count) / float(LIGHTNUM)),1.0);
    gl_FragColor = vec4(lightColor * 0.7, 1.0) + vec4(color * 0.3,1.0);
}
#endif