
import adtObjectFactory from './../objects/adtObject.js';
import adtM2ObjectFactory from './../objects/adtM2Object.js';
import wmoM2ObjectFactory from '../objects/wmoM2Object.js';
import WorldMDXObject from '../objects/worldM2Object.js';
import WmoObject from '../objects/wmoObject.js';

import InstanceManager from './instanceManager.js';

import mathHelper from './../math/mathHelper.js';
import PortalCullingAlgo from './../math/portalCullingAlgo.js';

import config from './../../services/config.js';

import {mat4} from 'gl-matrix';


class GraphManager {
    constructor(sceneApi) {
        this.sceneApi = sceneApi;
        this.m2Objects = [];
        this.worldM2Objects = [];
        this.instanceMap = {};
        this.instanceList = [];
        this.wmoObjects = [];
        this.wmoRenderedThisFrame = [];

        this.uniqueIdM2Map = {};
        this.uniqueIdWmoMap = {};

        this.adtObjects = [];
        this.adtRenderedThisFrame = [];
        this.m2RenderedThisFrame = []
        this.skyDom = null;

        this.currentTime = 0;
        this.lastTimeSort = 0;
        this.lastTimeDistanceCalc = 0;
        this.lastInstanceCollect = 0;
        this.lastFogParamCheck = 0;

        this.globalM2Counter = 0;
        this.portalCullingAlgo = new PortalCullingAlgo()

        this.adtObjectsMap = new Array(64);
        for (var i = 0; i < 64; i++) {
            var map = new Array(64);
            this.adtObjectsMap[i] = map;
        }
    }

    /*
    * Function for adding a new geometry to scene
    * */
    loadWmoMap(modf) {
        this.isWmoMap = true;
        this.wmoMap = this.addWmoObject(modf);
    }
    addAdtM2Object(doodad) {
        if (this.uniqueIdM2Map[doodad.uniqueId]) {
            return this.uniqueIdM2Map[doodad.uniqueId];
        }

        var adtM2 = new adtM2ObjectFactory(this.sceneApi);
        adtM2.load(doodad, false);
        adtM2.sceneNumber = this.globalM2Counter++;

        this.m2Objects.push(adtM2);
        this.uniqueIdM2Map[doodad.uniqueId] = adtM2;
        return adtM2;
    }
    addWorldMDXObject(modelName, meshIds,replaceTextures) {
        var worldMdxObject = new WorldMDXObject(this.sceneApi);
        worldMdxObject.setLoadParams(modelName, 0, meshIds,replaceTextures);
        worldMdxObject.sceneNumber = this.globalM2Counter++;
        worldMdxObject.startLoading();
        worldMdxObject.setIsRendered(true);

        this.worldM2Objects.push(worldMdxObject);
        return worldMdxObject;
    }
    addWmoM2Object(doodadDef, placementMatrix, useLocalLighting) {
        var wmoM2Object = new wmoM2ObjectFactory(this.sceneApi);
        wmoM2Object.load(doodadDef, placementMatrix, useLocalLighting);

        wmoM2Object.sceneNumber = this.globalM2Counter++;
        this.m2Objects.push(wmoM2Object);

        return wmoM2Object;
    }
    addWmoObject(wmoDef) {
        if (this.uniqueIdWmoMap[wmoDef.uniqueId]) {
            return this.uniqueIdWmoMap[wmoDef.uniqueId];
        }

        var wmoObject = new WmoObject(this.sceneApi);
        wmoObject.setLoadingParam(wmoDef);

        this.wmoObjects.push(wmoObject);
        this.uniqueIdWmoMap[wmoDef.uniqueId] = wmoObject;

        return wmoObject;
    }

