'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoObjectFactory', [
        'js.wow.render.wmoM2ObjectFactory'
    ]);
    cacheTemplate.factory("wmoObjectFactory", ['$q', '$timeout', 'wmoM2ObjectFactory', 'mathHelper',
        function($q, $timeout, wmoM2ObjectFactory, mathHelper) {

        function WmoObject(sceneApi){
            var self = this;
            self.sceneApi = sceneApi;

            self.wmoGroupArray = [];
            self.doodadsArray = [];
            self.drawGroup = [];
        }
        WmoObject.prototype = {
            getFileNameIdent : function () {
                return this.fileName;
            },
            loadGeom : function (num, filename){
                var self = this;
                self.sceneApi.resources.loadWmoGeom(filename).then(
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
            createWorldGroupBB : function () {
                var worldGroupBorders = new Array(this.wmoGroupArray.length);
                for (var i = 0; i < this.wmoGroupArray.length; i++) {
                    var groupInfo = this.wmoObj.groupInfos[i];
                    var bb1 = groupInfo.bb1,
                        bb2 = groupInfo.bb2;


                    var bb1vec = vec4.fromValues(bb1.x, bb1.y, bb1.z, 1);
                    var bb2vec = vec4.fromValues(bb2.x, bb2.y, bb2.z, 1);

                    vec4.transformMat4(bb1vec, bb1vec, this.placementMatrix);
                    vec4.transformMat4(bb2vec, bb2vec, this.placementMatrix);

                    var min_x = Math.min(bb1vec[0], bb2vec[0]); var max_x = Math.max(bb1vec[0], bb2vec[0]);
                    var min_y = Math.min(bb1vec[1], bb2vec[1]); var max_y = Math.max(bb1vec[1], bb2vec[1]);
                    var min_z = Math.min(bb1vec[2], bb2vec[2]); var max_z = Math.max(bb1vec[2], bb2vec[2]);

                    var worldAABB = new Array(2);
                    worldAABB[0] = vec4.fromValues(min_x, min_y, min_z, 1.0);
                    worldAABB[1] = vec4.fromValues(max_x, max_y, max_z, 1.0);

                    worldGroupBorders[i] = worldAABB;
                }

                this.worldGroupBorders = worldGroupBorders;
            },
            updateWorldGroupBBWithM2 : function () {

            },
            createPlacementMatrix : function(modf){
                var TILESIZE = 533.333333333;

                var posx = 32*TILESIZE - modf.pos.x;
                var posy = modf.pos.y;
                var posz = 32*TILESIZE - modf.pos.z;


                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(90));

                // with FPosition do glTranslatef(x,y,z);
                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.y-270));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(-modf.rotation.x));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.z-90));


                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            loadDoodads : function (doodadsInd){
                var self = this;
                if (!self.wmoObj.modd) {
                    return;
                }
                self.currentDoodadSet = self.wmoObj.mods[doodadsInd];

                var doodadsSet = self.wmoObj.mods[doodadsInd];
                var doodadDefArray = self.wmoObj.modd;

                this.doodadsPromiseArray =  new Array(doodadsSet.number);
                this.doodadsArray =  new Array(doodadsSet.number);
                for (var i = 0; i < doodadsSet.number; i++) {
                //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
                    var doodad = doodadDefArray[doodadsSet.index + i];
                    this.loadDoodad(i, doodad);
                }

                $q.all(self.doodadsPromiseArray).then(function success(arrayOfDoodads){
                    for (var i = 0; i < self.doodadsArray.length; i++){
                        self.doodadsArray[i] = arrayOfDoodads[i];
                    }

                    //credits to schlumpf for help
                    //Recalculate the group wmo bounding boxes here

                },function error(){});
            },
            loadDoodad : function (index, doodad) {
                var self = this;

                var useLocalLighting = self.checkIfUseLocalLighting(doodad.pos);
                this.doodadsPromiseArray[index] = self.sceneApi.objects.loadWmoM2Obj(doodad, self.placementMatrix, useLocalLighting);
                return this.doodadsPromiseArray[index];
            },
            load : function (modf){
                var deferred = $q.defer();
                var self = this;

                var filename = modf.fileName;
                var doodadsInd = modf.doodadSet;

                this.fileName = filename;

                /* 1. Create matrix */
                self.createPlacementMatrix(modf);

                var wmoMailPromise = self.sceneApi.resources.loadWmoMain(filename);
                wmoMailPromise.then(function success(wmoObj){
                    self.wmoObj = wmoObj;
                    self.wmoGroupArray = new Array(wmoObj.nGroups);

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

                    self.createWorldGroupBB();

                    deferred.resolve(self);
                }, function error (){
                });

                return deferred.promise;
            },
            drawBB : function () {
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.shaders.getShaderUniforms();

                /*for (var i = 0; i < this.wmoGroupArray.length; i++){
                    var groupInfo = this.wmoObj.groupInfos[i];
                    var bb1 = groupInfo.bb1,
                        bb2 = groupInfo.bb2;

                    var center = [
                        (bb1.x + bb2.x)/2,
                        (bb1.y + bb2.y)/2,
                        (bb1.z + bb2.z)/2
                    ];

                    var scale = [
                        bb2.x - center[0],
                        bb2.y - center[1],
                        bb2.z - center[2]
                    ];

                    gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
                    gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
                    gl.uniform3fv(uniforms.uColor, new Float32Array([0.027, 0.643, 0.075])); //green
                    gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);

                    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
                } */

                for (var i = 0; i < this.wmoGroupArray.length; i++) {
                    if (!this.wmoGroupArray[i] || !this.wmoGroupArray[i].wmoGroupFile) continue;
                    if (!this.drawGroup[i] && this.drawGroup[i]!==undefined) continue;


                    var mogp = this.wmoGroupArray[i].wmoGroupFile.mogp;
                    var bb1 = mogp.BoundBoxCorner1,
                        bb2 = mogp.BoundBoxCorner2;

                    var center = [
                        (bb1.x + bb2.x)/2,
                        (bb1.y + bb2.y)/2,
                        (bb1.z + bb2.z)/2
                    ];

                    var scale = [
                        bb2.x - center[0],
                        bb2.y - center[1],
                        bb2.z - center[2]
                    ];

                    gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
                    gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
                    gl.uniform3fv(uniforms.uColor, new Float32Array([0.058, 0.058, 0.819607843])); //blue

                    gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);

                    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
                }


            },
            setDoodadGroupDrawing : function (index, doDraw) {
                var groupInfo = this.wmoObj.groupInfos[index];
                var doodadsSet = this.currentDoodadSet;

                if (doodadsSet && this.wmoGroupArray[index]) {
                    var doodadRefs = this.wmoGroupArray[index].wmoGroupFile.doodadRefs;

                    if (doodadRefs) {
                        for (var i = 0; i < doodadRefs.length; i++) {
                            var doodadIndex = doodadRefs[i];
                            if (
                                (doodadIndex - doodadsSet.index < 0) ||
                                (doodadIndex > doodadsSet.index + doodadsSet.number - 1)
                            ) continue;

                            var mdxObject = this.doodadsArray[doodadIndex - doodadsSet.index];
                            //mdxObject.setIsRendered(mdxObject.getIsRendered() || doDraw);
                            if (mdxObject){
                                mdxObject.setIsRendered(doDraw);
                            }
                        }
                    }
                }
            },
            checkFrustumCulling : function (frustumPlanes) {
                var isDrawn = [];
                if (!this.worldGroupBorders) return;
                //1. Set Doodads drawing to false. Doodad should be rendered if at least one WMO Group it belongs is visible(rendered)
                //It's so, because two group wmo can reference same doodad
                for ( var i = 0; i < this.doodadsArray.length; i++) {
                    if (this.doodadsArray[i]) {
                        this.doodadsArray[i].setIsRendered(false);
                    }
                }

                //2. Calculate frustum
                for (var i = 0; i < this.wmoGroupArray.length; i++) {
                    var bbArray = this.worldGroupBorders[i];

                    var result = mathHelper.checkFrustum(frustumPlanes,bbArray);
                    isDrawn.push(result);//this.setDoodadGroupDrawing(i, true);
                }
                for (var i = 0; i < this.wmoGroupArray.length; i++) {
                    //Change state only if it's from false to true. According to rule from part 1
                    if (isDrawn[i]) {
                        this.setDoodadGroupDrawing(i, isDrawn[i]);
                    }

                    this.drawGroup[i] = isDrawn[i];
                }
            },
            update : function () {

            },
            draw : function () {
                /* Draw */
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.shaders.getShaderUniforms();

                if (this.placementMatrix) {
                    gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
                }

                for (var i = 0; i < this.wmoGroupArray.length; i++){
                    if (this.wmoGroupArray[i]){
                        if (!this.drawGroup[i] && this.drawGroup[i]!==undefined) continue;

                        this.wmoGroupArray[i].draw();
                    }
                }
            }
        };

        return WmoObject;
    }]);
})(window, jQuery);