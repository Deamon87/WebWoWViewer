import mathHelper from './mathHelper.js'

import {vec4,vec3} from 'gl-matrix';


export default class PortalCullingAlgo {
    startTraversingFromInteriorWMO (wmoObject, groupId, cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        //CurrentVisibleM2 and visibleWmo is array of global m2 objects, that are visible after frustum
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, wmoObject.placementInvertMatrix);

        /* 1. Create array of visibility with all false */
        var traverseDoodadsVis = new Array(wmoObject.doodadsArray.length);
        for (var i=0; i< traverseDoodadsVis.length; i++) {
            traverseDoodadsVis[i] = false;
        }
        var checkedDoodadsVis = new Array(wmoObject.doodadsArray.length);
        for (var i = 0; i< checkedDoodadsVis.length; i++) {
            checkedDoodadsVis[i] = 99;
        }


        var transverseVisitedGroups = new Array(wmoObject.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }

        var transverseVisitedPortals = new Array(wmoObject.wmoObj.portalInfos.length);
        for (var i = 0; i < transverseVisitedPortals.length; i++) {
            transverseVisitedPortals[i] = false
        }

        this.traverseDoodadsVis = traverseDoodadsVis;
        this.checkedDoodadsVis = checkedDoodadsVis;
        this.transverseVisitedGroups = transverseVisitedGroups;
        this.transverseVisitedPortals = transverseVisitedPortals;

        this.portalViewFrustums = new Array(wmoObject.wmoObj.portalInfos.length);

        this.transverseInteriorWMO(wmoObject, groupId, true, cameraVec4, cameraLocal, perspectiveMat, lookat, [frustumPlanes], 0);

        for (var i = 0; i< traverseDoodadsVis.length; i++) {
            wmoObject.doodadsArray[i].setIsRendered(!!traverseDoodadsVis[i]);
        }

