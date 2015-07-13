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
                            (function (submeshData, mdxTextureDefinition) {
                                self.sceneApi.loadTexture(mdxTextureDefinition.textureName)
                                    .then(function success(textObject) {
                                        submeshData.textureTexUnit1 = textObject;
                                    }, function error() {
                                    });
                            })(submeshData, mdxTextureDefinition);
                        }
                    }
                }

                this.submeshArray = submeshArray;
            },
            draw : function (){
                if ((this.m2Geom) && (this.skinGeom)) {
                    this.m2Geom.draw(this.skinGeom, this.submeshArray);
                }
            }
        };

        return MDXObject;
    }]);
})(window, jQuery);