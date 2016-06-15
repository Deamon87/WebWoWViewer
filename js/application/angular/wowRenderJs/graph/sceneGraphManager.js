
import adtObjectFactory from './../objects/adtObject.js';
import adtM2ObjectFactory from './../objects/adtM2Object.js';
import wmoM2ObjectFactory from './../objects/wmoM2ObjectFactory.js';
import wmoObjectFactory from './../objects/wmoObjectFactory.js';

import mathHelper from './../math/mathHelper.js';
import PortalCullingAlgo from './../math/portalCullingAlgo.js';

import config from './../../services/config.js';

import {mat4} from 'gl-matrix';



class InstanceManager {
    constructor(sceneApi) {
        this.sceneApi = sceneApi;
        this.mdxObjectList = [];
        this.sceneObjNumMap = {};
        this.lastUpdatedNumber = 0;
    }

    addMDXObject(MDXObject) {
        if (this.sceneObjNumMap[MDXObject.sceneNumber]) return; // The object has already been added to this manager

        this.sceneObjNumMap[MDXObject.sceneNumber] = MDXObject;
        this.mdxObjectList.push(MDXObject);
    }
    updatePlacementVBO() {
        var gl = this.sceneApi.getGlContext();

        //var buffer = new Array(this.mdxObjectList.length * 16);
        var permanentBuffer = this.permanentBuffer;
        if (!permanentBuffer || permanentBuffer.length != this.mdxObjectList.length * 16) {
            permanentBuffer = new Float32Array(this.mdxObjectList.length * 16);
            this.permanentBuffer = permanentBuffer;
        }

        var paramsVbo = this.placementVBO;
        if (!paramsVbo) {
            paramsVbo = gl.createBuffer();
        }

        for (var i = 0; i < this.mdxObjectList.length; i++) {
            var mdxObject = this.mdxObjectList[i];
            var placementMatrix = mdxObject.placementMatrix;
            //for (var j = 0; j < 16; j++) {
            //    buffer[i*16+j] = placementMatrix[j];
            //}
            //gl.bufferSubData( gl.ARRAY_BUFFER, i*16, placementMatrix);
            permanentBuffer.set(placementMatrix, i * 16);

        }

        gl.bindBuffer(gl.ARRAY_BUFFER, paramsVbo);
        gl.bufferData(gl.ARRAY_BUFFER, permanentBuffer, gl.DYNAMIC_DRAW);
        this.placementVBO = paramsVbo;
        this.lastUpdatedNumber = this.mdxObjectList.length;
    }
    drawInstancedNonTransparentMeshes(opaqueMap) {
        if (!this.mdxObjectList[0]) return;
        for (var i = 0; i < this.mdxObjectList.length; i++) {
            opaqueMap[this.mdxObjectList[i].sceneNumber] = true;
        }

        this.mdxObjectList[0].drawInstancedNonTransparentMeshes(this.lastUpdatedNumber, this.placementVBO, this.dinamycParams);
    }
    drawInstancedTransparentMeshes(transparentMap) {
        if (!this.mdxObjectList[0]) return;
        for (var i = 0; i < this.mdxObjectList.length; i++) {
            transparentMap[this.mdxObjectList[i].sceneNumber] = true;
        }

        this.mdxObjectList[0].drawInstancedTransparentMeshes(this.lastUpdatedNumber, this.placementVBO, this.dinamycParams);
    }
}


class GraphManager {
    constructor(sceneApi) {
        this.sceneApi = sceneApi;
        this.m2Objects = [];
        this.instanceList = {};
        this.wmoObjects = [];
        this.adtObjects = [];
        this.skyDom = null;
        this.currentTime = 0;
        this.lastTimeSort = 0;
        this.globalM2Counter = 0;
        this.portalCullingAlgo = new PortalCullingAlgo()
    }