        for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
            wmoObject.drawGroup[i] = transverseVisitedGroups[i];
        }
    }
    startTraversingFromExterior(wmoObject, cameraVec4, perspectiveMat, lookat, frustumPlanes) {
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, wmoObject.placementInvertMatrix);

        /* 1. Create array of visibility with all false */
        var traverseDoodadsVis = new Array(wmoObject.doodadsArray.length);
        for (var i=0; i< traverseDoodadsVis.length; i++) {
            traverseDoodadsVis[i] = false;
        }
        var transverseVisitedGroups = new Array(wmoObject.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }
        var transverseVisitedPortals = new Array(wmoObject.wmoObj.portalInfos.length);
        for (var i = 0; i < transverseVisitedPortals.length; i++) {
            transverseVisitedPortals[i] = false
        }

        this.traverseDoodadsVis = traverseDoodadsVis;
        this.transverseVisitedGroups = transverseVisitedGroups;
        this.transverseVisitedPortals = transverseVisitedPortals;

        for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
            if ((wmoObject.wmoObj.groupInfos[i].flags & 0x8) > 0) { //exterior
                if (wmoObject.checkGroupFrustum(cameraVec4, i, frustumPlanes)[1]) {
                    this.transverseExteriorWMO(wmoObject, i, false, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, 0)
                }
            }
        }

        for (var i = 0; i< traverseDoodadsVis.length; i++) {
            wmoObject.doodadsArray[i].setIsRendered(!!traverseDoodadsVis[i]);
        }

        for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
            wmoObject.drawGroup[i] = transverseVisitedGroups[i];
        }
    }
    traverseGroupPortals(wmoObject, groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level, traverseNextCallback) {
        //2. Loop through portals of current group
        var moprIndex = wmoObject.wmoGroupArray[groupId].wmoGroupFile.mogp.moprIndex;
        var numItems = wmoObject.wmoGroupArray[groupId].wmoGroupFile.mogp.numItems;
        var portalVertexes = wmoObject.wmoObj.portalVerticles;

        for (var j = moprIndex; j < moprIndex+numItems; j++) {
            var relation = wmoObject.wmoObj.portalRelations[j];
            var portalInfo = wmoObject.wmoObj.portalInfos[relation.portal_index];

            //Skip portals we already visited
            if (this.transverseVisitedPortals[relation.portal_index]) continue;

            var nextGroup = relation.group_index;
            var plane = portalInfo.plane;

            var dotResult = (vec4.dot(vec4.fromValues(plane.x, plane.y, plane.z, plane.w), cameraLocal));
            dotResult = dotResult + relation.side*0.01;
            var isInsidePortalThis = (relation.side < 0) ? (dotResult <= 0) : (dotResult => 0);
            if (!isInsidePortalThis) continue;

            //2.1 If portal has less than 4 vertices - skip it(invalid?)
            if (portalInfo.index_count < 4) continue;

            //2.2 Check if Portal BB made from portal vertexes intersects frustum
            var thisPortalVertices = wmoObject.worldPortalVerticles[relation.portal_index];
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
    checkGroupDoodads(wmoObject, groupId, cameraVec4, frustumPlanes, level){
        if (wmoObject.wmoGroupArray[groupId]) {
            var doodadRefs = wmoObject.wmoGroupArray[groupId].wmoGroupFile.doodadRefs;
            var doodadsSet = wmoObject.currentDoodadSet;

            if (doodadRefs) {
                for (var j = 0; j < doodadRefs.length; j++) {
                    var doodadIndex = doodadRefs[j];
                    if (
                        (doodadIndex - doodadsSet.index < 0) ||
                        (doodadIndex > doodadsSet.index + doodadsSet.number - 1)
                    ) continue;

                    var doodadWmoIndex = doodadIndex - doodadsSet.index;
                    if ((this.checkedDoodadsVis[doodadWmoIndex] < level)){
                        continue;
                    } else {
                        this.checkedDoodadsVis[doodadWmoIndex] = level;
                    }

                    var mdxObject = wmoObject.doodadsArray[doodadWmoIndex];
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
    transverseInteriorWMO (wmoObject, groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level) {
        var currentlyDrawnGroups = wmoObject.drawGroup;
        var self = this;
        this.transverseVisitedGroups[groupId] = true;

        //1. Check visible wmo doodads against frustum
        this.checkGroupDoodads(wmoObject, groupId, cameraVec4, frustumPlanes, level);

        this.traverseGroupPortals(wmoObject, groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level,
            function(portalInfo, relation, portalVertices){
                var lastFrustumPlanesLen = frustumPlanes.length;

                //;
                if (portalInfo.index_count = 4) {

                    var thisPortalPlanes = [];
                    var flip = (relation.side < 0);

                    var nearPlane = vec4.fromValues(portalInfo.plane.x, portalInfo.plane.y, portalInfo.plane.z, portalInfo.plane.w)
                    if (flip) {
                        vec4.scale(nearPlane, nearPlane, -1)
                    }
                    thisPortalPlanes.push(nearPlane);
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

                if ((wmoObject.wmoObj.groupInfos[relation.group_index].flags & 0x2000) > 0) {
                    self.transverseInteriorWMO(wmoObject, relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1)
                } else if (fromInterior) {
                    self.transverseExteriorWMO(wmoObject, relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1);
                }

                frustumPlanes.length = lastFrustumPlanesLen;
            }
        );

    }
    transverseExteriorWMO (wmoObject, groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level) {
        var self = this;
        this.transverseVisitedGroups[groupId] = true;

        //1. Check visible wmo doodads against frustum
        this.checkGroupDoodads(wmoObject, groupId, cameraVec4, frustumPlanes, level);

        this.traverseGroupPortals(wmoObject, groupId, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level,
            function(portalInfo, relation, portalVertices){
                var lastFrustumPlanesLen = frustumPlanes.length;
                var plane = portalInfo.plane;
                if (portalInfo.index_count = 4) {
                    var thisPortalPlanes = [];

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

                if ((wmoObject.wmoObj.groupInfos[relation.group_index].flags & 0x2000) > 0) {
                    self.transverseInteriorWMO(wmoObject, relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1)
                } else if (fromInterior) {
                    self.transverseExteriorWMO(wmoObject, relation.group_index, fromInterior, cameraVec4, cameraLocal, perspectiveMat, lookat, frustumPlanes, level+1);
                }

                frustumPlanes.length = lastFrustumPlanesLen;
            }
        );
    }
}