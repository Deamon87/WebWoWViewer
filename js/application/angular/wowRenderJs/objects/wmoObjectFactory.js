import $q from 'q';
import {vec4, mat4, vec3, glMatrix} from 'gl-matrix';

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
    }
    getFileNameIdent () {
        return this.fileName;
    }
    loadGeom (num, filename){
        var self = this;
        return self.sceneApi.resources.loadWmoGeom(filename).then(
            function success(wmoGeom){
                self.wmoGroupArray[num] = wmoGeom;

                /* 1. Load textures */
                wmoGeom.loadTextures(self.wmoObj.momt);

            }, function error(){
            }
        );
    }
    checkIfUseLocalLighting (pos) {
        var lastGroupInfo = null;
        for (var i = 0; i < this.wmoObj.nGroups; i++) {
            var groupInfo = this.wmoObj.groupInfos[i];
            var bb1 = groupInfo.bb1,
                bb2 = groupInfo.bb2;

            if( bb1.x <= pos.x && pos.x <= bb2.x
                && bb1.y <= pos.y && pos.y <= bb2.y
                && bb1.z <= pos.z && pos.z <= bb2.z ) {
                // Point is in bounding box

                //Now check if this bb is smaller than previous one
                /*if (lastGroupInfo) {
                    if (lastGroupInfo.bb1.x > bb1.x || lastGroupInfo.bb2.x > bb2.x
                        || lastGroupInfo.bb1.y > bb1.y || lastGroupInfo.bb2.y < bb2.y
                        || lastGroupInfo.bb1.z > bb1.z || lastGroupInfo.bb2.z < bb2.z
                    ) {
                        continue;
                    }
                } */

                lastGroupInfo = groupInfo;
            }
        }

        if (lastGroupInfo && ((lastGroupInfo.flags & 0x2000) > 0)) {
            return true
        } else {
            return false;
        }
    }
    createWorldGroupBB () {
        var worldGroupBorders = new Array(this.wmoGroupArray.length);
        var volumeWorldGroupBorders = new Array(this.wmoGroupArray.length);
        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            var groupInfo = this.wmoObj.groupInfos[i];
            var bb1 = groupInfo.bb1,
                bb2 = groupInfo.bb2;

            var bb1vec = vec4.fromValues(bb1.x, bb1.y, bb1.z, 1);
            var bb2vec = vec4.fromValues(bb2.x, bb2.y, bb2.z, 1);

            var worldAABB = mathHelper.transformAABBWithMat4(this.placementMatrix, [bb1vec, bb2vec]);


            worldGroupBorders[i] = worldAABB;
            volumeWorldGroupBorders[i] = worldAABB.slice(0);
        }

        this.worldGroupBorders = worldGroupBorders;
        this.volumeWorldGroupBorders = volumeWorldGroupBorders;
    }
    updateWorldGroupBBWithM2 () {
        var doodadsSet = this.currentDoodadSet;
        if (!doodadsSet) return;

        //After this opertaions these BB should not be used for detecting if object is inside the group wmo or not
        //Those should be used only to detect if group wmo is visible or not
        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            if (this.wmoGroupArray[i]) {
                var doodadRefs = this.wmoGroupArray[i].wmoGroupFile.doodadRefs;
                var groupAABB = this.worldGroupBorders[i];

                if (doodadRefs) {
                    for (var j = 0; j < doodadRefs.length; j++) {
                        var doodadIndex = doodadRefs[j];
                        if (
                            (doodadIndex - doodadsSet.index < 0) ||
                            (doodadIndex > doodadsSet.index + doodadsSet.number - 1)
                        ) continue;

                        var mdxObject = this.doodadsArray[doodadIndex - doodadsSet.index];
                        //1. Update the mdx
                        //If at least one exterior WMO group reference the doodad - do not use the diffuse lightning from modd chunk
                        if ((this.wmoObj.groupInfos[i].flags & 0x8) > 0) {
                            mdxObject.setUseLocalLighting(false);
                        }

                        if (!mdxObject.aabb) continue; //corrupted :(
                        //2. Update the world group BB
                        groupAABB[0] = vec3.fromValues(Math.min(mdxObject.aabb[0][0],groupAABB[0][0]),
                            Math.min(mdxObject.aabb[0][1],groupAABB[0][1]),
                            Math.min(mdxObject.aabb[0][2],groupAABB[0][2]));

                        groupAABB[1] = vec3.fromValues(Math.max(mdxObject.aabb[1][0],groupAABB[1][0]),
                            Math.max(mdxObject.aabb[1][1],groupAABB[1][1]),
                            Math.max(mdxObject.aabb[1][2],groupAABB[1][2]));
                    }
                }
            }
        }
    }
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
    loadDoodads (doodadsInd){
        var self = this;
        if (!self.wmoObj.modd) {
            return;
        }
        self.currentDoodadSet = self.wmoObj.mods[doodadsInd];

        var doodadsSet = self.wmoObj.mods[doodadsInd];
        var doodadDefArray = self.wmoObj.modd;

        var doodadsPromiseArray =  new Array(doodadsSet.number);
        this.doodadsArray =  new Array(doodadsSet.number);
        for (var i = 0; i < doodadsSet.number; i++) {
        //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
            var doodad = doodadDefArray[doodadsSet.index + i];
            doodadsPromiseArray[i] = this.loadDoodad(i, doodad);
        }

        return $q.all(doodadsPromiseArray).then(function success(arrayOfDoodads){
            for (var i = 0; i < self.doodadsArray.length; i++){
                self.doodadsArray[i] = arrayOfDoodads[i];
            }
        },function error(){});
    }
    loadDoodad (index, doodad) {
        var self = this;

        //var useLocalLighting = self.checkIfUseLocalLighting(doodad.pos);
        var promise = self.sceneApi.objects.loadWmoM2Obj(doodad, self.placementMatrix, false);
        return promise;
    }
    load (modf){
        var deferred = $q.defer();
        var self = this;

        var filename = modf.fileName;
        var doodadsInd = modf.doodadSet;

        this.fileName = filename;

        /* 1. Create matrix */
        self.createPlacementMatrix(modf);

        var wmoMailPromise = self.sceneApi.resources.loadWmoMain(filename);
        wmoMailPromise.then(function success(wmoObj){
            self.wmoObj = wmoObj;
            self.wmoGroupArray = new Array(wmoObj.nGroups);

            self.createPortalsVBO();
            self.createWorldPortalVerticies();

            var groupPromises = new Array(wmoObj.nGroups);
            /* 1. Load wmo group files */
            var template = filename.substr(0, filename.lastIndexOf("."));
            for (var i = 0; i < wmoObj.nGroups; i++) {
                /* Fill the string with zeros, so it would have length of 3 */
                var num = (i).toString();
                for (;num.length != 3; ){
                    num = '0' + num;
                }

                groupPromises[i] = self.loadGeom(i, template + "_" + num + ".wmo");
            }

            /* 2. Load doodads */
            var m2_loaded_promise = self.loadDoodads(doodadsInd);

            /* 3. Create AABB for group WMO from MOGI chunk */
            self.createWorldGroupBB();

            /* 4. Update group WMO AABB when all m2 and group WMO are loaded */
            //credits to schlumpf for idea
            $q.all(groupPromises.concat([m2_loaded_promise])).then(function success(){
               self.updateWorldGroupBBWithM2();
            }, function error(){
            });

            deferred.resolve(self);
        }, function error (){
        });

        return deferred.promise;
    }
    drawBB () {
        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var mat4_ident = mat4.create();
        mat4.identity(mat4_ident);
        gl.uniformMatrix4fv(uniforms.uPlacementMat, false, new Float32Array(mat4_ident));

        /*for (var i = 0; i < this.wmoGroupArray.length; i++){
            var groupInfo = this.wmoObj.groupInfos[i];
            var bb1 = groupInfo.bb1,
                bb2 = groupInfo.bb2;

            var center = [
                (bb1.x + bb2.x)/2,
                (bb1.y + bb2.y)/2,
                (bb1.z + bb2.z)/2
            ];

            var scale = [
                bb2.x - center[0],
                bb2.y - center[1],
                bb2.z - center[2]
            ];

            gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
            gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
            gl.uniform3fv(uniforms.uColor, new Float32Array([0.027, 0.643, 0.075])); //green
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        } */

        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            if (!this.wmoGroupArray[i] || !this.wmoGroupArray[i].wmoGroupFile) continue;
            if (!this.drawGroup[i] && this.drawGroup[i]!==undefined) continue;

             /*
            var mogp = this.wmoGroupArray[i].wmoGroupFile.mogp;
            */

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
    setDoodadGroupDrawing (index, doDraw) {
        var groupInfo = this.wmoObj.groupInfos[index];
        var doodadsSet = this.currentDoodadSet;

        if (doodadsSet && this.wmoGroupArray[index]) {
            var doodadRefs = this.wmoGroupArray[index].wmoGroupFile.doodadRefs;

            if (doodadRefs) {
                for (var i = 0; i < doodadRefs.length; i++) {
                    var doodadIndex = doodadRefs[i];
                    if (
                        (doodadIndex - doodadsSet.index < 0) ||
                        (doodadIndex > doodadsSet.index + doodadsSet.number - 1)
                    ) continue;

                    var mdxObject = this.doodadsArray[doodadIndex - doodadsSet.index];
                    //mdxObject.setIsRendered(mdxObject.getIsRendered() || doDraw);
                    if (mdxObject){
                        mdxObject.setIsRendered(doDraw);
                    }
                }
            }
        }
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

        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            if (!this.wmoGroupArray[i]) continue;
            var bbArray = this.volumeWorldGroupBorders[i];
            var groupInfo = this.wmoObj.groupInfos[i];

            //1. Check if group wmo is interior wmo
            if ((groupInfo.flags & 0x2000) == 0) continue;
            interiorGroups++;

            //2. Check if inside volume AABB
            var isInsideAABB = (
                cameraVec4[0] > bbArray[0][0] && cameraVec4[0] < bbArray[1][0] &&
                cameraVec4[1] > bbArray[0][1] && cameraVec4[1] < bbArray[1][1] &&
                cameraVec4[2] > bbArray[0][2] && cameraVec4[2] < bbArray[1][2]
            );
            if (!isInsideAABB) continue;
            wmoGroupsInside++;
            lastWmoGroupInside = i;

            //3. Check if inside portals
            var isInsidePortals = true;
            var moprIndex = this.wmoGroupArray[i].wmoGroupFile.mogp.moprIndex;
            var numItems = this.wmoGroupArray[i].wmoGroupFile.mogp.numItems;

            for (var j = moprIndex; j < moprIndex+numItems; j++) {
                var relation = this.wmoObj.portalRelations[j];
                var portalInfo = this.wmoObj.portalInfos[relation.portal_index];

                var plane = portalInfo.plane;
                var dotResult = (vec4.dot(vec4.fromValues(plane.x, plane.y, plane.z, plane.w), cameraLocal));
                var isInsidePortalThis = (relation.side < 0) ? (dotResult < 0) : (dotResult > 0);
                isInsidePortals = isInsidePortals && isInsidePortalThis;
            }

            if (isInsidePortals) {
                var nodeId = 0;
                var nodes = this.wmoGroupArray[i].wmoGroupFile.nodes;
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
                this.currentNodeId = nodeId;
                this.currentGroupId = i;
                //return {nodeId : nodeId, node: nodes[nodeId]};
                return { groupId : i, nodeId : nodeId};
            }

        }

        if (wmoGroupsInside == 1 && interiorGroups > 1) return lastWmoGroupInside;
        this.currentNodeId = -1;
        this.currentGroupId = -1;

        return {groupId : -1, nodeId : -1};
    }
    resetDrawnForAllGroups (value) {
        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            //Change state only if it's from false to true. According to rule from part 1
            var groupInfo = this.wmoObj.groupInfos[i];

            //1. Check if group wmo is interior wmo
            if ((groupInfo.flags & 0x2000) != 0 && value) {
                this.drawGroup[i] = true; // Interior WMO should be drawn only under "portal rule"
            } else {
                this.drawGroup[i] = value;
            }
        }
    }
    setIsRenderedForDoodads () {
        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            //Change state only if it's from false to true. According to rule from part 1
            if (this.drawDoodads[i]) {
                this.setDoodadGroupDrawing(i, this.drawDoodads[i]);
            }
        }
    }
    startTraversingFromInteriorWMO (groupId, cameraVec4, perspectiveMat, lookat, frustumPlanes, currentVisibleM2, currentWmoVisible) {
        //CurrentVisibleM2 and visibleWmo is array of global m2 objects, that are visible after frustum

        /* 1. Create array of visibility with all false */
        var traverseDoodadsVis = new Array(this.doodadsArray.length);
        for (var i=0; i< traverseDoodadsVis.length; i++) {
            traverseDoodadsVis[i] = false;
        }
        var transverseVisitedGroups = new Array(this.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }

        this.traverseDoodadsVis = traverseDoodadsVis;
        this.transverseVisitedGroups = transverseVisitedGroups;

        this.transverseInteriorWMO(groupId, true, cameraVec4, perspectiveMat, lookat, frustumPlanes);


        for (var i = 0; i< traverseDoodadsVis.length; i++) {
            this.doodadsArray[i].setIsRendered(!!traverseDoodadsVis[i]);
        }
    }
    startTraversingFromExteriorWMO (groupId, cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        this.transverseExteriorWMO(groupId, false, cameraVec4, perspectiveMat, lookat, frustumPlanes);
    }
    transverseInteriorWMO (groupId, fromInterior, cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        var currentlyDrawnGroups = this.drawGroup;
        this.transverseVisitedGroups[groupId] = true;

        //1. Check visible wmo doodads against frustum
        if (this.wmoGroupArray[groupId]) {
            var doodadRefs = this.wmoGroupArray[groupId].wmoGroupFile.doodadRefs;
            var doodadsSet = this.currentDoodadSet;

            if (doodadRefs) {
                for (var j = 0; j < doodadRefs.length; j++) {
                    var doodadIndex = doodadRefs[j];
                    if (
                        (doodadIndex - doodadsSet.index < 0) ||
                        (doodadIndex > doodadsSet.index + doodadsSet.number - 1)
                    ) continue;

                    var doodadWmoIndex = doodadIndex - doodadsSet.index;
                    var mdxObject = this.doodadsArray[doodadWmoIndex];
                    if (mdxObject.getIsRendered()) {
                        var inFrustum = mdxObject.checkFrustumCulling(cameraVec4, frustumPlanes);


                        var currVis = this.traverseDoodadsVis[doodadWmoIndex];
                        this.traverseDoodadsVis[doodadWmoIndex] = currVis | inFrustum;
                    }
                }
            }
        }

        //2. Loop through portals of current group
        var moprIndex = this.wmoGroupArray[groupId].wmoGroupFile.mogp.moprIndex;
        var numItems = this.wmoGroupArray[groupId].wmoGroupFile.mogp.numItems;
        var portalVertexes = this.worldPortalVerticles;

        for (var j = moprIndex; j < moprIndex+numItems; j++) {
            var relation = this.wmoObj.portalRelations[j];
            var portalInfo = this.wmoObj.portalInfos[relation.portal_index];

            var nextGroup = relation.groupId;
            var plane = portalInfo.plane;

            var base_index = portalInfo.base_index;

            //2.1 If portal has less than 4 vertices - skip it(invalid?)
            if (portalInfo.index_count < 4) continue;

            //Skip groups we already visited
            if (this.transverseVisitedGroups[nextGroup]) continue;

            //2.2 Check if Portal BB made from portal vertexes intersects

            mathHelper.checkPortalFrustum();

            //2.3 Form 4 new planes(fifth is the portal's plane)
            var planeTop =      mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, portalVertexes[base_index+0], portalVertexes[base_index+1]);
            var planeLeft =     mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, portalVertexes[base_index+1], portalVertexes[base_index+2]);
            var planeRight =    mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, portalVertexes[base_index+2], portalVertexes[base_index+3]);
            var planeBottom =   mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, portalVertexes[base_index+3], portalVertexes[base_index+0]);

            var portalFrustum = frustumPlanes.slice(0,8);

            portalFrustum[0] = planeRight;
            portalFrustum[1] = planeLeft;
            portalFrustum[2] = planeBottom;
            portalFrustum[3] = planeTop;
            portalFrustum[5] = plane;
            if (this.wmoObj.groupInfos[nextGroup].flags & 0x2000 > 0) {
                this.transverseInteriorWMO(nextGroup, cameraVec4, perspectiveMat, lookat, portalFrustum)
            } else {
                this.transverseExteriorWMO();
            }
        }
    }
    transverseExteriorWMO (groupId, fromInterior, cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        /*1. Check Adt WMO, check adtm2 */
    }
    checkFrustumCulling (cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        if (!this.worldGroupBorders) return;
        //1. Set Doodads drawing to false. Doodad should be rendered if at least one WMO Group it belongs is visible(rendered)
        //It's so, because two group wmo can reference same doodad
        for ( var i = 0; i < this.doodadsArray.length; i++) {
            if (this.doodadsArray[i]) {
                this.doodadsArray[i].setIsRendered(false);
            }
        }

        //2. Calculate visibility
        for (var i = 0; i < this.wmoGroupArray.length; i++) {
            if (!this.drawGroup[i]) continue;
            var bbArray = this.worldGroupBorders[i];

            var isInside = (
                cameraVec4[0] > bbArray[0][0] && cameraVec4[0] < bbArray[1][0] &&
                cameraVec4[1] > bbArray[0][1] && cameraVec4[1] < bbArray[1][1] &&
                cameraVec4[2] > bbArray[0][2] && cameraVec4[2] < bbArray[1][2]
            );

            var drawDoodads = isInside || mathHelper.checkFrustum(frustumPlanes,bbArray);

            var bbArray = this.volumeWorldGroupBorders[i];
            var isInside = (
                cameraVec4[0] > bbArray[0][0] && cameraVec4[0] < bbArray[1][0] &&
                cameraVec4[1] > bbArray[0][1] && cameraVec4[1] < bbArray[1][1] &&
                cameraVec4[2] > bbArray[0][2] && cameraVec4[2] < bbArray[1][2]
            );

            var drawGroup = isInside || mathHelper.checkFrustum(frustumPlanes,bbArray);

            this.drawGroup[i] = drawGroup;
            this.drawDoodads[i] = drawDoodads;
        }
    }
    update () {

    }
    draw () {
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

        //for (var i = 70; i < 90; i++){
        //if ((this.wmoGroupArray.length) < 5) return;

        for (var i = 0; i < this.wmoGroupArray.length; i++){
            //if (i != 0) continue;
            if (this.wmoGroupArray[i]){
                if (!this.drawGroup[i] && this.drawGroup[i]!==undefined) continue;

                var bpsNode = null;
                if (config.getRenderBSP()) {
                    bpsNode = (this.currentGroupId == i) ? this.wmoGroupArray[i].wmoGroupFile.nodes[this.currentNodeId] : null;
                }
                this.wmoGroupArray[i].draw(ambientColor, bpsNode);
            }
        }
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
    createWorldPortalVerticies () {
        //
        var portalVerticles = this.wmoObj.portalVerticles;
        if (portalVerticles) {
            var worldPortalVerticles = new Array(portalVerticles.length)
        } else {
            var worldPortalVerticles = new Array(0);
            return;
        }

        for (var i = 0; i < worldPortalVerticles.length / 3; i++) {
            var portalVert = vec4.fromValues(
                portalVerticles[3*i + 0],
                portalVerticles[3*i + 1],
                portalVerticles[3*i + 2],
                0
            );

            vec4.transformMat4(portalVert, portalVert, this.placementMatrix);

            worldPortalVerticles[3*i + 0] = portalVert[0];
            worldPortalVerticles[3*i + 1] = portalVert[1];
            worldPortalVerticles[3*i + 2] = portalVert[2];
        }

        this.worldPortalVerticles = worldPortalVerticles;
    }
    drawPortals () {
        if (!this.wmoObj) return;
        if (this.wmoObj.nPortals == 0) return;

        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);

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