    /*
    * Function for adding a new geometry to scene
    * */
    addAdtM2Object(doodad) {
        var adtM2 = new adtM2ObjectFactory(this.sceneApi);
        adtM2.load(doodad, false);
        adtM2.sceneNumber = this.globalM2Counter++;
        this.m2Objects.push(adtM2);
        return adtM2;
    }
    addWmoM2Object(doodadDef, placementMatrix, useLocalLighting) {
        var wmoM2Object = new wmoM2ObjectFactory(this.sceneApi);
        var promise = wmoM2Object.load(doodadDef, placementMatrix, useLocalLighting);

        wmoM2Object.sceneNumber = this.globalM2Counter++;
        this.m2Objects.push(wmoM2Object);

        return promise.then(function success() {
            return wmoM2Object;
        }, function error() {
        });
    }
    addWmoObject(wmoDef) {
        var wmoObject = new wmoObjectFactory(this.sceneApi);
        wmoObject.load(wmoDef);
        this.wmoObjects.push(wmoObject);
        return wmoObject;
    }
    addADTObject(fileName) {
        var adtObject = new adtObjectFactory(this.sceneApi);
        adtObject.load(fileName);
        this.adtObjects.push(adtObject);
    }
    addM2ObjectToInstanceManager(m2Object, newBucket) {
        var fileIdent = m2Object.getFileNameIdent();
        var instanceManager = this.instanceList[fileIdent];
        //1. Create Instance manager for this type of file if it was not created yet
        if (!instanceManager) {
            instanceManager = new InstanceManager(this.sceneApi);
            this.instanceList[fileIdent] = instanceManager;
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
        if (this.currentInteriorGroup >= 0 && config.getUsePortalCulling()) {
            //TODO: set not render for adt too
            for (var j = 0; j < this.m2Objects.length; j++) {
                this.m2Objects[j].setIsRendered(false);
            }

            //Cull with normal portals
            //this.checkNormalFrustumCulling(frustumMat, lookAtMat4);

            var combinedMat4 = mat4.create();
            mat4.multiply(combinedMat4, frustumMat, lookAtMat4);
            var frustumPlanes = mathHelper.getFrustumClipsFromMatrix(combinedMat4);
            mathHelper.fixNearPlane(frustumPlanes, this.position);

            //Travel through portals
            this.portalCullingAlgo.startTraversingFromInteriorWMO(this.currentWMO, this.currentInteriorGroup, this.position, frustumMat, lookAtMat4, frustumPlanes);

            if (this.currentWMO.exteriorPortals.length > 0) {
                for (var j = 0; j < this.m2Objects.length; j++) {
                    this.m2Objects[j].setIsRendered(true);
                }
                this.portalCullingAlgo.checkAllDoodads(this.currentWMO, this.position);

                this.checkNormalFrustumCulling(frustumMat, lookAtMat4);
            } else {
                this.portalCullingAlgo.checkAllDoodads(this.currentWMO, this.position);
            }

        } else {
            for (var j = 0; j < this.m2Objects.length; j++) {
                this.m2Objects[j].setIsRendered(true);
            }
            this.checkNormalFrustumCulling(frustumMat, lookAtMat4);
        }

    }
    checkNormalFrustumCulling(frustumMat, lookAtMat4) {
        /*1. Extract planes */
        var combinedMat4 = mat4.create();
        mat4.multiply(combinedMat4, frustumMat, lookAtMat4);
        var frustumPlanes = mathHelper.getFrustumClipsFromMatrix(combinedMat4);
        mathHelper.fixNearPlane(frustumPlanes, this.position);

        /* 1. First check wmo's */
        /* Checking group wmo will significatly decrease the amount of m2wmo */
        for (var i = 0; i < this.wmoObjects.length; i++) {
            this.wmoObjects[i].resetDrawnForAllGroups(true);
            if (config.getUsePortalCulling() && this.wmoObjects[i].hasPortals()) {
                if (this.currentInteriorGroup >= 0 && this.currentWMO == this.wmoObjects[i]) continue;

                this.portalCullingAlgo.startTraversingFromExterior(this.wmoObjects[i], this.position, frustumMat, lookAtMat4, frustumPlanes);
                this.portalCullingAlgo.checkAllDoodads(this.wmoObjects[i], this.position);
                //this.wmoObjects[i].setIsRenderedForDoodads();
            } else {
                this.wmoObjects[i].checkFrustumCulling(this.position, frustumMat, lookAtMat4, frustumPlanes); //The travel through portals happens here too
                this.wmoObjects[i].setIsRenderedForDoodads();
            }
        }


        /* 3. Additionally check if distance to object is more than 100 time of it's diameter */
        for (var j = 0; j < this.m2Objects.length; j++) {
            var currentObj = this.m2Objects[j];
            if (currentObj.getIsRendered()) {
                currentObj.setIsRendered(currentObj.getDiameter() * 100 > currentObj.getCurrentDistance());
            }
        }

        /* 2. If m2Object is renderable after prev phase - check it against frustrum */
        for (var j = 0; j < this.m2Objects.length; j++) {
            if (this.m2Objects[j].getIsRendered()) {
                this.m2Objects[j].checkFrustumCullingAndSet(this.position, frustumPlanes, 6);
            }
        }

    }
    checkAgainstDepthBuffer(frustrumMat, lookAtMat4, depth, width, height) {
        //CompressDepthBuffer 8 times
        function getDepth(x, y) {
            var index = (y * width + x);
            var depth_val = 1.0 - (depth[index]);
            return depth_val;
        }

        var comp_w = Math.floor(width / 8);
        var comp_h = Math.floor(height / 8);
        var compressedDepth = new Float32Array(comp_w * comp_h);

        for (var x = 0; x < comp_w; x++) {
            var min_x1 = x * 8;
            var max_x1 = Math.min((x + 1) * 8, width);

            for (var y = 0; y < comp_h; y++) {
                var max_depth = 1.0;

                var min_y1 = y * 8;
                var max_y1 = Math.min((y + 1) * 8, height);

                for (var x1 = min_x1; x1 < max_x1; x1++) {
                    for (var y1 = min_y1; y1 < max_y1; y1++) {
                        max_depth = Math.min(getDepth(x1, y1), max_depth);
                    }
                }

                compressedDepth[x * comp_w + y] = max_depth;
            }
        }

        function getDepthComp(x, y) {
            var index = x * comp_w + y;
            var depth_val = compressedDepth[index];
            return depth_val;
        }

        function checkDepth(min_x, max_x, min_y, max_y, depth) {
            if (depth < 0)
                return false;

            min_x = (min_x + 1) / 2;
            max_x = (max_x + 1) / 2;
            min_y = (min_y + 1) / 2;
            max_y = (max_y + 1) / 2;

            min_x = Math.floor(min_x * comp_w);
            max_x = Math.floor(max_x * comp_w);

            min_y = Math.floor(min_y * comp_h);
            max_y = Math.floor(max_y * comp_h);

            var isInScreen = false;
            for (var x = min_x; x <= max_x; x++) {
                for (var y = min_y; y <= max_y; y++) {
                    if (getDepthComp(x, y) < depth) {
                        isInScreen = true;
                        return true;
                    }
                }
            }

            return false;
        }

        /* 1. If m2Object is renderable after frustrum culling - check it against depth checking*/
        for (var j = 0; j < this.m2Objects.length; j++) {
            if (this.m2Objects[j].getIsRendered()) {
                this.m2Objects[j].checkAgainstDepthBuffer(frustrumMat, lookAtMat4, checkDepth);
            }
        }
    }

    /*
     * Update function
     * */
    update(deltaTime) {
        //1. Update all wmo and m2 objects
        var i;
        if (config.getRenderM2()) {
            for (i = 0; i < this.m2Objects.length; i++) {
                this.m2Objects[i].update(deltaTime, this.position);
            }
        }

        for (i = 0; i < this.wmoObjects.length; i++) {
            this.wmoObjects[i].update(deltaTime);
        }

        //Sort every 500 ms
        if (this.currentTime + deltaTime - this.lastTimeSort > 500) {
            var self = this;
            //Sort by m2 and skin files and collect it into instances

            this.m2Objects.sort(function (a, b) {
                return a.getFileNameIdent() < b.getFileNameIdent() ? -1 :
                    (a.getFileNameIdent() > b.getFileNameIdent() ? 1 : 0);
            });


            var lastObject = this.m2Objects[0];
            var lastInstanced = false;
            for (var j = 1; j < this.m2Objects.length; j++) {

                var currentObject = this.m2Objects[j];
                var newBucket = !lastInstanced;
                if (currentObject.getFileNameIdent() == lastObject.getFileNameIdent()) {
                    this.addM2ObjectToInstanceManager(lastObject, newBucket);
                    lastInstanced = true;
                } else if (lastInstanced) {
                    this.addM2ObjectToInstanceManager(lastObject, newBucket);
                    lastInstanced = false;
                }

                lastObject = currentObject;
            }

            for (var j = 0; j < this.m2Objects.length; j++) {
                this.m2Objects[j].calcDistance(self.position);
            }

            //Sort by distance
            this.m2Objects.sort(function (a, b) {
                return b.getCurrentDistance() - a.getCurrentDistance() > 0 ? 1 : -1;
            });
        }
        //Update placement matrix buffers

        if (this.currentTime + deltaTime - this.lastTimeSort > 1000) {
            for (var fileIdent in this.instanceList) {
                var instanceManager = this.instanceList[fileIdent];
                instanceManager.updatePlacementVBO();
            }
        }


        //N. Collect non transparent and transparent meshes
        //this.collectMeshes();

        //Check what WMO instance we're in
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

        this.currentTime = this.currentTime + deltaTime;
        return {interiorGroupNum: interiorGroupNum, nodeId: bspNodeId};
    }

    /*
    * Draw functions
    * */

    drawExterior() {
        //1. Draw ADT
        this.sceneApi.shaders.activateAdtShader();
        for (var i = 0; i < this.adtObjects.length; i++) {
            this.adtObjects[i].draw();
        }

        //2.0. Draw WMO bsp highlighted vertices
        if (config.getRenderBSP()) {
            this.sceneApi.shaders.activateDrawPortalShader();
            for (var i = 0; i < this.wmoObjects.length; i++) {
                this.wmoObjects[i].drawBspVerticles();
            }
        }

        //2. Draw WMO
        this.sceneApi.shaders.activateWMOShader();
        for (var i = 0; i < this.wmoObjects.length; i++) {
            if (config.getUsePortalCulling()) {
                this.wmoObjects[i].drawPortalBased(false)
            } else {
                this.wmoObjects[i].draw();
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
            for (var i = 0; i < this.wmoObjects.length; i++) {
                this.wmoObjects[i].drawBB();
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
            for (var i = 0; i < this.m2Objects.length; i++) {
                var m2Object = this.m2Objects[i];
                if (this.m2OpaqueRenderedThisFrame[m2Object.sceneNumber]) continue;

                if (!m2Object.getIsRendered()) continue;
                if (!m2Object.aabb) continue;

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
            for (var i = 0; i < this.m2Objects.length; i++) {
                var m2Object = this.m2Objects[i];
                if (this.m2TranspRenderedThisFrame[m2Object.sceneNumber]) continue;

                if (!m2Object.getIsRendered()) continue;
                if (!m2Object.aabb) continue;

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
            for (var i = 0; i < this.m2Objects.length; i++) {
                if (!this.m2Objects[i].getIsRendered()) continue;

                this.m2Objects[i].drawBB();
            }
        }
    }
    draw() {
        this.m2OpaqueRenderedThisFrame = {};
        this.m2TranspRenderedThisFrame = {};

        if (this.currentWMO && config.getUsePortalCulling()) {
            this.currentWMO.drawPortalBased(true);

            if (this.currentWMO.exteriorPortals.length > 0) {
                this.drawExterior()
            }
            //6. Draw WMO portals
            if (config.getRenderPortals()) {
                this.sceneApi.shaders.activateDrawPortalShader();
                for (var i = 0; i < this.wmoObjects.length; i++) {
                    this.wmoObjects[i].drawPortals();
                }
            }
            this.drawM2s();
        } else {
            this.drawExterior();
            this.drawM2s();

            //6. Draw WMO portals
            if (config.getRenderPortals()) {
                this.sceneApi.shaders.activateDrawPortalShader();
                for (var i = 0; i < this.wmoObjects.length; i++) {
                    this.wmoObjects[i].drawPortals();
                }
            }
            this.sceneApi.shaders.activateFrustumBoxShader();
            //Draw Wmo portal frustums
            this.sceneApi.drawCamera()
        }
    }
}

export default GraphManager;