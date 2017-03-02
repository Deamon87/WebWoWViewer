class M2Material {
    constructor() {
        this.isRendered= false;
        this.isTransparent= false;
        this.isEnviromentMapping= false;
        this.meshIndex= -1;
        this.textureTexUnit1= null;
        this.textureTexUnit2= null;
        this.textureTexUnit3= null;


        this.texUnit1TexIndex = 0;
        this.mdxTextureIndex1 = 0;
        this.xWrapTex1 = false;
        this.yWrapTex1 = false;
        this.textureUnit1TexName= '';
        this.texUnit1Texture = null;

        this.texUnit2TexIndex = 0;
        this.mdxTextureIndex2 = 0;
        this.xWrapTex2 = false;
        this.yWrapTex2 = false;
        this.textureUnit2TexName= '';
        this.texUnit2Texture = null;

        this.texUnit3TexIndex = 0;
        this.mdxTextureIndex3 = 0;
        this.xWrapTex3 = false;
        this.yWrapTex3 = false;
        this.textureUnit3TexName= '';
        this.texUnit3Texture = null;

        this.layer = 0;
        this.renderFlagIndex = -1;
        this.renderFlag = -1;
        this.renderBlending = -1;
        this.flags = 0;
        this.m2BatchIndex = -1;
        this.shaderNames = {};
    }
}

export default M2Material;