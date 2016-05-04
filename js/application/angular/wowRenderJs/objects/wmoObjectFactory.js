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
    hasPortals () {
        return this.wmoObj && this.wmoObj.portalInfos && (this.wmoObj.portalInfos.length > 0);
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
    startTraversingFromInteriorWMO (groupId, cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        //CurrentVisibleM2 and visibleWmo is array of global m2 objects, that are visible after frustum
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, this.placementInvertMatrix);

        /* 1. Create array of visibility with all false */
        var traverseDoodadsVis = new Array(this.doodadsArray.length);
        for (var i=0; i< traverseDoodadsVis.length; i++) {
            traverseDoodadsVis[i] = false;
        }
        var transverseVisitedGroups = new Array(this.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }

        var transverseVisitedPortals = new Array(this.wmoObj.portalInfos.length);
        for (var i = 0; i < transverseVisitedPortals.length; i++) {
            transverseVisitedPortals[i] = false
        }

        this.traverseDoodadsVis = traverseDoodadsVis;
        this.transverseVisitedGroups = transverseVisitedGroups;
        this.transverseVisitedPortals = transverseVisitedPortals;

        this.portalViewFrustums = new Array(this.wmoObj.portalInfos.length);

        this.transverseInteriorWMO(groupId, true, cameraVec4, cameraLocal, perspectiveMat, lookat, [frustumPlanes], 0);

        for (var i = 0; i< traverseDoodadsVis.length; i++) {
            this.doodadsArray[i].setIsRendered(!!traverseDoodadsVis[i]);
        }

        for (var i = 0; i< this.wmoGroupArray.length; i++) {
            this.drawGroup[i] = transverseVisitedGroups[i];
        }
    }
    startTraversingFromExterior(cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, this.placementInvertMatrix);

        /* 1. Create array of visibility with all false */
        var traverseDoodadsVis = new Array(this.doodadsArray.length);
        for (var i=0; i< traverseDoodadsVis.length; i++) {
            traverseDoodadsVis[i] = false;
        }
        var transverseVisitedGroups = new Array(this.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }
        var transverseVisitedPortals = new Array(this.wmoObj.portalInfos.length);
        for (var i = 0; i < transverseVisitedPortals.length; i++) {
            transverseVisitedPortals[i] = false
        }

        this.traverseDoodadsVis = traverseDoodadsVis;
        this.transverseVisitedGroups = transverseVisitedGroups;
        this.transverseVisitedPortals = transverseVisitedPortals;

        for (var i = 0; i< traverseDoodadsVis.length; i++) {
            this.doodadsArray[i].setIsRendered(!!traverseDoodadsVis[i]);
        }

        for (var i = 0; i< this.wmoGroupArray.length; i++) {
            if ((this.wmoObj.groupInfos[i].flags & 0x8) > 0) { //exterior
                this.transverseExteriorWMO(i, false, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, 0)
            }
        }

        for (var i = 0; i< traverseDoodadsVis.length; i++) {
            this.doodadsArray[i].setIsRendered(!!traverseDoodadsVis[i]);
        }

        for (var i = 0; i< this.wmoGroupArray.length; i++) {
            this.drawGroup[i] = transverseVisitedGroups[i];
        }
    }
    traverseGroupPortals(groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level, traverseNextCallback) {
        //2. Loop through portals of current group
        var moprIndex = this.wmoGroupArray[groupId].wmoGroupFile.mogp.moprIndex;
        var numItems = this.wmoGroupArray[groupId].wmoGroupFile.mogp.numItems;
        var portalVertexes = this.wmoObj.portalVerticles;

        for (var j = moprIndex; j < moprIndex+numItems; j++) {
            var relation = this.wmoObj.portalRelations[j];
            var portalInfo = this.wmoObj.portalInfos[relation.portal_index];

            //Skip portals we already visited
            if (this.transverseVisitedPortals[relation.portal_index]) continue;

            var nextGroup = relation.group_index;
            var plane = portalInfo.plane;

            var dotResult = (vec4.dot(vec4.fromValues(plane.x, plane.y, plane.z, plane.w), cameraLocal));
            var isInsidePortalThis = (relation.side < 0) ? (dotResult <= 0) : (dotResult => 0);
            if (!isInsidePortalThis) continue;

            //2.1 If portal has less than 4 vertices - skip it(invalid?)
            if (portalInfo.index_count < 4) continue;

            //2.2 Check if Portal BB made from portal vertexes intersects frustum
            var thisPortalVertices = this.worldPortalVerticles[relation.portal_index];
            var thisPortalVerticesCopy = thisPortalVertices.slice(0);
            for (var i = 0; i < thisPortalVerticesCopy.length; i++)
                thisPortalVerticesCopy[i] = vec4.clone(thisPortalVerticesCopy[i]);

            var visible = true;
            for (var i = 0; visible && i < frustumPlanes.length; i++) {
                visible = visible && mathHelper.planeCull(thisPortalVerticesCopy, frustumPlanes[i]);
            }



            if (!visible) continue;

            this.transverseVisitedPortals[relation.portal_index] = true;

            traverseNextCallback(portalInfo, relation, thisPortalVerticesCopy)
        }
    }
    checkGroupDoodads(groupId, cameraVec4, frustumPlanes){
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
                    //if (mdxObject.getIsRendered()) {
                    var currVis = this.traverseDoodadsVis[doodadWmoIndex];
                    if (currVis) continue;

                    var inFrustum = true;
                    for(var i=0; inFrustum && i<frustumPlanes.length; i++) {
                        inFrustum = inFrustum && mdxObject.checkFrustumCulling(cameraVec4, frustumPlanes[i], frustumPlanes[i].length);
                    }


                    this.traverseDoodadsVis[doodadWmoIndex] = currVis | inFrustum;
                    //}
                }
            }
        }
    }
    transverseInteriorWMO (groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level) {
        var currentlyDrawnGroups = this.drawGroup;
        var self = this;
        this.transverseVisitedGroups[groupId] = true;

        //1. Check visible wmo doodads against frustum
        this.checkGroupDoodads(groupId, cameraVec4, frustumPlanes);

        this.traverseGroupPortals(groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level,
            function(portalInfo, relation, portalVertices){
                var lastFrustumPlanesLen = frustumPlanes.length;

                frustumPlanes.push(vec4.fromValues(portalInfo.plane.x, portalInfo.plane.y, portalInfo.plane.z, portalInfo.plane.w));
                if (portalInfo.index_count = 4) {

                    var thisPortalPlanes = [];

                    //var flip = vec3.dot(eyeMinusPortalVert, [portalInfo.plane.x, portalInfo.plane.y, portalInfo.plane.z]) < 0;
                    var flip = (relation.side < 0);
                    for (var i = 0; i < portalVertices.length; ++i) {
                        var i2 = (i + 1) % portalVertices.length;

                        var n = mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, portalVertices[i], portalVertices[i2]);

                        if (flip) {
                            vec4.scale(n, n, -1)
                        }

                        thisPortalPlanes.push(n);
                    }
                    frustumPlanes.push(thisPortalPlanes);
                }

                if ((self.wmoObj.groupInfos[relation.group_index].flags & 0x2000) > 0) {
                    self.transverseInteriorWMO(relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1)
                } else if (fromInterior) {
                    self.transverseExteriorWMO(relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1);
                }

                frustumPlanes.length = lastFrustumPlanesLen;
            }
        );

    }
    transverseExteriorWMO (groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level) {
        var self = this;
        this.transverseVisitedGroups[groupId] = true;

        //1. Check visible wmo doodads against frustum
        this.checkGroupDoodads(groupId, cameraVec4, frustumPlanes);

        this.traverseGroupPortals(groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level,
            function(portalInfo, relation, portalVertices){
                var lastFrustumPlanesLen = frustumPlanes.length;
                var plane = portalInfo.plane;
                if (portalInfo.index_count = 4) {
                    var thisPortalPlanes = [];

                    var eyeMinusPortalVert = vec3.create();
                    vec3.subtract(eyeMinusPortalVert, cameraVec4, portalVertices[0]);

                    var flip = vec3.dot(eyeMinusPortalVert, [plane.x, plane.y, plane.z]) < 0;
                    //if (relation.side > 0) flip = !flip;
                    for (var i = 0; i < portalVertices.length; ++i) {
                        var i2 = (i + 1) % portalVertices.length;

                        var n = mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, portalVertices[i], portalVertices[i2]);

                        if (!flip) {
                            vec4.scale(n, n, -1)
                        }

                        thisPortalPlanes.push(n);
                    }
                    frustumPlanes.push(thisPortalPlanes);
                }

                if ((self.wmoObj.groupInfos[relation.group_index].flags & 0x2000) > 0) {
                    self.transverseInteriorWMO(relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1)
                } else if (fromInterior) {
                    self.transverseExteriorWMO(relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1);
                }

                frustumPlanes.length = lastFrustumPlanesLen;
            }
        );
    }
    checkFrustumCulling (cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        if (!this.worldGroupBorders) return;
        if (config.getUsePortalCulling() && this.hasPortals()) {
            this.startTraversingFromExterior(cameraVec4, perspectiveMat, lookat, frustumPlanes);
        } else {
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
    }

    /*
     * Update functions
     */

    update () {

    }

    /*
     * Load functions
     */

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

    /*
     * Post load transform functions
     */
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
            var center = vec3.fromValues(0, 0, 0);
            for (j = 0; j < thisPortalVertices.length; j++) {
                vec3.add(center, thisPortalVertices[j], center);
            }
            vec3.scale(center, 1 / thisPortalVertices.length);
            thisPortalVertices.sort(function (a, b) {
                var ac = vec3.create();
                vec3.subtract(ac, a, center);

                var bc = vec3.create();
                vec3.subtract(bc, b, center);

                var cross = vec3.create();
                vec3.cross(cross, ac, bc);

                var dotResult = vec3.dot(cross, [plane.x, plane.y, plane.z]);

                return dotResult;
            });

            worldPortalVertices[i] = thisPortalVertices;
        }

        this.worldPortalVerticles = worldPortalVertices;
    }
    /*
     *      Draw functions
     */
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