'use strict';

(function (window, $, undefined) {
    var mdxObject = angular.module('js.wow.render.mdxObject', []);
    mdxObject.factory("mdxObject", ['$q', '$timeout', function($q, $timeout) {

        function MDXObject(sceneApi){
            this.sceneApi = sceneApi;
        }
        MDXObject.prototype = {
            load : function (modelName, skinNum, submeshRenderData){
                var self = this;

                var nameTemplate = modelName.substr(0, modelName.length-4);
                var modelFileName = nameTemplate + '.m2';
                var skinFileName = nameTemplate + '00.skin';

                var m2Promise = this.sceneApi.loadM2Geom(modelFileName);
                var skinPromise = this.sceneApi.loadSkinGeom(skinFileName);

                $q.all([m2Promise,skinPromise]).then(function(result){
                    var m2Geom = result[0];
                    var skinGeom = result[1];

                    self.m2Geom = m2Geom;
                    self.skinGeom = skinGeom;

                    self.makeSubmeshArray(m2Geom, skinGeom, submeshRenderData)
                });
            },
            makeSubmeshArray : function (mdxObject, skinObject, submeshRenderData) {
                var submeshArray = [];
                var self = this;
                submeshArray.length = 15;

                /* 1. Free previous subMeshArray */

                /* 2. Fill the meshArrays */
                if (submeshRenderData) {
                    submeshRenderData.forEach(function (object, index) {
                        submeshArray[index] = {
                            submeshIndex: 0
                            //texture1: {},
                            //texture2: {},
                            //texture3: {}
                        }
                    });
                } else {
                    submeshArray.length = skinObject.skinFile.header.subMeshes.length;
                    for (var i = 0; i < submeshArray.length; i++) {
                        submeshArray[i] = {
                            isRendered: false,
                            textureTexUnit1: null,
                            textureTexUnit2: null,
                            textureTexUnit3: null
                        };
                    }

                    for (var i = 0; i < skinObject.skinFile.header.texs.length ; i++) {
                        var skinTextureDefinition = skinObject.skinFile.header.texs[i];
                        var mdxTextureIndex = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex];
                        var mdxTextureDefinition = mdxObject.m2File.textureDefinition[mdxTextureIndex];

                        var submeshData = submeshArray[skinTextureDefinition.submeshIndex];

                        submeshData.isRendered = true;

                        /* 2.2. Assign and load textures */
                        if (mdxTextureDefinition.texType === 0) {
                            (function (submeshData, mdxTextureDefinition, textureIndex) {
                                self.sceneApi.loadTexture(mdxTextureDefinition.textureName)
                                    .then(function success(textObject) {
                                        submeshData.texUnit1Texture = textObject;
                                        submeshData.texUnit1TexIndex = textureIndex;

                                    }, function error() {
                                    });
                            })(submeshData, mdxTextureDefinition, i);
                        }
                    }
                }

                this.submeshArray = submeshArray;
            },
            getSubMeshColor : function (deltaTime) {
                var colors = this.m2Geom.m2File.colors;
                if (colors.length > 0) {
                    var result = [];
                    result.length = colors.length;

                    for (var i = 0; i < colors.length; i++) {
                        var vector = colors[i].color.valuesPerAnimation[0][0];
                        var alpha = colors[i].alpha.valuesPerAnimation[0][0];

                        result[i] = [vector.x, vector.y, vector.z, alpha/32767];
                    }

                    return result;

                } else {
                    return null;
                }
            },
            draw : function (deltaTime, placementMatrix, color){
                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                //colorVector = [colorVector[0]*2, colorVector[1]*2,colorVector[2]*2, colorVector[3]*2];
                /*
                var color2 = 4280361249;
                var colorVector2 = [color2&0xff, (color2>> 8)&0xff,
                    (color2>>16)&0xff, (color2>> 24)&0xff];
                colorVector2[0] /= 255.0; colorVector2[1] /= 255.0;
                colorVector2[2] /= 255.0; colorVector2[3] /= 255.0;

                colorVector = [
                    colorVector[0]*colorVector2[3]+ (1.0 - colorVector2[3])*colorVector2[0],
                    colorVector[1]*colorVector2[3]+ (1.0 - colorVector2[3])*colorVector2[0],
                    colorVector[2]*colorVector2[3]+ (1.0 - colorVector2[3])*colorVector2[0],
                    colorVector[3]*colorVector2[3]+ (1.0 - colorVector2[3])*colorVector2[0]];
                 */


                if ((this.m2Geom) && (this.skinGeom)) {
                    var subMeshColors = this.getSubMeshColor(deltaTime);

                    this.m2Geom.draw(this.skinGeom, this.submeshArray, placementMatrix, colorVector, subMeshColors);
                }
            }
        };

        return MDXObject;
    }]);
})(window, jQuery);