import $q from 'q';
import {vec4, mat4, vec3, glMatrix} from 'gl-matrix';

import WmoGroupObject from './wmoGroupObject.js';

import mathHelper from './../math/mathHelper.js';
import config from './../../services/config.js';

class WmoObject {
    constructor (sceneApi){
        var self = this;
        self.sceneApi = sceneApi;

        self.wmoGroupArray = [];
        self.doodadsArray = [];
        self.drawGroup = [];
        self.drawDoodads = [];
        //Portal culling variables
        self.drawExterior = false;

        self.exteriorPortals = [];
        self.interiorPortals = [];

        self.loaded = false;
        self.loading = false;

    }
    getFileNameIdent () {
        return this.fileName;
    }
    hasPortals () {
        return this.wmoObj && this.wmoObj.portalInfos && (this.wmoObj.portalInfos.length > 0);
    }

    isInsideInterior (cameraVec4) {
        if (!this.wmoGroupArray || this.wmoGroupArray.length ==0) return -1;

        //Transform camera into local coordinates
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, this.placementInvertMatrix);

        //Check if camera inside wmo
        var isInsideWMOBB = (
            cameraLocal[0] > this.wmoObj.BoundBoxCorner1.x && cameraLocal[0] < this.wmoObj.BoundBoxCorner2.x &&
            cameraLocal[1] > this.wmoObj.BoundBoxCorner1.y && cameraLocal[1] < this.wmoObj.BoundBoxCorner2.y &&
            cameraLocal[2] > this.wmoObj.BoundBoxCorner1.z && cameraLocal[2] < this.wmoObj.BoundBoxCorner2.z
        );
        if (!isInsideWMOBB) return -1;

        //Loop
        var wmoGroupsInside = 0;
        var interiorGroups = 0;
        var lastWmoGroupInside = -1;
        var candidateGroups = [];

        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            this.wmoGroupArray[i].checkIfInsideGroup(cameraVec4, cameraLocal, candidateGroups)

