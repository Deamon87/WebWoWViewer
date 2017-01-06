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

        var moprIndex = this.wmoGeom.wmoGroupFile.mogp.moprIndex;
        var numItems = this.wmoGeom.wmoGroupFile.mogp.numItems;

        var insidePortals = true;
        for (var j = moprIndex; j < moprIndex+numItems; j++) {
            var relation = this.parentWmo.wmoObj.portalRelations[j];
            var portalInfo = this.parentWmo.wmoObj.portalInfos[relation.portal_index];

            var nextGroup = relation.group_index;
            var plane = portalInfo.plane;

            var minX = 99999;
            var minY = 99999;
            var minZ = 99999;
            var maxX = -99999;
            var maxY = -99999;
            var maxZ = -99999;


            var base_index = portalInfo.base_index;
            var portalVerticles = this.parentWmo.wmoObj.portalVerticles;
            for (var k = 0; k < portalInfo.index_count; k++) {
                minX = Math.min(minX, portalVerticles[3 * (base_index + k)    ]);
                minY = Math.min(minY, portalVerticles[3 * (base_index + k) + 1]);
                minZ = Math.min(minZ, portalVerticles[3 * (base_index + k) + 2]);

                maxX = Math.max(maxX, portalVerticles[3 * (base_index + k)    ]);
                maxY = Math.max(maxX, portalVerticles[3 * (base_index + k) + 1]);
                maxZ = Math.max(maxZ, portalVerticles[3 * (base_index + k) + 2]);
            }

            var distanceToBB = mathHelper.distanceFromAABBToPoint([[minX, minY, minZ],[maxX, maxY, maxZ]], cameraLocal);

            var dotResult = (vec4.dot(vec4.fromValues(plane.x, plane.y, plane.z, plane.w), cameraLocal));
            var isInsidePortalThis = (relation.side < 0) ? (dotResult <= 0) : (dotResult >= 0);
            if (!isInsidePortalThis && (Math.abs(dotResult) < 5) && (Math.abs(distanceToBB) < 5)) {
                insidePortals = false;
                break;
            }
        }
        if (!insidePortals) return;

        //3. Query bsp tree for leafs around the position of object(camera)
        var groupFile = this.wmoGeom.wmoGroupFile;

        var epsilon = 0.4;
        var cameraBBMin = vec3.fromValues(cameraLocal[0]-epsilon, cameraLocal[1]-epsilon, groupInfo.bb1.z-epsilon);
        var cameraBBMax = vec3.fromValues(cameraLocal[0]+epsilon, cameraLocal[1]+epsilon, groupInfo.bb2.z+epsilon);

        var nodeId = 0;
        var nodes = groupFile.nodes;
        var bspLeafList = [];
        mathHelper.queryBspTree([cameraBBMin, cameraBBMax], nodeId, nodes, bspLeafList);
        var topBottom = mathHelper.getTopAndBottomTriangleFromBsp(cameraLocal, groupFile, bspLeafList);

        //4. Check min\max Z value. If object(camera) pos is not in range - the object do not belong this wmo group
        /*
        if (topBottom.bottomZ > 99999 && topBottom.topZ < -99999) return null;
        if (topBottom.bottomZ < 99999 && cameraLocal[2] < topBottom.bottomZ) return null
        if (topBottom.bottomZ > topBottom.topZ){
            if (cameraLocal[2] > topBottom.bottomZ) {
                topBottom.topZ = -99999;
            } else {
                topBottom.bottomZ = 99999;
            }
        }
        if (topBottom.topZ > -99999 && cameraLocal[2] > topBottom.topZ) return null;
          */

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