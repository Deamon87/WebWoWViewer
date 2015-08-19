'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoObjectFactory', ['js.wow.render.wmoM2ObjectFactory']);
    cacheTemplate.factory("wmoObjectFactory", ['$q', '$timeout', 'wmoM2ObjectFactory', function($q, $timeout, wmoM2ObjectFactory) {

        function WmoObject(sceneApi){
            var self = this;
            self.sceneApi = sceneApi;

            self.wmoGroupArray = [];
            self.doodadsArray = [];
        }
        WmoObject.prototype = {
            loadGeom : function (num, filename){
                var self = this;
                self.sceneApi.loadWmoGeom(filename).then(
                    function success(wmoGeom){
                        self.wmoGroupArray[num] = wmoGeom;

                        /* 1. Load textures */
                        wmoGeom.loadTextures(self.wmoObj.momt);

                    }, function error(){
                    }
                );
            },
            checkIfUseLocalLighting : function(pos) {
                var lastGroupInfo = null;
                for (var i = 0; i < this.wmoObj.nGroups; i++) {
                    var groupInfo = this.wmoObj.groupInfos[i];
                    var bb1 = groupInfo.bb1,
                        bb2 = groupInfo.bb2;

                    if( bb1.x <= pos.x && pos.x <= bb2.x
                        && bb1.y <= pos.y && pos.y <= bb2.y
                        && bb1.z <= pos.z && pos.z <= bb2.z ) {
                        // Point is in bounding box

                        //Now check if this bb is smaller than previous one
                        /*if (lastGroupInfo) {
                            if (lastGroupInfo.bb1.x > bb1.x || lastGroupInfo.bb2.x > bb2.x
                                || lastGroupInfo.bb1.y > bb1.y || lastGroupInfo.bb2.y < bb2.y
                                || lastGroupInfo.bb1.z > bb1.z || lastGroupInfo.bb2.z < bb2.z
                            ) {
                                continue;
                            }
                        } */

                        lastGroupInfo = groupInfo;
                    }
                }

                if (lastGroupInfo && ((lastGroupInfo.flags & 0x2000) > 0)) {
                    return true
                } else {
                    return false;
                }
            },
            loadDoodads : function (doodadsInd){
                var self = this;
                var doodadsSet = self.wmoObj.modd[doodadsInd];

                this.doodadsArray = [];
                for (var i = 0; i < doodadsSet.doodads.length; i++) {
                //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
                    var doodad = doodadsSet.doodads[i];
                    this.loadDoodad(i, doodad);
                }
            },
            loadDoodad : function (index, doodad) {
                var self = this;

                self.doodadsArray[index] = new wmoM2ObjectFactory(self.sceneApi);
                var useLocalLighting = self.checkIfUseLocalLighting(doodad.pos);
                self.doodadsArray[index].load(doodad, useLocalLighting)
            },
            load : function (filename, doodadsInd){
                var deferred = $q.defer();
                var self = this;

                var wmoMailPromise = self.sceneApi.loadWmoMain(filename);
                wmoMailPromise.then(function success(wmoObj){
                    self.wmoObj = wmoObj;
                    self.wmoGroupArray = [];
                    self.wmoGroupArray.length  = wmoObj.nGroups;

                    /* 1. Load wmo group files */
                    var template = filename.substr(0, filename.lastIndexOf("."));
                    for (var i = 0; i < wmoObj.nGroups; i++) {
                        /* Fill the string with zeros, so it would have length of 3 */
                        var num = (i).toString();
                        for (;num.length != 3; ){
                            num = '0' + num;
                        }

                        self.loadGeom(i, template + "_" + num + ".wmo");
                    }

                    /* 2. Load doodads */
                    self.loadDoodads(doodadsInd);
                }, function error (){
                });
            },
            draw : function () {
                /* Draw */
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.getShaderUniforms();
                var identMatrix = mat4.create();
                mat4.identity(identMatrix);

                gl.uniformMatrix4fv(uniforms.uPlacementMat, false, identMatrix);

                for (var i = 0; i < this.wmoGroupArray.length; i++){
                    if (this.wmoGroupArray[i]){
                        this.wmoGroupArray[i].draw();
                    }
                }

                for (var i = 0; i < this.doodadsArray.length; i++) {
                    //if (i != window.dboNumber){
                    //    continue;
                    //}
                    this.doodadsArray[i].draw()
                }
            }
        };

        return WmoObject;
    }]);
})(window, jQuery);