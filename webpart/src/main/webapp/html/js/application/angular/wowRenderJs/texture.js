/**
 * Created by Deamon on 26/01/2015.
 */
/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {
    var texture = angular.module('js.wow.render.texture', []);

    texture.factory('texture', [function(){

        return function (glContext) {
            this.gl = glContext;

            this.texture = null;

            this.loadFromMipmaps = function (mipmaps, textureFormat){
                var gl = this.gl;

                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);

                var ext = (
                    gl.getExtension("WEBGL_compressed_texture_s3tc") ||
                    gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
                    gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
                );

                switch (textureFormat){
                    case "S3TC_DXT1":
                        textureFormat = ext.COMPRESSED_RGBA_S3TC_DXT1_EXT;
                        break;

                    case "S3TC_DXT3":
                        textureFormat = ext.COMPRESSED_RGBA_S3TC_DXT3_EXT;
                        break;

                    case "S3TC_DXT5":
                        textureFormat = ext.COMPRESSED_RGBA_S3TC_DXT5_EXT;
                        break;
                }
                /* ToDo : check if compressed format is supported on this gpu */

                if (textureFormat != "BGRA") {
                    for(var k = 0; k < image.length; k++) {
                        gl.compressedTexImage2D(gl.TEXTURE_2D, k, textureFormat, mipmaps[k].width, mipmaps[k].height, 0, mipmaps[k].texture);
                    }
                } else {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.BGRA, gl.UNSIGNED_BYTE, image.texture);
                }

                gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T, gl.REPEAT);

                gl.bindTexture(gl.TEXTURE_2D, null);
            };

            this.destroy = function() {
                var gl = this.gl;
                if (this.texture) {
                    gl.deleteTexture(this.texture);
                }

                this.texture = null;
            }
        }
    }]);


})(window, jQuery);