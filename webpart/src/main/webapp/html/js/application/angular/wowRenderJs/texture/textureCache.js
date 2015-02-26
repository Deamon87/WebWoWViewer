/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {

    function Texture(glContext) {
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

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

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


    var textureWoWCache = angular.module('js.wow.render.textureWoWCache', ['main.services.map.blpLoader', 'js.wow.render.texture']);
    textureWoWCache.factory("textureWoWCache", ['blpLoader', 'texture', '$q', function(blpLoader, texture, $q){

        return function (glContext) {
            /*
            * Cache implementation
            */

            var cache = {};
            function get(fileName){
                var obj = cache[filename];
                if (obj && obj.count) {

               }
            }
            function put(fileName, texture){
                var obj = {
                    obj: texture,
                    counter : 1
                };

                cache[fileName] = texture;
            }
            function remove(fileName){
                var obj = cache[fileName];
                if (!obj) {
                    /* TODO: Log the message? */
                    return;
                }

                /* Destroy texture if usage counter is 0 or less */
                obj.counter -= 1;
                if (obj.counter <= 0) {
                    cache[fileName] = null;
                    obj.texture.destroy();
                }
            }

            /*
            * Workflow for loading the texture
            */

            this.loadTexture = function(filename) {
                //Check if it's not promise
                if (cache[filename]) {



                    return;
                }
                var deferred = $q.defer();


                blpLoader(filename).then(function success(blpFile) {
                    /* This code requires gl context */
                    var textureObj = new Texture(glContext);
                    textureObj.loadFromMipmaps(blpFile.mipmaps, blpFile.textureFormat);

                    /* Add texture to cache */
                    put(filename, textureObj);

                    deferred.resolve(textureObj);
                }, function error() {
                    deferred.reject(textureObj);
                });

                return deferred.promise;
            };
            this.unLoadTexture = function(filename) {
                removeTexture(filename);
            }
        }
    }]);

})(window, jQuery);

