'use strict';

(function (window, $, undefined) {
    var sceneGraph = angular.module('js.wow.render.scene.graph', []);
    sceneGraph.factory("graphManager", ['$q',
        'adtObjectFactory', 'adtM2ObjectFactory', 'wmoM2ObjectFactory', 'wmoObjectFactory',
        function($q, adtObjectFactory, adtM2ObjectFactory, wmoM2ObjectFactory, wmoObjectFactory ){


        function InstanceManager(sceneApi){
            this.sceneApi = sceneApi;
        }
        InstanceManager.prototype = {
            mdxObjectList : [],
            sceneObjNumMap : {},
            addMDXObject : function (MDXObject){
                if (this.sceneObjNumMap[MDXObject.sceneNumber]) return; // The object has already been added to this manager

                this.sceneObjNumMap[MDXObject.sceneNumber] = MDXObject;
                this.mdxObjectList.push(MDXObject);
            },
            createParamsVBO : function (){
                var gl = this.sceneApi.getGlContext();

                var buffer = new Array(this.mdxObjectList.length * 16);
                var paramsVbo = gl.createBuffer();
                for (var i = 0; i < this.mdxObjectList.length; i++) {
                    var mdxObject = this.mdxObjectList[i];
                    var placementMatrix = mdxObject.placementMatrix;
                    for (var j = 0; j < 16; j++) {
                        buffer[i*16+j] = placementMatrix[j];
                    }
                }

                gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(buffer), gl.DYNAMIC_DRAW );

                this.paramsVbo = paramsVbo;
            }
        };



        function GraphManager(sceneApi){
            this.sceneApi = sceneApi;
        }

        GraphManager.prototype = {
            m2Objects : [],
            instanceList : {},
            wmoObjects : [],
            adtObjects : [],
            skyDom : null,
            currentTime : 0,
            lastTimeSort : 0,
            globalM2Counter : 0,
            addAdtM2Object : function (doodad){
                var adtM2 = new adtM2ObjectFactory(this.sceneApi);
                adtM2.load(doodad, false);
                adtM2.sceneNumber = this.globalM2Counter++;
                this.m2Objects.push(adtM2);
                return adtM2;
            },
            addWmoM2Object : function (doodadDef, placementMatrix, useLocalLighting){
                var wmoM2Object = new wmoM2ObjectFactory(this.sceneApi);
                wmoM2Object.load(doodadDef, placementMatrix, useLocalLighting);
                wmoM2Object.sceneNumber = this.globalM2Counter++;
                this.m2Objects.push(wmoM2Object);
                return wmoM2Object;
            },
            addWmoObject : function (wmoDef){
                var wmoObject = new wmoObjectFactory(this.sceneApi);
                wmoObject.load(wmoDef);
                this.wmoObjects.push(wmoObject);
                return wmoObject;
            },
            addADTObject : function (fileName) {
                var adtObject = new adtObjectFactory(this.sceneApi);
                adtObject.load(fileName);
                this.adtObjects.push(adtObject);
            },
            addM2ObjectToInstanceManager : function(m2Object) {
                var fileIdent = m2Object.getFileNameIdent();
                var instanceManager = this.instanceList[fileIdent];
                //1. Create Instance manager for this type of file if it was not created yet
                if (!instanceManager) {
                    instanceManager = new InstanceManager(this.sceneApi);
                    this.instanceList[fileIdent] = instanceManager;
                }

                //2. Add object to instance
                instanceManager.addMDXObject(m2Object);

                //3. Assign instance to object
                m2Object.instanceManager = instanceManager;
            },
            setCameraPos : function (position) {
                this.position = position;
            },
            collectMeshes : function() {
                var meshesList = [];
                for (var i = 0; i < this.m2Objects.length; i++) {
                    var meshes = this.m2Objects[i].getMeshesToRender();
                    meshesList = meshesList.concat(meshes);
                }

                //Filter transparent and non tranparent meshes
                var nonTrasparentMeshes = meshesList.filter(function(a){
                    return a && !a.isTransparent;
                });
                var transparentMeshes = meshesList.filter(function (a){
                    return a && a.isTransparent;
                });

                //TODO: figure out how instancing and mesh sorting shall meet the "from farthest to nearest" requirement for tranparent meshes
                //Sort meshes
                nonTrasparentMeshes.sort(function(a, b){
                    return a.m2Object == b.m2Object ? 0 : 1;
                });
                nonTrasparentMeshes.sort(function(a, b){
                    return (a.m2Object == b.m2Object && a.skin == b.skin) ? 0 : 1;
                });
                nonTrasparentMeshes.sort(function(a, b){
                    return (a.m2Object == b.m2Object && a.skin == b.skin && a.meshIndex == b.meshIndex) ? 0 : b.meshIndex- a.meshIndex;
                });

                transparentMeshes.sort(function(a, b){

                });

                this.nonTransparentM = nonTrasparentMeshes;
                this.transparentM = transparentMeshes;
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

                //Sort every 500 ms
                if (this.currentTime + deltaTime - this.lastTimeSort  > 500) {
                    var self = this;
                    //Sort by m2 and skin files and collect it into instances
                    this.m2Objects.sort(function (a, b) {
                        return a.getFileNameIdent() < b.getFileNameIdent() ? -1 :
                            (a.getFileNameIdent() > b.getFileNameIdent() ? 1 : 0);
                    });

                    var lastObject = this.m2Objects[0];
                    var lastInstanced = false;
                    for (var j = 1; j < this.m2Objects.length-1; j++) {

                        var currentObject = this.m2Objects[j];
                        if (currentObject.getFileNameIdent() == lastObject.getFileNameIdent()) {
                            this.addM2ObjectToInstanceManager(lastObject);
                            lastInstanced = true;
                        } else if (lastInstanced) {
                            this.addM2ObjectToInstanceManager(lastObject);
                            lastInstanced = false;
                        }

                        lastObject = currentObject;
                    }

                    //Sort by distance
                    this.m2Objects.sort(function (a, b) {
                        return b.calcDistance(self.position) - a.calcDistance(self.position);
                    });


                }


                //N. Collect non transparent and transparent meshes
                //this.collectMeshes();

                this.currentTime = this.currentTime + deltaTime;
            },
            draw : function () {
                //1. Draw ADT
                this.sceneApi.shaders.activateAdtShader();
                for (var i = 0; i < this.adtObjects.length; i++){
                    this.adtObjects[i].draw();
                }

                //2. Draw WMO
                this.sceneApi.shaders.activateWMOShader();
                for (var i = 0; i < this.wmoObjects.length; i++) {
                    this.wmoObjects[i].draw();
                }

                //3. Draw background WDL

                //4. Draw skydom
                if (this.skyDom) {
                    this.skyDom.draw();
                }

                //5. Draw nontransparent meshes of m2
                this.sceneApi.shaders.activateWMOShader();
                for (var i = 0; i < this.m2Objects.length; i++) {
                    if (this.m2Objects[i].instanceManager) continue;
                    this.m2Objects[i].drawNonTransparentMeshes();
                }

                //6. Draw transparent meshes of m2
                for (var i = 0; i < this.m2Objects.length; i++) {
                    if (this.m2Objects[i].instanceManager) continue;
                    this.m2Objects[i].drawTransparentMeshes();
                }
            }
        };

        return GraphManager;
    }]);

})(window, jQuery);