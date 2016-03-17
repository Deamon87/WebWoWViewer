class Texture {
    constructor(sceneApi) {
        this.sceneApi = sceneApi;

        this.texture = null;
    }
    loadFromMipmaps (mipmaps, textureFormat){
        var gl = this.sceneApi.getGlContext();
        var anisFilterExt = this.sceneApi.extensions.getAnisotropicExt();
        var ext = this.sceneApi.extensions.getComprTextExt();

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        var textureGPUFormat = null;
        if (ext) {
            switch (textureFormat) {
                case "S3TC_RGB_DXT1":
                    textureGPUFormat = ext.COMPRESSED_RGB_S3TC_DXT1_EXT;
                    break;

                case "S3TC_RGBA_DXT1":
                    textureGPUFormat = ext.COMPRESSED_RGBA_S3TC_DXT1_EXT;
                    break;


                case "S3TC_RGBA_DXT3":
                    textureGPUFormat = ext.COMPRESSED_RGBA_S3TC_DXT3_EXT;
                    break;

                case "S3TC_RGBA_DXT5":
                    textureGPUFormat = ext.COMPRESSED_RGBA_S3TC_DXT5_EXT;
                    break;
            }
        }

        /* S3TC is not supported on mobile platforms */
        var useDXT1Decoding = (!((ext != undefined) && (ext.COMPRESSED_RGB_S3TC_DXT1_EXT != undefined))) ||
            (!((ext != undefined) && (ext.COMPRESSED_RGBA_S3TC_DXT1_EXT != undefined)));
        var useDXT3Decoding = !((ext != undefined) && (ext.COMPRESSED_RGBA_S3TC_DXT3_EXT != undefined));
        var useDXT5Decoding = !((ext != undefined) && (ext.COMPRESSED_RGBA_S3TC_DXT5_EXT != undefined));


        /* Hack for DXT1. It still falls on gpu when width is not equal to height and one of them is less than 8 :/ */
        useDXT1Decoding = useDXT1Decoding ||
            (
                (textureFormat === "S3TC_RGB_DXT1") ||
                (textureFormat === "S3TC_RGBA_DXT1")
            ) &&( mipmaps[0].width !== mipmaps[0].height );

        var generateMipMaps = false;
        switch (textureFormat) {
            case "S3TC_RGB_DXT1":
            case "S3TC_RGBA_DXT1":
                for( var k = 0; k < mipmaps.length; k++) {
                    if (useDXT1Decoding) {
                        var decodedResult = dxtLib.decodeDXT1toBitmap32(mipmaps[k].texture, mipmaps[k].width, mipmaps[k].height);

                        gl.texImage2D(gl.TEXTURE_2D, k, gl.RGBA, mipmaps[k].width, mipmaps[k].height, 0, gl.RGBA, gl.UNSIGNED_BYTE, decodedResult.decData);
                    } else {
                        gl.compressedTexImage2D(gl.TEXTURE_2D, k, textureGPUFormat, mipmaps[k].width, mipmaps[k].height, 0, mipmaps[k].texture);
                    }
                }
                break;

            case "S3TC_RGBA_DXT3":
                for( var k = 0; k < mipmaps.length; k++) {
                    if (useDXT3Decoding) {
                        var decodedResult = dxtLib.decodeDXT3toBitmap32(mipmaps[k].texture , mipmaps[k].width, mipmaps[k].height);
                        gl.texImage2D(gl.TEXTURE_2D, k, gl.RGBA, mipmaps[k].width, mipmaps[k].height, 0, gl.RGBA, gl.UNSIGNED_BYTE,  decodedResult.decData);
                    } else {
                        gl.compressedTexImage2D(gl.TEXTURE_2D, k, textureGPUFormat, mipmaps[k].width, mipmaps[k].height, 0, mipmaps[k].texture);
                    }
                }

                break;

            case "S3TC_RGBA_DXT5":
                for( var k = 0; k < mipmaps.length; k++) {
                    if (useDXT5Decoding) {
                        var decodedResult = dxtLib.decodeDXT5toBitmap32(mipmaps[k].texture , mipmaps[k].width, mipmaps[k].height);
                        gl.texImage2D(gl.TEXTURE_2D, k, gl.RGBA, mipmaps[k].width, mipmaps[k].height, 0, gl.RGBA, gl.UNSIGNED_BYTE,  decodedResult.decData);
                    } else {
                        gl.compressedTexImage2D(gl.TEXTURE_2D, k, textureGPUFormat, mipmaps[k].width, mipmaps[k].height, 0, mipmaps[k].texture);
                    }
                }
                break;

            case "BGRA":
                for( var k = 0; k < mipmaps.length; k++) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mipmaps[k].width, mipmaps[k].height, 0, gl.RGBA, gl.UNSIGNED_BYTE,  mipmaps[k].texture);
                }
                break;
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        if (anisFilterExt) {
            var max_anisotropy = gl.getParameter(anisFilterExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, anisFilterExt.TEXTURE_MAX_ANISOTROPY_EXT, max_anisotropy);
        }

        /*if (generateMipMaps) {
            gl.generateMipmap(gl.TEXTURE_2D);
            if (gl.getError()!=0) {
                debugger;
            }
        }
        */

        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    destroy () {
        var gl = this.gl;
        if (this.texture) {
            gl.deleteTexture(this.texture);
        }

        this.texture = null;
    }
}

class TextureWoWCache {
    constructor (sceneApi) {
        var self = this;

        /* Init cache */
        this.cache = cacheTemplate(function loadBlpFile(fileName) {
            /* Must return promise */
            return blpLoader(fileName);

        }, function process(blpFile) {
            var textureObj = new Texture(sceneApi);
            textureObj.loadFromMipmaps(blpFile.mipmaps, blpFile.textureFormat);
            textureObj.fileName = blpFile.fileName;

            return textureObj
        });
    }

    /* Exposed interface */
    loadTexture (fileName){
        //The texture name are case insensitive, but in files they can be in different case
        //So it's rational to lower the filepath case here
        var filenameLower = fileName.toLowerCase();
        return this.cache.get(filenameLower);
    };

    unLoadTexture (fileName) {
        this.cache.remove(fileName)
    }
}
