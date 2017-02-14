
import adtObjectFactory from './../objects/adtObject.js';
import adtM2ObjectFactory from './../objects/adtM2Object.js';
import wmoM2ObjectFactory from '../objects/wmoM2Object.js';
import WorldMDXObject from '../objects/worldM2Object.js';
import WmoObject from '../objects/wmoObject.js';

import InstanceManager from './instanceManager.js';

import mathHelper from './../math/mathHelper.js';
import ConvexHullGrahamScan from './../math/grahamScan';
import PortalCullingAlgo from './../math/portalCullingAlgo.js';

import config from './../../services/config.js';

import {mat4, vec4, vec3} from 'gl-matrix';


class GraphManager {
    constructor(sceneApi) {
        this.sceneApi = sceneApi;
        this.m2Objects = [];
        this.worldM2Objects = [];
        this.instanceMap = new Map();
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
    setM2Scene(value) {
        this.isM2Scene = value
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
    addWorldMDXObject(modelName, meshIds, replaceTextures) {
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
        //1. Create Instance manager for this type of file if it was not created yet
        var instanceManager = null;
        if (!this.instanceMap.has(fileIdent)) {
            instanceManager = new InstanceManager(this.sceneApi);
            this.instanceMap.set(fileIdent, instanceManager);
            this.instanceList.push(instanceManager);
        } else {
            instanceManager = this.instanceMap.get(fileIdent);
        }

        //2. Add object to instance
        instanceManager.addMDXObject(m2Object, newBucket);
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

        var combinedMat4 = mat4.create();
        mat4.multiply(combinedMat4, frustumMat, lookAtMat4);
        var frustumPlanes = mathHelper.getFrustumClipsFromMatrix(combinedMat4);
        mathHelper.fixNearPlane(frustumPlanes, this.position);

        //var frustumPoints = mathHelper.calculateFrustumPoints(frustumPlanes,6);
        var frustumPoints = mathHelper.calculateFrustumPointsFromMat(combinedMat4)

        //Create hull for 2d projection
        var convexHull = new ConvexHullGrahamScan();
        for (var i = 0; i < frustumPoints.length; i++) {
            convexHull.addPoint(frustumPoints[i][0], frustumPoints[i][1]);
        }
        var hullPoints = convexHull.getHull();
        var hullLines = [];

        var centerX = 0, centerY = 0;
        for (var i = 0; i< hullPoints.length; i++) {
            centerX += hullPoints[i].x;
            centerY += hullPoints[i].y;
        }
        var centerX = centerX / hullPoints.length;
        var centerY = centerY / hullPoints.length;
        var center = {x : centerX, y: centerY};
        hullPoints.sort(function(a,b) {
            if (a.x - center.x >= 0 && b.x - center.x < 0)
                return true;
            if (a.x - center.x < 0 && b.x - center.x >= 0)
                return false;
            if (a.x - center.x == 0 && b.x - center.x == 0) {
                if (a.y - center.y >= 0 || b.y - center.y >= 0)
                    return a.y > b.y;
                return b.y > a.y;
            }

            // compute the cross product of vectors (center -> a) x (center -> b)
            var det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);
            if (det < 0)
                return true;
            if (det > 0)
                return false;

            // points a and b are on the same line from the center
            // check which point is closer to the center
            var d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
            var d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);
            return d1 > d2;
        })


        if (hullPoints.length > 2) {
            this.hullPoints = hullPoints;
            for (var i = 0; i < hullPoints.length - 1; i++) {
                var index1 = i+1;
                var index2 = i;

                var line = [
                    hullPoints[index1].y - hullPoints[index2].y,
                    hullPoints[index2].x - hullPoints[index1].x,
                    -hullPoints[index1].y*(hullPoints[index2].x - hullPoints[index1].x) +
                    hullPoints[index1].x*( hullPoints[index2].y - hullPoints[index1].y)
                ];
                var normalLength = Math.sqrt(line[0]*line[0] + line[1]+line[1]);
                vec3.scale(line, line, 1/normalLength);

                hullLines.push(line)
            }

            var index1 = 0;
            var index2 = hullPoints.length - 1;
            var line = [
                hullPoints[index1].y - hullPoints[index2].y,
                hullPoints[index2].x - hullPoints[index1].x,
                -hullPoints[index1].y*(hullPoints[index2].x - hullPoints[index1].x) +
                hullPoints[index1].x*( hullPoints[index2].y - hullPoints[index1].y)
            ];
            var normalLength = Math.sqrt(line[0]*line[0] + line[1]+line[1]);
            vec3.scale(line, line, 1/normalLength);

            hullLines.push(line)

        } else {
            console.log("invalid number of hullPoints")
        }


        if (this.currentInteriorGroups != null && config.getUsePortalCulling()) {
            //Travel through portals
            if (this.portalCullingAlgo.startTraversingFromInteriorWMO(this.currentWMO, this.currentInteriorGroups, this.position,
                lookAtMat4, frustumPlanes, m2RenderedThisFrame)) {

                wmoRenderedThisFrame.add(this.currentWMO);

                if (this.currentWMO.exteriorPortals.length > 0) {
                    this.checkExterior(frustumPlanes, 6, frustumPoints, hullLines, lookAtMat4,
                        m2RenderedThisFrame, wmoRenderedThisFrame, adtRenderedThisFrame);
                }
            }
        } else {
            //Plain check for exterior
            this.checkExterior(frustumPlanes, 6, frustumPoints, hullLines, lookAtMat4,
                m2RenderedThisFrame, wmoRenderedThisFrame, adtRenderedThisFrame);
        }

        //Add WorldObjects
        for (var i = 0; i < this.worldM2Objects.length; i++) {
            var m2Object = this.worldM2Objects[i];
            if(!m2Object ) return;

            var frustumResult = true;
            if( m2Object.loaded ) {
                frustumResult = m2Object.checkFrustumCulling(this.position, frustumPlanes, 6, frustumPoints);
            }

            if (frustumResult) {
                m2Object.setIsRendered(true);
                m2RenderedThisFrame.add(m2Object);
            }
        }

        this.adtRenderedThisFrame = Array.from(adtRenderedThisFrame);
        this.m2RenderedThisFrame = Array.from(m2RenderedThisFrame);
        this.wmoRenderedThisFrame = Array.from(wmoRenderedThisFrame);

        this.m2RenderedThisFrame = this.m2RenderedThisFrame.filter(function(a){
            if (!a.loaded && !a.loading) {
                a.startLoading();
            }
            return a.loaded;
        })
    }

