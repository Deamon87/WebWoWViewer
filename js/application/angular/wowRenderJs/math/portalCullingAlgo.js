import mathHelper from './mathHelper.js'

import {vec4,vec3} from 'gl-matrix';


export default class PortalCullingAlgo {
    startTraversingFromInteriorWMO (wmoObject, groupId, cameraVec4, lookat, frustumPlanes, m2RenderedThisFrame) {
        //CurrentVisibleM2 and visibleWmo is array of global m2 objects, that are visible after frustum
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, wmoObject.placementInvertMatrix);

        /* 1. Create array of visibility with all false */
        var transverseVisitedGroups = new Array(wmoObject.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }

        var transverseVisitedPortals = new Array(wmoObject.wmoObj.portalInfos.length);
        for (var i = 0; i < transverseVisitedPortals.length; i++) {
            transverseVisitedPortals[i] = false
        }

        this.transverseVisitedGroups = transverseVisitedGroups;
        this.transverseVisitedPortals = transverseVisitedPortals;

        this.portalViewFrustums = new Array(wmoObject.wmoObj.portalInfos.length);
        this.exteriorPortals = new Array();
        this.interiorPortals = new Array();

        this.interiorPortals.push({groupId: groupId, portalIndex : -1, frustumPlanes: [frustumPlanes], level : 0});
        this.transverseGroupWMO(wmoObject, groupId, true, cameraVec4, cameraLocal, lookat, [frustumPlanes], 0, m2RenderedThisFrame);