    addADTObject(x, y, fileName) {
        if (this.adtObjectsMap[x][y]) return;

        var adtObject = new adtObjectFactory(this.sceneApi);
        adtObject.load(fileName);

        this.adtObjectsMap[x][y] = adtObject;

        this.adtObjects.push(adtObject);
    }
    addM2ObjectToInstanceManager(m2Object, newBucket) {
        var fileIdent = m2Object.getFileNameIdent();
        var instanceManager = this.instanceMap[fileIdent];
        //1. Create Instance manager for this type of file if it was not created yet
        if (!instanceManager) {
            instanceManager = new InstanceManager(this.sceneApi);
            this.instanceMap[fileIdent] = instanceManager;
            this.instanceList.push(instanceManager);
        }

        //2. Add object to instance
        instanceManager.addMDXObject(m2Object, newBucket);

        //3. Assign instance to object
        m2Object.instanceManager = instanceManager;
    }

    /*
    * Local variables
    * */

    setCameraPos(position) {
        this.position = position;
    }
    setLookAtMat(lookAtMat) {
        this.lookAtMat = lookAtMat;
    }

    /*
    * Culling algorithms
    * */
    checkCulling(frustumMat, lookAtMat4) {
        var adtRenderedThisFrame = new Set();
        var m2RenderedThisFrame = new Set();
        var wmoRenderedThisFrame = new Set();

        if (this.currentInteriorGroup >= 0 && config.getUsePortalCulling()) {
            var combinedMat4 = mat4.create();
            mat4.multiply(combinedMat4, frustumMat, lookAtMat4);
            var frustumPlanes = mathHelper.getFrustumClipsFromMatrix(combinedMat4);
            mathHelper.fixNearPlane(frustumPlanes, this.position);

            //Travel through portals
            if (this.portalCullingAlgo.startTraversingFromInteriorWMO(this.currentWMO, this.currentInteriorGroup, this.position,
                lookAtMat4, frustumPlanes, m2RenderedThisFrame)) {

                wmoRenderedThisFrame.add(this.currentWMO);

                if (this.currentWMO.exteriorPortals.length > 0) {
                    this.checkExterior(frustumPlanes, lookAtMat4, 6,
                        m2RenderedThisFrame, wmoRenderedThisFrame, adtRenderedThisFrame);
                }
            }
        } else {
            /* 1. Extract planes */
            var combinedMat4 = mat4.create();
            mat4.multiply(combinedMat4, frustumMat, lookAtMat4);
            var frustumPlanes = mathHelper.getFrustumClipsFromMatrix(combinedMat4);
            mathHelper.fixNearPlane(frustumPlanes, this.position);

            var points = mathHelper.getFrustumPoints(frustumMat, lookAtMat4);

            //Plain check for exterior
            this.checkExterior(frustumPlanes, lookAtMat4, 6,
                m2RenderedThisFrame, wmoRenderedThisFrame, adtRenderedThisFrame);
        }

        //Add WorldObjects
        for (var i = 0; i < this.worldM2Objects.length; i++) {
            var m2Object = this.worldM2Objects[i];
            if(!m2Object ) return;

            var frustumResult = true;
            if( m2Object.loaded ) {
                var frustumResult = m2Object.checkFrustumCulling(this.position, frustumPlanes, 6);
            }


            if (frustumResult) {
                m2Object.setIsRendered(true);
                m2RenderedThisFrame.add(m2Object);
            }
        }


        this.adtRenderedThisFrame = Array.from(adtRenderedThisFrame);
        this.m2RenderedThisFrame = Array.from(m2RenderedThisFrame);
        this.wmoRenderedThisFrame = Array.from(wmoRenderedThisFrame);

        for (var i = 0; i < this.m2RenderedThisFrame.length; i++){
            this.m2RenderedThisFrame[i].setIsRendered(true)
        }
    }

