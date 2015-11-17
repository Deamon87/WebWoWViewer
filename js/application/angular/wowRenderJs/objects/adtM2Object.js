'use strict';

(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.adtM2ObjectFactory', ['js.wow.render.mdxObject']);
    cacheTemplate.factory("adtM2ObjectFactory", ['mdxObject', '$q', '$timeout', function(mdxObject, $q, $timeout) {
        function AdtM2Object(sceneApi){
            var self = this;

            self.sceneApi = sceneApi;
            self.mdxObject = new mdxObject(sceneApi);
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
            update : function(deltaTime) {
                this.mdxObject.update(deltaTime);
            },
            createPlacementMatrix : function(mddf){
                var TILESIZE = 533.333333333;

                var posx = mddf.pos.x-32*TILESIZE;
                var posy = mddf.pos.y;
                var posz = mddf.pos.z-32*TILESIZE;

                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(-90));

                // with FPosition do glTranslatef(x,y,z);
                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.y - 90));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(-mddf.rotation.x));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.z));

                //glscalef(Fscale,Fscale,Fscale);
                mat4.scale(placementMatrix, placementMatrix, [mddf.scale / 1024, mddf.scale / 1024, mddf.scale / 1024]);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(-90));

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
                return vec4.distance(position, this.position);
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