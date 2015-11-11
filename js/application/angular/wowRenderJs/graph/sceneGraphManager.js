'use strict';

(function (window, $, undefined) {
    var sceneGraph = angular.module('js.wow.render.scene.graph', []);
    sceneGraph.factory("graphManager", ['$q', 'adtM2ObjectFactory', 'wmoM2ObjectFactory', 'wmoObjectFactory',
        function($q, adtM2ObjectFactory, wmoM2ObjectFactory, wmoObjectFactory ){

        function GraphManager(){

        }

        GraphManager.prototype = {
            m2Objects : [],
            wmoObjects : [],
            skyDom : null,
            addAdtM2Object : function (doodad){
                var adtM2 = new adtM2ObjectFactory(self.sceneApi);
                adtM2.load(doodad, false);
                this.m2Objects.push(adtM2)
            },
            addWmoM2Object : function (doodadDef, placementMatrix, useLocalLighting){
                var wmoM2Object = new wmoM2ObjectFactory(this.sceneApi);
                wmoM2Object.load(doodadDef, placementMatrix, useLocalLighting);
                this.m2Objects.push(wmoM2Object);
            },
            addWmoObject : function (wmoDef){
                var wmoObject = new wmoObjectFactory(self.sceneApi);
                wmoObject.load(wmoDef);
                this.wmoObjects.push(wmoObject);
            },
            collectMeshes : function() {
                var meshesList = [];
                for (var i = 0; i < this.m2Objects.length; i++) {
                    var meshes = this.m2Objects[i].getMeshesToRender();
                    meshesList = meshesList.concat(meshes);
                }


                //TODO: figure out how instancing and mesh sorting shall meet the "from farthest to nearest" requirement for tranparent meshes
                //Sort meshes
                meshesList.sort(function(a, b){

                })
            },

            update : function(deltaTime) {
                //1. Update all wmo and m2 objects
                var i;
                for (i = 0; i < this.m2Objects.length; i++) {
                    this.m2Objects[i].update(deltaTime);
                }

                for (i = 0; i < this.wmoObjects.length; i++) {
                    this.wmoObjects[i].update(deltaTime);
                }


                //N. Collect non transparent and transparent meshes
                this.collectMeshes();
            },
            draw : function () {
                //1. Draw ADT

                //2. Draw WMO

                //3. Draw background WDL

                //4. Draw skydom
                if (this.skyDom) {
                    this.skyDom.draw();
                }

                //5. Draw nontransparent meshes of m2

                //6. Draw transparent meshes of m2

            }
        };

        return GraphManager;
    }]);

})(window, jQuery);