    checkExterior(frustumPlanes, lookAtMat4, num_planes,
                  m2RenderedThisFrame, wmoRenderedThisFrame, adtRenderedThisFrame) {
        var self = this;
        /* 3. Check frustum for graphs */
        var m2ObjectsCandidates = new Set();
        var wmoCandidates = new Set();

        if (!this.isWmoMap) {
            //3.1 if this is not WMO map iterate over ADTs
            var adt_x = Math.floor((32 - (this.position[1] / 533.33333)));
            var adt_y = Math.floor((32 - (this.position[0] / 533.33333)));

            for (var i = adt_x-1; i <= adt_x+1; i++) {
                for (var j = adt_y-1; j <= adt_y+1; j++) {
                    if ((i < 0) || (i > 64)) continue;
                    if ((j < 0) || (j > 64)) continue;
                    var adtObject = this.adtObjectsMap[i][j];
                    if (adtObject) {
                        var result = adtObject.checkFrustumCulling(this.position, frustumPlanes, lookAtMat4, num_planes, m2ObjectsCandidates, wmoCandidates);
                        if (result) {
                            adtRenderedThisFrame.add(adtObject);
                        }
                    }
                }
            }
        } else {
            wmoCandidates.add(this.wmoMap);
        }

        //3.2 Iterate over all global WMOs and M2s (they have uniqueIds)
        m2ObjectsCandidates.forEach(function(value) {
            var m2Object = value;
            if(!m2Object ) return;

            var frustumResult = m2Object.checkFrustumCulling(self.position, frustumPlanes, num_planes);
            if (frustumResult) {
                m2Object.setIsRendered(true);
                m2RenderedThisFrame.add(m2Object);
            }
        });

        wmoCandidates.forEach(function(value) {
            var wmoObject = value;
            if(!wmoObject) return;
            if(wmoRenderedThisFrame.has(value)) return;
            if (!wmoObject.loaded) {
                wmoRenderedThisFrame.add(wmoObject);
                return
            }

            if (wmoObject.wmoObj.nPortals != 0 && config.getUsePortalCulling()) {
                if(self.portalCullingAlgo.startTraversingFromExterior(wmoObject, self.position,
                        lookAtMat4, frustumPlanes, m2RenderedThisFrame)){
                    wmoRenderedThisFrame.add(wmoObject);
                }
            } else {
                if (wmoObject.checkFrustumCulling(self.position, frustumPlanes, num_planes, m2RenderedThisFrame)) {
                    wmoRenderedThisFrame.add(wmoObject);
                }
            }
        });

    }

    sortGeometry(frustumMat, lookAtMat4) {
        for (var j = 0; j < this.m2RenderedThisFrame.length; j++) {
            this.m2RenderedThisFrame[j].sortMaterials(lookAtMat4);
        }
    }

    /*
     * Update function
     * */
    sortM2 (a, b) {
        return b.getCurrentDistance() - a.getCurrentDistance() > 0 ? 1 : -1;
    }
    update(deltaTime) {
        //1. Update all wmo and m2 objects
        var i;

        if (config.getRenderM2()) {
            for (i = 0; i < this.m2RenderedThisFrame.length; i++) {
                this.m2RenderedThisFrame[i].update(deltaTime, this.position, this.lookAtMat);
            }
        }

        for (i = 0; i < this.wmoRenderedThisFrame.length; i++) {
            this.wmoRenderedThisFrame[i].update(deltaTime);
        }

        //2. Calc distance every 100 ms
        if (this.currentTime + deltaTime - this.lastTimeDistanceCalc > 100) {
            for (var j = 0; j < this.m2RenderedThisFrame.length; j++) {
                //if (this.m2Objects[j].getIsRendered()) {
                this.m2RenderedThisFrame[j].calcDistance(this.position);
                //}
            }

            this.lastTimeDistanceCalc = this.currentTime;
        }

        //3. Sort m2 by distance every 100 ms
        if (this.currentTime + deltaTime - this.lastTimeSort > 100) {
            this.m2RenderedThisFrame.sort(this.sortM2);

            this.lastTimeSort = this.currentTime;
        }

        //4. Collect m2 into instances every 200 ms


//        if (this.currentTime + deltaTime - this.lastInstanceCollect > 30) {
            var map = {};
            if (this.sceneApi.extensions.getInstancingExt()) {
                for (var j = 0; j < this.m2RenderedThisFrame.length; j++) {
                    var m2Object = this.m2RenderedThisFrame[j];

                    if (!m2Object.m2Geom) continue;
                    if (m2Object.getHasBillboarded() || !m2Object.getIsInstancable()) continue;
                    if (!m2Object.getIsRendered()) continue;

                    var fileIdent = m2Object.getFileNameIdent();

                    if (map[fileIdent] != undefined) {
                        this.addM2ObjectToInstanceManager(m2Object);
                        if (!map[fileIdent].instanceManager) {
                            this.addM2ObjectToInstanceManager(map[fileIdent]);
                        }
                    } else {
                        map[fileIdent] = m2Object;
                    }
                }
            }

            //4.1 Update placement matrix buffers in Instance
            for (var j = 0; j < this.instanceList.length; j++) {
                var instanceManager = this.instanceList[j];
                instanceManager.updatePlacementVBO();
            }

            this.lastInstanceCollect = this.currentTime;
  //      }


        //5. Check what WMO instance we're in
        this.currentInteriorGroup = -1;
        this.currentWMO = null;
        var bspNodeId = -1;
        var interiorGroupNum = -1;
        for (var i = 0; i < this.wmoObjects.length; i++) {
            var result = this.wmoObjects[i].isInsideInterior(this.position);
            interiorGroupNum = result.groupId;

            if (interiorGroupNum >= 0) {
                this.currentWMO = this.wmoObjects[i];
                this.currentInteriorGroup = interiorGroupNum;
                bspNodeId = result.nodeId;
                break;
            }
        }

        //6. Check fog color every 2 seconds
        if (this.currentTime + deltaTime - this.lastFogParamCheck > 2000) {
            this.lastFogParamCheck = this.currentTime;
        }

        this.currentTime = this.currentTime + deltaTime;
        return {interiorGroupNum: interiorGroupNum, nodeId: bspNodeId};
    }

