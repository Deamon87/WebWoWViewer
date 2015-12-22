'use strict';

(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.adtM2ObjectFactory', ['js.wow.render.mdxObject']);
    cacheTemplate.factory("adtM2ObjectFactory", ['mdxObject', '$q', '$timeout', function(mdxObject, $q, $timeout) {
        function AdtM2Object(sceneApi){
            var self = this;

            self.sceneApi = sceneApi;
            self.mdxObject = new mdxObject(sceneApi);
            self.currentDistance = 0;
            self.isRendered = true;
        }
        AdtM2Object.prototype = {


            getFileNameIdent : function (){
                return this.mdxObject.fileIdent;
            },
            getMeshesToRender : function () {
                if (!this.mdxObject) return null;
                return this.mdxObject.getMeshesToRender();
            },
            drawBB : function (){

            },
            drawTransparentMeshes : function () {
                this.mdxObject.drawTransparentMeshes(this.placementMatrix, 0xffffffff);
            },
            drawNonTransparentMeshes : function () {
                this.mdxObject.drawNonTransparentMeshes(this.placementMatrix, 0xffffffff);
            },
            draw : function () {
                this.mdxObject.draw(this.placementMatrix, 0xffffffff);
            },
            drawInstancedNonTransparentMeshes : function (instanceCount, placementVBO) {
                this.mdxObject.drawInstancedNonTransparentMeshes(instanceCount, placementVBO, 0xffffffff);
            },
            drawInstancedTransparentMeshes : function (instanceCount, placementVBO) {
                this.mdxObject.drawInstancedTransparentMeshes(instanceCount, placementVBO, 0xffffffff);
            },
            checkFrustumCulling : function (frustrumMatrix, lookAtMat4) {
                this.setIsRendered(this.getIsRendered() && this.mdxObject.checkFrustumCulling(frustrumMatrix, lookAtMat4, this.placementMatrix));
            },
            checkAgainstDepthBuffer: function (frustrumMatrix, lookAtMat4, getDepth) {
                this.setIsRendered(this.getIsRendered() && this.mdxObject.checkAgainstDepthBuffer(frustrumMatrix, lookAtMat4, this.placementMatrix, getDepth));
            },
            update : function(deltaTime, cameraPos) {
                if (!this.aabb) {
                    var bb = this.mdxObject.getBoundingBox();
                    if (bb) {
                        var a_ab = vec4.fromValues(bb.ab.x,bb.ab.y,bb.ab.z,1);
                        var a_cd = vec4.fromValues(bb.cd.x,bb.cd.y,bb.cd.z,1);

                        vec4.transformMat4(a_ab, a_ab, this.placementMatrix);
                        vec4.transformMat4(a_cd, a_cd, this.placementMatrix);


                        var minx = Math.min(a_ab[0], a_cd[0]);    var maxx = Math.max(a_ab[0], a_cd[0]);
                        var miny = Math.min(a_ab[1], a_cd[1]);    var maxy = Math.max(a_ab[1], a_cd[1]);
                        var minz = Math.min(a_ab[2], a_cd[2]);    var maxz = Math.max(a_ab[2], a_cd[2]);

                        this.aabb = [[minx, miny, minz], [maxx, maxy, maxz]];
                    }
                }
                if (!this.getIsRendered()) return;
                this.mdxObject.update(deltaTime, cameraPos, this.placementInvertMatrix);
            },
            createPlacementMatrix : function(mddf){
                var TILESIZE = 533.333333333;

                var posx = 32*TILESIZE - mddf.pos.x;
                var posy = mddf.pos.y;
                var posz = 32*TILESIZE - mddf.pos.z;

                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(90));

                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.y -270));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(-mddf.rotation.x));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.z-90));

                mat4.scale(placementMatrix, placementMatrix, [mddf.scale / 1024, mddf.scale / 1024, mddf.scale / 1024]);

                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            calcOwnPosition : function () {
                var position = vec4.fromValues(0,0,0,1);
                vec4.transformMat4(position, position, this.placementMatrix);

                this.position = position;
            },
            calcDistance : function (position) {
                function distance(aabb, p) {
                    var dx = Math.max(aabb[0][0] - p[0], 0, p[0] - aabb[1][0]);
                    var dy = Math.max(aabb[0][1] - p[1], 0, p[1] - aabb[1][1]);
                    var dz = Math.max(aabb[0][2] - p[2], 0, p[2] - aabb[1][2]);
                    return Math.sqrt(dx*dx + dy*dy + dz*dz);
                }

                if (this.aabb) {
                    this.currentDistance = distance(this.aabb, position);
                }
            },
            getCurrentDistance : function (){
                return this.currentDistance;
            },
            setIsRendered : function (value) {
                this.isRendered = value;
            },
            getIsRendered : function () {
                return this.isRendered;
            },
            load : function (mddf){
                var self = this;

                self.mddf = mddf;

                self.createPlacementMatrix(mddf);
                self.calcOwnPosition();
                return self.mdxObject.load(mddf.fileName, 0);
            }
        };

        return AdtM2Object;
    }]);
})(window, jQuery);