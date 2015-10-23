'use strict';

(function (window, $, undefined) {
    var adtObjectFactory = angular.module('js.wow.render.adtObjectFactory', ['js.wow.render.adtM2ObjectFactory']);
    adtObjectFactory.factory("adtObjectFactory", ['$q', 'adtM2ObjectFactory', function ($q, adtM2ObjectFactory) {
        function ADTObject(sceneApi, wdtFile){
            this.sceneApi = sceneApi;
            this.m2Array = [];
        }
        ADTObject.prototype = {
            loadM2s : function (){
                var self = this;
                var m2Positions = this.adtGeom.adtFile.mddf;

                this.m2Array = [];
                for (var i = 0; i < m2Positions.length; i++) {
                    //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
                    var doodad = m2Positions[i];
                    //this.loadM2(i, doodad);
                    this.sceneApi.objects.loadAdtM2Obj(doodad);
                }
            },
            loadM2 : function (index, doodad) {
                var self = this;

                self.m2Array[index] = new adtM2ObjectFactory(self.sceneApi);
                self.m2Array[index].load(doodad, false)
            },
            loadWmos : function (){
                var self = this;
                var wmoPositions = this.adtGeom.adtFile.wmoObjs;

                this.wmoArray = [];

                wmoPositions.forEach(function(wmoDef) {
                    self.sceneApi.objects.loadAdtWmo(wmoDef);
                });
            },
            load: function (modelName) {
                var self = this;

                var adtPromise = this.sceneApi.resources.loadAdtGeom(modelName);
                adtPromise.then( function (result) {
                    self.adtGeom = result;

                    self.loadM2s();
                    self.loadWmos();
                });
            },
            draw : function (deltaTime){
                if (this.adtGeom) {
                    this.adtGeom.draw();
                }
            }
        };

        return ADTObject;
     }]);
})(window, jQuery);