        //If there are portals leading to exterior, we need to go through all exterior wmos.
        //Because it's not guaranteed that exterior wmo, that portals lead to, have portal connections to all visible interior wmo
        var wmoM2Candidates = new Set();
        if (this.exteriorPortals.length > 0) {
            for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
                if ((wmoObject.wmoObj.groupInfos[i].flags & 0x8) > 0) { //exterior
                    if (wmoObject.wmoGroupArray[i].checkGroupFrustum(cameraVec4, frustumPlanes, null, wmoM2Candidates)) {
                        this.exteriorPortals.push({groupId: i, portalIndex : -1, frustumPlanes: [frustumPlanes], level : 0});
                        this.transverseGroupWMO(wmoObject, i, false, cameraVec4, cameraLocal, lookat, [frustumPlanes], 0, m2RenderedThisFrame)
                    }
                }
            }
        }

        wmoM2Candidates.forEach(function (value) {
            var m2Object = value;
            if (!m2Object) return;

            var result = m2Object.checkFrustumCulling(cameraVec4, frustumPlanes, 6, false);
            m2Object.setIsRendered(result);
            if (result) m2RenderedThisFrame.add(m2Object);
        });

        var atLeastOneIsDrawn = false;
        for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
            if (transverseVisitedGroups[i]) atLeastOneIsDrawn = true;
            wmoObject.wmoGroupArray[i].setIsRendered(transverseVisitedGroups[i]);
        }

        wmoObject.exteriorPortals = this.exteriorPortals;
        wmoObject.interiorPortals = this.interiorPortals;

        return atLeastOneIsDrawn;
    }
    startTraversingFromExterior(wmoObject, cameraVec4, lookat, frustumPlanes, m2RenderedThisFrame) {
        var cameraLocal = vec4.create();
        vec4.transformMat4(cameraLocal, cameraVec4, wmoObject.placementInvertMatrix);

        /* 1. Create array of visibility with all false */
        var transverseVisitedGroups = new Array(wmoObject.wmoGroupArray.length);
        for (var i = 0; i < transverseVisitedGroups.length; i++) {
            transverseVisitedGroups[i] = false;
        }
        var transverseVisitedPortals = new Array(wmoObject.wmoObj.portalInfos.length);
        for (var i = 0; i < transverseVisitedPortals.length; i++) {
            transverseVisitedPortals[i] = false
        }

        this.transverseVisitedGroups = transverseVisitedGroups;
        this.transverseVisitedPortals = transverseVisitedPortals;

        this.exteriorPortals = new Array();
        this.interiorPortals = new Array();

        var wmoM2Candidates = new Set();
        for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
            if ((wmoObject.wmoObj.groupInfos[i].flags & 0x8) > 0) { //exterior
                if (wmoObject.wmoGroupArray[i].checkGroupFrustum(cameraVec4,  frustumPlanes, null, wmoM2Candidates)) {
                    this.exteriorPortals.push({groupId: i, portalIndex : -1, frustumPlanes: [frustumPlanes], level : 0});
                    this.transverseGroupWMO(wmoObject, i, false, cameraVec4, cameraLocal, lookat, [frustumPlanes], 0, wmoM2Candidates)
                }
            }
        }


        wmoM2Candidates.forEach(function (value) {
            var m2Object = value;
            if (!m2Object) return;

            var result = m2Object.checkFrustumCulling(cameraVec4, frustumPlanes, 6, false);
            m2Object.setIsRendered(result);
            if (result) m2RenderedThisFrame.add(m2Object);
        });


        var atLeastOneIsDrawn = false;
        for (var i = 0; i< wmoObject.wmoGroupArray.length; i++) {
            if (transverseVisitedGroups[i]) atLeastOneIsDrawn = true;
            wmoObject.wmoGroupArray[i].setIsRendered(transverseVisitedGroups[i]);
        }

        wmoObject.exteriorPortals = this.exteriorPortals;
        wmoObject.interiorPortals = this.interiorPortals;

        return atLeastOneIsDrawn;
    }
    checkGroupDoodads(wmoObject, groupId, cameraVec4, frustumPlanes, level, m2ObjectSet){
        var groupWmoObject = wmoObject.wmoGroupArray[groupId];
        if (groupWmoObject) {
            for (var j = 0; j < groupWmoObject.wmoDoodads.length; j++) {
                var mdxObject = groupWmoObject.wmoDoodads[j];
                if (!mdxObject) continue;
                if (m2ObjectSet.has(mdxObject)) continue;

                if (groupWmoObject.dontUseLocalLightingForM2) {
                    mdxObject.setUseLocalLighting(false);
                }

                var inFrustum = true;
                if (mdxObject.loaded) {
                    for (var i = 0; inFrustum && i < frustumPlanes.length; i++) {
                        inFrustum = inFrustum && mdxObject.checkFrustumCulling(cameraVec4, frustumPlanes[i], frustumPlanes[i].length);
                    }
                }
                if (inFrustum) {
                    m2ObjectSet.add(mdxObject);
                }
            }
        }
    }
    transverseGroupWMO (wmoObject, groupId, fromInterior, cameraVec4, cameraLocal, lookat, frustumPlanes, level, m2ObjectSet) {
        this.transverseVisitedGroups[groupId] = true;

        if (level > 8) return;

        if (!wmoObject.wmoGroupArray[groupId].loaded) {
            //The group have not been loaded yet
            return ;
        }

        this.checkGroupDoodads(wmoObject, groupId, cameraVec4, frustumPlanes, level, m2ObjectSet);

        //2. Loop through portals of current group
        var moprIndex = wmoObject.wmoGroupArray[groupId].wmoGeom.wmoGroupFile.mogp.moprIndex;
        var numItems = wmoObject.wmoGroupArray[groupId].wmoGeom.wmoGroupFile.mogp.numItems;
        var portalVertexes = wmoObject.wmoObj.portalVerticles;

        for (var j = moprIndex; j < moprIndex+numItems; j++) {
            var relation = wmoObject.wmoObj.portalRelations[j];
            var portalInfo = wmoObject.wmoObj.portalInfos[relation.portal_index];

            var nextGroup = relation.group_index;
            var plane = portalInfo.plane;

            //Skip portals we already visited
            if (this.transverseVisitedPortals[relation.portal_index]) continue;
            if (!fromInterior && (wmoObject.wmoObj.groupInfos[nextGroup].flags & 0x2000) == 0) continue;

            var dotResult = (vec4.dot(vec4.fromValues(plane.x, plane.y, plane.z, plane.w), cameraLocal));
            dotResult = dotResult + relation.side * 0.01;
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
            mathHelper.sortVec3ArrayAgainstPlane(thisPortalVerticesCopy, plane);

            this.transverseVisitedPortals[relation.portal_index] = true;

            var lastFrustumPlanesLen = frustumPlanes.length;

            //3. Construct frustum planes for this portal
            var thisPortalPlanes = [];
            var flip = (relation.side < 0);

            for (var i = 0; i < thisPortalVerticesCopy.length; ++i) {
                var i2 = (i + 1) % thisPortalVerticesCopy.length;

                var n = mathHelper.createPlaneFromEyeAndVertexes(cameraVec4, thisPortalVerticesCopy[i], thisPortalVerticesCopy[i2]);

                if (flip) {
                    vec4.scale(n, n, -1)
                }

                thisPortalPlanes.push(n);
            }
            //frustumPlanes.push(thisPortalPlanes);

            /*var nearPlane = vec4.fromValues(portalInfo.plane.x, portalInfo.plane.y, portalInfo.plane.z, portalInfo.plane.w)
            if (!flip) {
                vec4.scale(nearPlane, nearPlane, -1)
            }
            thisPortalPlanes.push(nearPlane);
              */
            //thisPortalPlanes.push(frustumPlanes[frustumPlanes.length-2]);
            //thisPortalPlanes.push(frustumPlanes[frustumPlanes.length-1]);

            //5. Traverse next
            if ((wmoObject.wmoObj.groupInfos[nextGroup].flags & 0x2000) > 0) {
                //5.1 The portal is into interior wmo group. So go on.
                this.interiorPortals.push({groupId: nextGroup, portalIndex : relation.portal_index, frustumPlanes: [thisPortalPlanes], level : level+1});
                this.transverseGroupWMO(wmoObject, nextGroup, fromInterior, cameraVec4, cameraLocal, lookat, [thisPortalPlanes], level+1, m2ObjectSet)
            } else if (fromInterior) {
                //5.2 The portal is from interior into exterior wmo group.
                //Make sense to add only if whole traversing process started from interior
                this.exteriorPortals.push({groupId: nextGroup, portalIndex : relation.portal_index, frustumPlanes: [thisPortalPlanes], level : level+1});
                this.transverseGroupWMO(wmoObject, nextGroup, false, cameraVec4, cameraLocal, lookat, [thisPortalPlanes], level+1, m2ObjectSet)
            }

            frustumPlanes.length = lastFrustumPlanesLen;
        }
    }
}