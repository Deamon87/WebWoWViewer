import config from './../../services/config.js'
import mathHelper from './../math/mathHelper.js';
import {vec4, mat4, vec3, glMatrix} from 'gl-matrix';

class WmoGroupObject {
    constructor (sceneApi, parentWmo, fileName, groupInfo, groupId) {


        this.sceneApi = sceneApi;
        this.fileName = fileName;
        this.parentWmo = parentWmo;
        this.isRendered = false;
        this.groupInfo = groupInfo;
        this.groupId = groupId;

        this.doodadsLoadingTriggered = false;
        this.wmoDoodads = [];

        this.createWorldGroupBB(true);
    }
    load(){
        var filename = this.fileName;
        var self = this;
        return self.sceneApi.resources.loadWmoGeom(filename).then(
            function success(wmoGeom){
                self.wmoGeom = wmoGeom;
                var mogp = self.wmoGeom.wmoGroupFile.mogp;
                self.dontUseLocalLightingForM2 = ((mogp.Flags & 0x40) > 0) || ((mogp.Flags & 0x8) > 0);

                self.createWorldGroupBB(false);
                self.loaded = true;
            }, function error(){
            }
        );
    }
    loadDoodads() {
        var self = this;

        var doodadRefs = this.wmoGeom.wmoGroupFile.doodadRefs;
        if (!doodadRefs) return;

        var wmoDoodads = new Array(doodadRefs.length);

        //Load all doodad from MOBR
        for (var i = 0; i < wmoDoodads.length; i++) {
            wmoDoodads[i] = this.parentWmo.getDoodadObject(doodadRefs[i]);
        }
        this.wmoDoodads = wmoDoodads;
    }
    startLoading() {
        if (!this.loading) {
            this.loading = true;
            this.load();
        }
    }
    draw(ambientColor, bpsNodeList) {
        if (!this.loaded) {
            this.startLoading();
            return;
        }
        if (!this.doodadsLoadingTriggered) {
            this.loadDoodads();
            this.doodadsLoadingTriggered = true;
        }
        if (!this.texturesLoadingTriggered) {
            this.wmoGeom.loadTextures(this.parentWmo.wmoObj.momt);
            this.texturesLoadingTriggered = true;
        }

        this.wmoGeom.draw()
    }
    setIsRendered(value) {
        this.isRendered = value;
    }

    getIsRendered() {
        return this.isRendered;
    }
    createWorldGroupBB (fromGroupInfo) {
        var groupInfo = null;
        var bb1 = null, bb2 = null;
        if (fromGroupInfo) {
            groupInfo = this.groupInfo;
            bb1 = groupInfo.bb1;
            bb2 = groupInfo.bb2;
        } else {
            groupInfo = this.wmoGeom.wmoGroupFile.mogp;
            bb1 = groupInfo.BoundBoxCorner1;
            bb2 = groupInfo.BoundBoxCorner2;
        }


        var bb1vec = vec4.fromValues(bb1.x, bb1.y, bb1.z, 1);
        var bb2vec = vec4.fromValues(bb2.x, bb2.y, bb2.z, 1);

        var worldAABB = mathHelper.transformAABBWithMat4(this.parentWmo.placementMatrix, [bb1vec, bb2vec]);

        this.worldGroupBorder = worldAABB;
        this.volumeWorldGroupBorder = worldAABB.slice(0);
    }
    updateWorldGroupBBWithM2 () {
        var doodadRefs = this.wmoGeom.wmoGroupFile.doodadRefs;
        var mogp = this.wmoGeom.wmoGroupFile.mogp;
        var groupAABB = this.worldGroupBorder;

        var dontUseLocalLighting = ((mogp.flags & 0x40) > 0) || ((mogp.flags & 0x8) > 0);

        for (var j = 0; j < this.wmoDoodads.length; j++) {
            var mdxObject = this.wmoDoodads[j];
            //1. Update the mdx
            //If at least one exterior WMO group reference the doodad - do not use the diffuse lightning from modd chunk
            if (dontUseLocalLighting) {
                mdxObject.setUseLocalLighting(false);
            }

            if (!mdxObject.loaded) continue; //corrupted :(

            //2. Update the world group BB
            groupAABB[0] = vec3.fromValues(Math.min(mdxObject.aabb[0][0],groupAABB[0][0]),
                Math.min(mdxObject.aabb[0][1],groupAABB[0][1]),
                Math.min(mdxObject.aabb[0][2],groupAABB[0][2]));

            groupAABB[1] = vec3.fromValues(Math.max(mdxObject.aabb[1][0],groupAABB[1][0]),
                Math.max(mdxObject.aabb[1][1],groupAABB[1][1]),
                Math.max(mdxObject.aabb[1][2],groupAABB[1][2]));
        }
    }
    checkGroupFrustum(cameraVec4, frustumPlanes, points, wmoM2Candidates) {
        var bbArray = this.worldGroupBorder;

        var isInsideM2Volume = (
            cameraVec4[0] > bbArray[0][0] && cameraVec4[0] < bbArray[1][0] &&
            cameraVec4[1] > bbArray[0][1] && cameraVec4[1] < bbArray[1][1] &&
            cameraVec4[2] > bbArray[0][2] && cameraVec4[2] < bbArray[1][2]
        );

        var drawDoodads = isInsideM2Volume || mathHelper.checkFrustum(frustumPlanes, bbArray, frustumPlanes.length, points);

        var bbArray = this.volumeWorldGroupBorder;
        var isInsideGroup = (
            cameraVec4[0] > bbArray[0][0] && cameraVec4[0] < bbArray[1][0] &&
            cameraVec4[1] > bbArray[0][1] && cameraVec4[1] < bbArray[1][1] &&
            cameraVec4[2] > bbArray[0][2] && cameraVec4[2] < bbArray[1][2]
        );

        var drawGroup = isInsideGroup || mathHelper.checkFrustum(frustumPlanes, bbArray, frustumPlanes.length, points);

        this.setIsRendered(drawGroup);


        if (drawDoodads) {
            this.checkDoodads(wmoM2Candidates);
        }
        return drawGroup;
    }
    checkDoodads(wmoM2Candidates){
        for (var i = 0; i< this.wmoDoodads.length; i++) {
            if (this.wmoDoodads[i]) {
                if (this.dontUseLocalLightingForM2) {
                    this.wmoDoodads[i].setUseLocalLighting(false);
                }
                wmoM2Candidates.add(this.wmoDoodads[i]);
            }
        }
    }