            /* Test: iterate through portals in 5 value radius and check if it fits there */

        }

        //6. Iterate through result group list and find the one with maximal bottom z coordinate for object position
        var minDist = 999999;
        var resObj = null;
        for (var i = 0; i < candidateGroups.length; i++) {
            if (candidateGroups[i].topBottom.bottomZ < 99999) {
                var dist = Math.abs(cameraLocal[2] - candidateGroups[i].topBottom.bottomZ);
                if (dist < minDist) {
                    minDist = dist;
                    this.currentNodeId = candidateGroups[i].nodeId;
                    this.currentGroupId = i;
                    resObj = { groupId : candidateGroups[i].groupId, nodeId : candidateGroups[i].nodeId};
                }
            }
            if (candidateGroups[i].topBottom.topZ > -99999) {
                var dist = Math.abs(candidateGroups[i].topBottom.topZ - cameraLocal[2]);
                if (dist < minDist) {
                    minDist = dist;
                    this.currentNodeId = candidateGroups[i].nodeId;
                    this.currentGroupId = i;
                    resObj = { groupId : candidateGroups[i].groupId, nodeId : candidateGroups[i].nodeId};
                }
            } 
        }


        if (resObj != null){
            var groupInfo = this.wmoObj.groupInfos[resObj.groupId];
            if ((groupInfo.flags & 0x2000) != 0)
                return resObj;
        }


        this.currentNodeId = -1;
        this.currentGroupId = -1;

        return {groupId : -1, nodeId : -1};
    }
    checkFrustumCulling (cameraVec4, frustumPlanes, num_planes, m2RenderedThisFrame) {
        if (!this.loaded) {
            return true;
        }

        var result = false;
        var aabb = this.aabb;

        //1. Check if camera position is inside Bounding Box
        if (
            cameraVec4[0] > aabb[0][0] && cameraVec4[0] < aabb[1][0] &&
            cameraVec4[1] > aabb[0][1] && cameraVec4[1] < aabb[1][1] &&
            cameraVec4[2] > aabb[0][2] && cameraVec4[2] < aabb[1][2]
        ) result = true;

        //2. Check aabb is inside camera frustum
        if (!result) {
            result = mathHelper.checkFrustum(frustumPlanes, aabb, num_planes);
        }
        this.isRendered = result;
        if (result) {
            var wmoM2Candidates = new Set();
            //1. Calculate visibility for groups
            for (var i = 0; i < this.wmoGroupArray.length; i++) {
                this.wmoGroupArray[i].checkGroupFrustum(cameraVec4, frustumPlanes, null, wmoM2Candidates);
            }

            //2. Check all m2 candidates
            wmoM2Candidates.forEach(function (value) {
                var m2Object = value;
                if (!m2Object) return;

                var result = m2Object.checkFrustumCulling(cameraVec4, frustumPlanes, num_planes, false);
                m2Object.setIsRendered(result);
                if (result) m2RenderedThisFrame.add(m2Object);
            });
        }

        return result;
    }

    /*
     * Update functions
     */

    update () {
    }


    /*
     * Load functions
     */
    getDoodadObject(index) {
        var self = this;
        if (!self.wmoObj.modd) {
            return;
        }

        var doodadsSet = self.currentDoodadSet;
        if (index < doodadsSet.index || index > doodadsSet.index+doodadsSet.number) return null;

        var doodadIndex = index - doodadsSet.index;

        var doodadObject = this.doodadsArray[doodadIndex];
        if (doodadObject) return doodadObject;


        var doodadDef = self.wmoObj.modd[index];
        doodadObject = this.loadDoodad(doodadDef);
        this.doodadsArray[doodadIndex] = doodadObject;

        return doodadObject;
    }

    loadDoodad (doodad) {
        var self = this;

        var wmoM2Object = self.sceneApi.objects.loadWmoM2Obj(doodad, self.placementMatrix, false);
        wmoM2Object.setWmoObject(this);
        return wmoM2Object;
    }
    setLoadingParam (modf){
        var deferred = $q.defer();
        var self = this;

        var filename = modf.fileName;
        this.doodadSet = modf.doodadSet;

        this.fileName = filename;

        /* 1. Create matrix */
        self.createPlacementMatrix(modf);
        if (modf.bb1) {
            //Loaded from actual map
            self.boundingBox = [
                [modf.bb1.x, modf.bb1.y, modf.bb1.z],
                [modf.bb2.x, modf.bb2.y, modf.bb2.z]
            ];
        } else {
            //Loaded from scene params
            this.startLoading();
        }
    }
    loadMainFile() {
        var self = this;
        var filename = this.fileName;
        var wmoMailPromise = self.sceneApi.resources.loadWmoMain(filename);
        wmoMailPromise.then(function success(wmoObj){
            self.wmoObj = wmoObj;
            self.wmoGroupArray = new Array(wmoObj.nGroups);

            self.createPortalsVBO();
            self.createBoundingBox();
            self.createWorldPortalVerticies();

            /* 1. Load wmo group files */
            var template = filename.substr(0, filename.lastIndexOf("."));
            for (var i = 0; i < wmoObj.nGroups; i++) {
                var groupInfo = wmoObj.groupInfos[i];

                var numStr = i.toString();
                for (var j = numStr.length; j < 3; j++) numStr = '0'+numStr;
                var groupFilename = template + "_" + numStr + ".wmo";

                self.wmoGroupArray[i] = new WmoGroupObject(self.sceneApi, self, groupFilename, groupInfo, i);
            }

            self.currentDoodadSet = self.wmoObj.mods[self.doodadSet];

            self.loaded = true;
            self.loading = false;
        }, function error (){
        });
    }
    startLoading() {
        if (!this.loading) {
            this.loading = true;
            this.loadMainFile();
        }
    }

    /*
     * Post load transform functions
     */

    createPlacementMatrix (modf){
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
    }
    createPortalsVBO () {
        var gl = this.sceneApi.getGlContext();
        if (this.wmoObj.nPortals == 0) return;

        this.vertexVBO = gl.createBuffer();

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(this.wmoObj.portalVerticles), gl.STATIC_DRAW );
        gl.bindBuffer( gl.ARRAY_BUFFER, null);

        var indiciesArray = [];
        for (var i = 0; i < this.wmoObj.portalInfos.length; i++) {
            var portalInfo = this.wmoObj.portalInfos[i];
            //if (portalInfo.index_count != 4) throw new Error("portalInfo.index_count != 4");
            var base_index = portalInfo.base_index;
            for (var j =0; j < portalInfo.index_count-2; j++) {
                indiciesArray.push(base_index+0);
                indiciesArray.push(base_index+j+1);
                indiciesArray.push(base_index+j+2);
            }
        }
        this.indexVBO = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indiciesArray), gl.STATIC_DRAW);
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null);
    }
    createBoundingBox() {
        var ab = this.wmoObj.BoundBoxCorner1;
        var cd = this.wmoObj.BoundBoxCorner2;
        var bb = {'ab' : ab, 'cd' : cd};

        if (bb) {
            var a_ab = vec4.fromValues(bb.ab.x,bb.ab.y,bb.ab.z,1);
            var a_cd = vec4.fromValues(bb.cd.x,bb.cd.y,bb.cd.z,1);

            var worldAABB = mathHelper.transformAABBWithMat4(this.placementMatrix, [a_ab, a_cd]);

            this.diameter = vec3.distance(worldAABB[0],worldAABB[1]);
            this.aabb = worldAABB;
        }
    }
    createWorldPortalVerticies () {
        //
        var portalVerticles = this.wmoObj.portalVerticles;

        if (portalVerticles) {
            var worldPortalVertices = new Array(portalVerticles.length)
        } else {
            var worldPortalVertices = new Array(0);
            return;
        }

        for (var i = 0; i < this.wmoObj.portalInfos.length; i++) {
            var portalInfo = this.wmoObj.portalInfos[i];

            var base_index = portalInfo.base_index;
            var plane = portalInfo.plane;

            //Make portal vertices for world space
            var thisPortalVertices = new Array(portalInfo.index_count);
            for (var j = 0; j < portalInfo.index_count; j++) {
                thisPortalVertices[j] = vec4.fromValues(
                    portalVerticles[3 * (base_index + j)    ],
                    portalVerticles[3 * (base_index + j) + 1],
                    portalVerticles[3 * (base_index + j) + 2],
                    1
                );
                vec4.transformMat4(thisPortalVertices[j], thisPortalVertices[j], this.placementMatrix);
            }

            // Sort portal vertices
            mathHelper.sortVec3ArrayAgainstPlane(thisPortalVertices, plane);

            worldPortalVertices[i] = thisPortalVertices;
        }

        this.worldPortalVerticles = worldPortalVertices;
    }
    /*
     *      Draw functions
     */

    draw () {
        if (!this.loaded) {
            this.startLoading();
            return;
        }
        /* Draw */
        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();

        if (!this.wmoObj) return;

        if (this.placementMatrix) {
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
        }


        var ambientColor = [this.wmoObj.ambColor&0xff, (this.wmoObj.ambColor>> 8)&0xff,
            (this.wmoObj.ambColor>>16)&0xff, (this.wmoObj.ambColor>> 24)&0xff];
        ambientColor[0] /= 255.0; ambientColor[1] /= 255.0;
        ambientColor[2] /= 255.0; ambientColor[3] /= 255.0;


        for (var i = 0; i < this.wmoGroupArray.length; i++){
            //if (i != 0) continue;
            if (this.wmoGroupArray[i]){
                if (!this.wmoGroupArray[i].isRendered) continue;

                var bpsNodeList = null;
                /*
                if (config.getRenderBSP()) {
                    bpsNodeList = (this.currentGroupId == i) ?
                        this.currentNodeId.map((x) => this.wmoGroupArray[i].wmoGroupFile.nodes[x])
                        : null;
                }*/
                this.wmoGroupArray[i].draw(ambientColor, bpsNodeList);
            }
        }
    }
    drawPortalBased(fromInteriorGroup) {
        if (!this.loaded) {
            this.startLoading();
            return;
        }
        /* Draw */
        var gl = this.sceneApi.getGlContext();
        var sceneApi = this.sceneApi;


        if (!this.wmoObj) return;

        var ambientColor = [this.wmoObj.ambColor&0xff, (this.wmoObj.ambColor>> 8)&0xff,
            (this.wmoObj.ambColor>>16)&0xff, (this.wmoObj.ambColor>> 24)&0xff];
        ambientColor[0] /= 255.0; ambientColor[1] /= 255.0;
        ambientColor[2] /= 255.0; ambientColor[3] /= 255.0;

        if (!this.hasPortals()) {
            this.draw();
            return;
        }

        if (fromInteriorGroup) {
            var uniforms = this.sceneApi.shaders.getShaderUniforms();
            if (this.placementMatrix) {
                gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
            }

            //1. Draw wmos
            for (var i = 0; i < this.interiorPortals.length; i++){
                var groupId = this.interiorPortals[i].groupId;
                var portalIndex = this.interiorPortals[i].portalIndex;

                if (this.wmoGroupArray[groupId]) {
                    this.wmoGroupArray[groupId].draw();
                }
            }
            //Draw exterior
            if (this.exteriorPortals.length > 0) {
                for (var i = 0; i< this.wmoGroupArray.length; i++) {
                    if ((this.wmoObj.groupInfos[i].flags & 0x8) > 0) { //exterior
                        if (this.wmoGroupArray[i].isRendered) {
                            this.wmoGroupArray[i].draw();
                        }
                    }
                }
            }
        } else {
            var uniforms = this.sceneApi.shaders.getShaderUniforms();
            if (this.placementMatrix) {
                gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
            }

            //Draw interior
            for (var i = 0; i < this.interiorPortals.length; i++){
                var groupId = this.interiorPortals[i].groupId;
                var portalIndex = this.interiorPortals[i].portalIndex;

                var bpsNodeList = null;
                if (config.getRenderBSP()) {
                    bpsNodeList = (this.currentGroupId == i) ?
                        this.currentNodeId.map((x) => this.wmoGroupArray[i].wmoGroupFile.nodes[x])
                        : null;
                }

                if (this.wmoGroupArray[groupId]) {
                    this.wmoGroupArray[groupId].draw();
                }
            }
            //Draw exterior
            if (this.exteriorPortals.length > 0) {
                for (var i = 0; i< this.wmoGroupArray.length; i++) {
                    if ((this.wmoObj.groupInfos[i].flags & 0x8) > 0) { //exterior
                        if (this.wmoGroupArray[i] && this.wmoGroupArray[i].isRendered) {
                            this.wmoGroupArray[i].draw();
                        }
                    }
                }
            }
        }
    }
    drawBB () {
        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var mat4_ident = mat4.create();
        mat4.identity(mat4_ident);
        gl.uniformMatrix4fv(uniforms.uPlacementMat, false, new Float32Array(mat4_ident));

        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            if (!this.wmoGroupArray[i] || !this.wmoGroupArray[i].wmoGroupFile) continue;
            if (!this.drawGroup[i] && this.drawGroup[i]!==undefined) continue;

            var bb1 = this.volumeWorldGroupBorders[i][0],
            bb2 = this.volumeWorldGroupBorders[i][1];

            var center = [
                (bb1[0] + bb2[0])/2,
                (bb1[1] + bb2[1])/2,
                (bb1[2] + bb2[2])/2
            ];

            var scale = [
                bb2[0] - center[0],
                bb2[1] - center[1],
                bb2[2] - center[2]
            ];

            gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
            gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
            gl.uniform3fv(uniforms.uColor, new Float32Array([0.058, 0.058, 0.819607843])); //blue

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        }
    }
    drawPortals () {
        if (!this.wmoObj) return;
        if (this.wmoObj.nPortals == 0) return;

        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);

        //gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // default blend func

        gl.vertexAttribPointer(shaderAttributes.aPosition, 3, gl.FLOAT, false, 0, 0);  // position

        if (this.placementMatrix) {
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
        }

        gl.disable(gl.CULL_FACE);
        gl.depthMask(false);

        var offset = 0;
        for (var i = 0; i < this.wmoObj.portalInfos.length; i++) {
            var portalInfo = this.wmoObj.portalInfos[i];

            if (portalInfo.isFalse) {
                gl.uniform4fv(uniforms.uColor, new Float32Array([0.819607843, 0.058, 0.058, 0.3])); //red
            } else {
                gl.uniform4fv(uniforms.uColor, new Float32Array([0.058, 0.058, 0.819607843, 0.3])); //blue
            }

            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, (offset) * 2);

            offset+=(portalInfo.index_count-2)*3
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        //gl.enable(gl.DEPTH_TEST);
    }
    drawPortalFrustumsBB () {
        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        if (!this.portalViewFrustums) return;

        gl.disable(gl.DEPTH_TEST);
        gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);

        for (var i = 0; i < this.portalViewFrustums.length; i++) {
            if (!this.wmoGroupArray[i] || !this.wmoGroupArray[i].wmoGroupFile) continue;
            if (!this.portalViewFrustums[i]) continue;

            var viewFrustum = this.portalViewFrustums[i];
            var invViewFrustum = mat4.create();
            mat4.invert(invViewFrustum, viewFrustum);


            gl.uniformMatrix4fv(uniforms.uInverseViewProjection, false, new Float32Array(invViewFrustum));

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        }
        gl.enable(gl.DEPTH_TEST);
    }
    drawBspVerticles () {
        if (!this.wmoObj) return;

        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // default blend func
        gl.disable(gl.BLEND);


        gl.depthMask(true);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);

        if (this.currentGroupId >= 0 && this.wmoGroupArray[this.currentGroupId]) {
            var node = this.wmoGroupArray[this.currentGroupId].wmoGroupFile.nodes[this.currentNodeId];

            gl.bindBuffer(gl.ARRAY_BUFFER, this.wmoGroupArray[this.currentGroupId].combinedVBO);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wmoGroupArray[this.currentGroupId].mobrVBO);

            gl.vertexAttribPointer(shaderAttributes.aPosition, 3, gl.FLOAT, false, 0, 0); // position

            gl.uniform4fv(uniforms.uColor, new Float32Array([0.819607843, 0.819607843, 0.058, 0.0])); //yellow

            if (node) {
                gl.drawElements(gl.TRIANGLES, node.numFaces*3, gl.UNSIGNED_SHORT, (node.firstFace*3) * 2);
            }
        }

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }
}


export default WmoObject;