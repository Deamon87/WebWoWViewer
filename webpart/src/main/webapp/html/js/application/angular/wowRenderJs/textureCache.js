/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {
    var textureWoWCache = angular.module('js.wow.render.textureWoWCache', ['main.services.map.blpLoader', 'js.wow.render.texture']);
    textureWoWCache.factory("textureWoWCache", ['blpLoader', 'texture', function(blpLoader, texture){

        return function (glContext) {
            /*
            * Cache implementation
            */

            var cache = {};
            function getTexture(fileName) {
                var texture = cache[fileName];
                if (!texture) {
                     return null
                }
                /* TODO: Define later some loading flag */
                if (texture.loading) {

                    return null;
                }

                return texture;
            }
            function addTexture(fileName, texture){
                var textObj = {
                    texture: texture,
                    counter : 1
                };

                cache[fileName] = texture;
            }
            function removeTexture(fileName){
                var textObj = cache[fileName];
                if (!textObj) {
                    /* TODO: Log the message? */
                    return;
                }

                /* Destroy texture if usage counter is 0 or less */
                textObj.counter -= 1;
                if (textObj.counter <= 0) {
                    cache[fileName] = null;
                    textObj.texture.destroy();
                }
            }

            /*
            * Workflow for loading the texture
            */

            this.loadTexture = function(filename) {
                /* ToDo: Add some load pending flag to the cache */
                blpLoader(filename).then(function success(blpFile) {
                    /* This code requires gl context */
                    var textureObj = new texture(glContext);
                    textureObj.loadFromMipmaps(blpFile.mipmaps, blpFile.textureFormat);

                    /* Add texture to cache */
                    addTexture(textureObj);
                }, function error() {
                });
            };
            this.unLoadTexture = function(filename) {
                removeTexture(filename);
            }
        }
    }]);

})(window, jQuery);