    checkExterior(frustumPlanes, num_planes, frustumPoints, hullLines, lookAtMat4,
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
                        var result = adtObject.checkFrustumCulling(this.position, frustumPlanes, num_planes, frustumPoints,
                            hullLines,
                            lookAtMat4, m2ObjectsCandidates, wmoCandidates);
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

            var frustumResult = m2Object.checkFrustumCulling(self.position, frustumPlanes, num_planes, frustumPoints);
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
                if (wmoObject.checkFrustumCulling(self.position, frustumPlanes, num_planes, frustumPoints, m2RenderedThisFrame)) {
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
                var m2Object = this.m2RenderedThisFrame[i];
                m2Object.update(deltaTime, this.position, this.lookAtMat);
                if (this.isM2Scene && m2Object.objectUpdate) {
                    m2Object.objectUpdate(deltaTime, this.position, this.lookAtMat);
                }
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
            var map = new Map();
            if (this.sceneApi.extensions.getInstancingExt()) {
                //Clear instance lists
                for (var j = 0; j < this.instanceList.length; j++) {
                    this.instanceList[j].clearList();
                }

                for (var j = 0; j < this.m2RenderedThisFrame.length; j++) {
                    var m2Object = this.m2RenderedThisFrame[j];

                    if (!m2Object.m2Geom) continue;
                    if (m2Object.getHasBillboarded() || !m2Object.getIsInstancable()) continue;
                    if (!m2Object.getIsRendered()) continue;

                    var fileIdent = m2Object.getFileNameIdent();

                    if (map.has(fileIdent)) {
                        var m2ObjectInstanced = map.get(fileIdent);
                        this.addM2ObjectToInstanceManager(m2Object);
                        this.addM2ObjectToInstanceManager(m2ObjectInstanced);
                    } else {
                        map.set(fileIdent, m2Object);
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


        //5. Get adtChunk we're in
        var mcnkChunk = null;
        if (!this.isWmoMap) {
            var adt_x = Math.floor((32 - (this.position[1] / 533.33333)));
            var adt_y = Math.floor((32 - (this.position[0] / 533.33333)));

            for (var i = adt_x - 1; i <= adt_x + 1; i++) {
                for (var j = adt_y - 1; j <= adt_y + 1; j++) {
                    if ((i < 0) || (i > 64)) continue;
                    if ((j < 0) || (j > 64)) continue;
                    var adtObject = this.adtObjectsMap[i][j];
                    if (adtObject) {
                        mcnkChunk = adtObject.getMCNKCameraIsOn(this.position);
                        if (mcnkChunk) break;
                    }
                }
                if (mcnkChunk) break;
            }
        }

        //6. Check what WMO instance we're in
        this.currentInteriorGroups = null;
        this.currentWMO = null;

        var bspNodeId = -1;
        var interiorGroupNum = -1;
        var currentWmoGroup = -1;
        for (var i = 0; i < this.wmoObjects.length; i++) {
            var checkingWmoObj = this.wmoObjects[i];
            var result = checkingWmoObj.getGroupWmoThatCameraIsInside(this.position);

            if (result) {
                this.currentWMO = checkingWmoObj;
                currentWmoGroup = result.groupId;
                if (checkingWmoObj.isGroupWmoInterior(result.groupId)) {
                    this.currentInteriorGroups = [result];
                    interiorGroupNum = result.groupId;
                } else {
                }

                bspNodeId = result.nodeId;
                break;
            }
        }

        //7. Get AreaId and Area Name
        var currentAreaName = '';
        var wmoAreaTableDBC = this.sceneApi.dbc.getWmoAreaTableDBC();
        var areaTableDBC = this.sceneApi.dbc.getAreaTableDBC();
        var areaRecord = null;
        if (wmoAreaTableDBC && areaTableDBC) {
            if (this.currentWMO) {
                var wmoFile = this.currentWMO.wmoObj;
                var wmoId = wmoFile.wmoId;
                var wmoGroupId = this.currentWMO.wmoGroupArray[currentWmoGroup].wmoGeom.wmoGroupFile.mogp.groupID;
                var nameSetId = this.currentWMO.nameSet;

                var wmoAreaTableRecord = wmoAreaTableDBC.findRecord(wmoId, nameSetId, wmoGroupId);
                if (wmoAreaTableRecord) {
                    var areaRecord = areaTableDBC[wmoAreaTableRecord.areaId];
                    if (wmoAreaTableRecord) {
                        if (wmoAreaTableRecord.name == '') {
                            var areaRecord = areaTableDBC[wmoAreaTableRecord.areaId];
                            if (areaRecord) {
                                currentAreaName = areaRecord.name
                            }
                        } else {
                            currentAreaName = wmoAreaTableRecord.name;
                        }
                    }
                }
            }
            if (currentAreaName == '' && mcnkChunk) {
                var areaRecord = areaTableDBC[mcnkChunk.areaId];
                if (areaRecord) {
                    currentAreaName = areaRecord.name
                }
            }
        }

        //8. Check fog color every 2 seconds
        var fogRecordWasFound = false;
        if (this.currentTime + deltaTime - this.lastFogParamCheck > 2000) {
            if (this.currentWMO) {
                var wmoFile = this.currentWMO.wmoObj;
                var cameraLocal = vec4.create();
                vec4.transformMat4(cameraLocal, this.position, this.currentWMO.placementInvertMatrix);

                for (var i = wmoFile.mfogArray.length-1; i >= 0; i--) {
                    var fogRecord = wmoFile.mfogArray[i];
                    var fogPosVec = vec4.fromValues(fogRecord.pos.x,fogRecord.pos.y,fogRecord.pos.z,1);

                    var distanceToFog = vec4.distance(fogPosVec, cameraLocal);
                    if ((distanceToFog < fogRecord.larger_radius) /*|| fogRecord.larger_radius == 0*/) {
                        this.sceneApi.setFogColor(fogRecord.fog_colorF);
                        //this.sceneApi.setFogStart(wmoFile.mfog.fog_end);
                        this.sceneApi.setFogEnd(fogRecord.fog_end);
                        fogRecordWasFound = true;
                        break;
                    }
                }
            }
            var lightIntBandDBC = this.sceneApi.dbc.getLightIntBandDBC();
            if (!fogRecordWasFound && lightIntBandDBC) {
                //Check areaRecord
                /*
                //It's always 0 in WotLK
                if (areaRecord && lightTableDBC) {
                    var lightRecord = lightTableDBC[areaRecord.lightId];
                }
                */
                //Query Light Record
                var result = this.sceneApi.findLightRecord(this.position);
                if (result && result.length > 0) {
                    result.sort(function(a,b){
                        if (a.distance < b.distance) return -1;
                        if (a.distance > b.distance) return 1;
                        return 0;
                    });
                    var fogIntRec = lightIntBandDBC[result[0].record.skyAndFog*18 - 17 + 7];
                    this.sceneApi.setFogColor(fogIntRec.floatValues[0]);

                    //Take fog params from here

                }

            }
            this.lastFogParamCheck = this.currentTime;
        }
        this.currentTime += deltaTime;


        return {interiorGroupNum: interiorGroupNum, nodeId: bspNodeId, currentAreaName: currentAreaName};
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
                 var fileIdent = m2Object.getFileNameIdent();

                var drawInstanced = false;
                if (this.instanceMap.has(fileIdent)) {
                    var instanceManager = this.instanceMap.get(fileIdent);
                    drawInstanced = instanceManager.mdxObjectList.length > 1;
                }
                if (drawInstanced) {
                    if (!lastWasDrawInstanced) {
                        this.sceneApi.shaders.activateM2InstancingShader();
                    }

                    instanceManager.drawInstancedNonTransparentMeshes(this.m2OpaqueRenderedThisFrame);
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
                var fileIdent = m2Object.getFileNameIdent();

                var drawInstanced = false;
                if (this.instanceMap.has(fileIdent)) {
                    var instanceManager = this.instanceMap.get(fileIdent);
                    drawInstanced = instanceManager.mdxObjectList.length > 1;
                }
                if (drawInstanced) {
                    if (!lastWasDrawInstanced) {
                        this.sceneApi.shaders.activateM2InstancingShader();
                    }

                    instanceManager.drawInstancedTransparentMeshes(this.m2TranspRenderedThisFrame);
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

        if (this.currentWMO && this.currentInteriorGroups != null && config.getUsePortalCulling()) {
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

        //Debug
        /*
        this.sceneApi.shaders.activateDrawLinesShader();
        this.sceneApi.drawLines(this.hullPoints);
          */

    }
}

export default GraphManager;