    checkIfInsideGroup(cameraVec4, cameraLocal, candidateGroups) {
        var bbArray = this.volumeWorldGroupBorder;
        var groupInfo = this.groupInfo;
        //1. Check if group wmo is interior wmo
        //if ((groupInfo.flags & 0x2000) == 0) return null;
        //interiorGroups++;

        //2. Check if inside volume AABB
        var isInsideAABB = (
            cameraVec4[0] > bbArray[0][0] && cameraVec4[0] < bbArray[1][0] &&
            cameraVec4[1] > bbArray[0][1] && cameraVec4[1] < bbArray[1][1] &&
            cameraVec4[2] > bbArray[0][2] && cameraVec4[2] < bbArray[1][2]
        );
        if (!isInsideAABB) return null;
        //wmoGroupsInside++;
        //lastWmoGroupInside = i;



        if (!this.loaded) {
            this.startLoading();
            return null;
        }
        var groupFile = this.wmoGeom.wmoGroupFile;
        var parentWmoFile = this.parentWmo.wmoObj;

        var moprIndex = this.wmoGeom.wmoGroupFile.mogp.moprIndex;
        var numItems = this.wmoGeom.wmoGroupFile.mogp.numItems;

        var insidePortals = mathHelper.checkIfInsidePortals(cameraLocal, groupFile, parentWmoFile);
        if (!insidePortals) return;

        //3. Query bsp tree for leafs around the position of object(camera)


        var epsilon = 1;
        var cameraBBMin = vec3.fromValues(cameraLocal[0]-epsilon, cameraLocal[1]-epsilon, groupInfo.bb1.z);
        var cameraBBMax = vec3.fromValues(cameraLocal[0]+epsilon, cameraLocal[1]+epsilon, groupInfo.bb2.z);

        var nodeId = 0;
        var nodes = groupFile.nodes;
        var bspLeafList = [];
        mathHelper.queryBspTree([cameraBBMin, cameraBBMax], nodeId, nodes, bspLeafList);
        var topBottom = mathHelper.getTopAndBottomTriangleFromBsp(cameraLocal, groupFile, parentWmoFile, bspLeafList);
        if (!topBottom) return;
        if (topBottom.bottomZ > 99999) return;

        //5. The object(camera) is inside WMO group. Get the actual nodeId
        while (nodeId >=0 && ((nodes[nodeId].planeType&0x4) == 0)){
            var prevNodeId = nodeId;
            if ((nodes[nodeId].planeType == 0)) {
                if (cameraLocal[0] < nodes[nodeId].fDist) {
                    nodeId = nodes[nodeId].children1;
                } else {
                    nodeId = nodes[nodeId].children2;
                }
            } else if ((nodes[nodeId].planeType == 1)) {
                if (cameraLocal[1] < nodes[nodeId].fDist) {
                    nodeId = nodes[nodeId].children1;
                } else {
                    nodeId = nodes[nodeId].children2;
                }
            } else if ((nodes[nodeId].planeType == 2)) {
                if (cameraLocal[2] < nodes[nodeId].fDist) {
                    nodeId = nodes[nodeId].children1;
                } else {
                    nodeId = nodes[nodeId].children2;
                }
            }
        }
        candidateGroups.push({'topBottom' : topBottom, groupId : this.groupId, bspList : bspLeafList, nodeId: nodeId});
        //candidateGroups.push({'topBottom' : {topZ : 0, bottomZ : 0}, groupId : this.groupId, bspList : [], nodeId: 0});
    }
}

export default WmoGroupObject;