    /*
    * Draw functions
    * */

    drawExterior() {
        //1. Draw ADT

        if (config.getRenderAdt()) {
            this.sceneApi.shaders.activateAdtShader();
            for (var i = 0; i < this.adtRenderedThisFrame.length; i++) {
                this.adtRenderedThisFrame[i].draw();
            }
        }


        //2.0. Draw WMO bsp highlighted vertices
        if (config.getRenderBSP()) {
            this.sceneApi.shaders.activateDrawPortalShader();
            for (var i = 0; i < this.wmoRenderedThisFrame.length; i++) {
                this.wmoRenderedThisFrame[i].drawBspVerticles();
            }
        }

        //2. Draw WMO
        this.sceneApi.shaders.activateWMOShader();
        for (var i = 0; i < this.wmoRenderedThisFrame.length; i++) {
            if (config.getUsePortalCulling()) {
                this.wmoRenderedThisFrame[i].drawPortalBased(false)
            } else {
                this.wmoRenderedThisFrame[i].draw();
            }
        }
        this.sceneApi.shaders.deactivateWMOShader();


        //3. Draw background WDL

        //4. Draw skydom
        if (this.skyDom) {
            this.skyDom.draw();
        }

        //7.1 Draw WMO BBs
        this.sceneApi.shaders.activateBoundingBoxShader();
        if (config.getDrawWmoBB()) {
            for (var i = 0; i < this.wmoRenderedThisFrame.length; i++) {
                this.wmoRenderedThisFrame[i].drawBB();
            }
        }

        /*
         this.sceneApi.shaders.activateFrustumBoxShader();
         //Draw Wmo portal frustums
         for (var i = 0; i < this.wmoObjects.length; i++) {
         this.wmoObjects[i].drawPortalFrustumsBB();
         }
         */
    }
    drawM2s(){
        //5. Draw nontransparent meshes of m2
        if (config.getRenderM2()) {
            var lastWasDrawInstanced = false;
            this.sceneApi.shaders.activateM2Shader();
            for (var i = 0; i < this.m2RenderedThisFrame.length; i++) {
                var m2Object = this.m2RenderedThisFrame[i];
                if (this.m2OpaqueRenderedThisFrame[m2Object.sceneNumber]) continue;
                if (!m2Object.getIsRendered()) continue;

                if (m2Object.instanceManager) {
                    if (!lastWasDrawInstanced) {
                        this.sceneApi.shaders.activateM2InstancingShader();
                    }

                    m2Object.instanceManager.drawInstancedNonTransparentMeshes(this.m2OpaqueRenderedThisFrame)
                    lastWasDrawInstanced = true;
                } else {
                    if (lastWasDrawInstanced) {
                        this.sceneApi.shaders.deactivateM2InstancingShader();
                        this.sceneApi.shaders.activateM2Shader();
                    }

                    this.m2OpaqueRenderedThisFrame[m2Object.sceneNumber] = true;
                    m2Object.drawNonTransparentMeshes();
                    lastWasDrawInstanced = false;
                }
            }
            if (lastWasDrawInstanced) {
                this.sceneApi.shaders.deactivateM2InstancingShader();
            } else {
                this.sceneApi.shaders.deactivateM2Shader();
            }
        }

        //6. Draw transparent meshes of m2
        if (config.getRenderM2()) {
            var lastWasDrawInstanced = false;
            this.sceneApi.shaders.activateM2Shader();
            for (var i = this.m2RenderedThisFrame.length-1; i >= 0; i--) {
                var m2Object = this.m2RenderedThisFrame[i];
                if (this.m2TranspRenderedThisFrame[m2Object.sceneNumber]) continue;
                if (!m2Object.getIsRendered()) continue;

                if (m2Object.instanceManager) {
                    if (!lastWasDrawInstanced) {
                        this.sceneApi.shaders.activateM2InstancingShader();
                    }

                    m2Object.instanceManager.drawInstancedTransparentMeshes(this.m2TranspRenderedThisFrame)
                    lastWasDrawInstanced = true;
                } else {
                    if (lastWasDrawInstanced) {
                        this.sceneApi.shaders.deactivateM2InstancingShader();
                        this.sceneApi.shaders.activateM2Shader();
                    }

                    this.m2TranspRenderedThisFrame[m2Object.sceneNumber] = true;
                    m2Object.drawTransparentMeshes();
                    lastWasDrawInstanced = false;
                }
            }
            if (lastWasDrawInstanced) {
                this.sceneApi.shaders.deactivateM2InstancingShader();
            } else {
                this.sceneApi.shaders.deactivateM2Shader();
            }
        }


        //7. Draw BBs
        this.sceneApi.shaders.activateBoundingBoxShader();
        //7.1 Draw M2 BBs
        if (config.getDrawM2BB()) {
            for (var i = 0; i < this.m2RenderedThisFrame.length; i++) {
                if (!this.m2RenderedThisFrame[i].getIsRendered()) continue;

                this.m2RenderedThisFrame[i].drawBB();
            }
        }
    }
    draw() {
        this.m2OpaqueRenderedThisFrame = {};
        this.m2TranspRenderedThisFrame = {};

        if (this.currentWMO && config.getUsePortalCulling()) {
            this.sceneApi.shaders.activateWMOShader();
            this.currentWMO.drawPortalBased(true);
            this.sceneApi.shaders.deactivateWMOShader();

            if (this.currentWMO.exteriorPortals.length > 0) {
                this.drawExterior()
            }
            //6. Draw WMO portals
            if (config.getRenderPortals()) {
                this.sceneApi.shaders.activateDrawPortalShader();
                for (var i = 0; i < this.wmoRenderedThisFrame.length; i++) {
                    this.wmoRenderedThisFrame[i].drawPortals();
                }
            }
            this.drawM2s();

            this.sceneApi.shaders.activateFrustumBoxShader();
            //Draw Wmo portal frustums
            if (this.sceneApi.getIsDebugCamera()) {
                this.sceneApi.drawCamera()
            }
        } else {
            this.drawExterior();
            this.drawM2s();

            //6. Draw WMO portals
            if (config.getRenderPortals()) {
                this.sceneApi.shaders.activateDrawPortalShader();
                for (var i = 0; i < this.wmoRenderedThisFrame.length; i++) {
                    this.wmoRenderedThisFrame[i].drawPortals();
                }
            }
            this.sceneApi.shaders.activateFrustumBoxShader();
            //Draw Wmo portal frustums
            if (this.sceneApi.getIsDebugCamera()) {
                this.sceneApi.drawCamera()
            }
        }
    }
}

export default GraphManager;