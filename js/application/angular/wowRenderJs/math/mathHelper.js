import {vec4, vec3, mat4, mat3} from 'gl-matrix';

class MathHelper {
    static getFrustumClipsFromMatrix(mat) {
        var planes = new Array(6);
        // Right clipping plane.
        planes[0] = vec4.fromValues(mat[3] - mat[0],
            mat[7] - mat[4],
            mat[11] - mat[8],
            mat[15] - mat[12]);
        // Left clipping plane.
        planes[1] = vec4.fromValues(mat[3] + mat[0],
            mat[7] + mat[4],
            mat[11] + mat[8],
            mat[15] + mat[12]);
        // Bottom clipping plane.
        planes[2] = vec4.fromValues(mat[3] + mat[1],
            mat[7] + mat[5],
            mat[11] + mat[9],
            mat[15] + mat[13]);
        // Top clipping plane.
        planes[3] = vec4.fromValues(mat[3] - mat[1],
            mat[7] - mat[5],
            mat[11] - mat[9],
            mat[15] - mat[13]);
        // Far clipping plane.
        planes[4] = vec4.fromValues(mat[3] - mat[2],
            mat[7] - mat[6],
            mat[11] - mat[10],
            mat[15] - mat[14]);
        // Near clipping plane.
        planes[5] = vec4.fromValues(mat[3] + mat[2],
            mat[7] + mat[6],
            mat[11] + mat[10],
            mat[15] + mat[14]);

        for (var i = 0; i < 6; i++) {
            //Hand made normalize
            var invVecLength = 1 / vec3.length(planes[i]);
            vec4.scale(planes[i], planes[i], invVecLength);
        }

        return planes;
    }

    static fixNearPlane(planes, camera) {
        var nearPlane = planes[5];
        var cameraVec4 = vec4.fromValues(camera[0], camera[1], camera[2], 1);
        var dist = vec4.dot(nearPlane, cameraVec4);
        nearPlane[3] -= dist;
    }

    static isPointInsideAABB(aabb, p) {
        var result = p[0] > aabb[0][0] && p[0] < aabb[1][0] &&
            p[1] > aabb[0][1] && p[1] < aabb[1][1] &&
            p[2] > aabb[0][2] && p[2] < aabb[1][2];
        return result;
    }

    static distanceFromAABBToPoint(aabb, p) {
        function distance_aux(p, lower, upper) {
            if (p < lower) return lower - p;
            if (p > upper)  return p - upper;
            return 0
        }

        var dx = distance_aux(p[0], aabb[0][0], aabb[1][0]);
        var dy = distance_aux(p[1], aabb[0][1], aabb[1][1]);
        var dz = distance_aux(p[2], aabb[0][2], aabb[1][2]);

        if (MathHelper.isPointInsideAABB(aabb, p))
            return Math.min(dx, dy, dz);    // or 0 in case of distance from the area
        else
            return Math.sqrt(dx * dx + dy * dy + dz * dz)
    }

    static sortVec3ArrayAgainstPlane(thisPortalVertices, plane) {
        var center = vec3.fromValues(0, 0, 0);
        for (var j = 0; j < thisPortalVertices.length; j++) {
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
    }

    static planeCull(points, planes) {
        function intersection(p1, p2, k) {
            return vec4.fromValues(
                p1[0] + k * (p2[0] - p1[0]),
                p1[1] + k * (p2[1] - p1[1]),
                p1[2] + k * (p2[2] - p1[2]),
                1
            );
        }

        // check box outside/inside of frustum
        var vec4Points = new Array(points.length);
        for (var j = 0; j < points.length; j++) {
            vec4Points[j] = vec4.fromValues(points[j][0], points[j][1], points[j][2], 1.0)
        }

        for (var i = 0; i < planes.length; i++) {
            var out = 0;
            var epsilon = 0;

            for (var j = 0; j < vec4Points.length; j++) {
                out += ((vec4.dot(planes[i], vec4Points[j]) + epsilon < 0.0 ) ? 1 : 0);
            }

            if (out == vec4Points.length) return false;

            //---------------------------------
            // Cull by points by current plane
            //---------------------------------
            var resultPoints = new Array();
            var pointO;
            if (planes[i][2] != 0) {
                pointO = vec3.fromValues(0, 0, -planes[i][3] / planes[i][2]);
            } else if (planes[i][1] != 0) {
                pointO = vec3.fromValues(0, -planes[i][3] / planes[i][1], 0);
            } else if (planes[i][0] != 0) {
                pointO = vec3.fromValues(-planes[i][3] / planes[i][0], 0, 0);
            } else {
                continue;
            }

            for (j = 0; j < vec4Points.length; j++) {
                var p1 = vec4Points[j];
                var p2 = vec4Points[(j + 1) % vec4Points.length];

                // InFront = plane.Distance( point ) > 0.0f
                // Behind  = plane.Distance( point ) < 0.0f

                var t1 = vec4.dot(p1, planes[i]);
                var t2 = vec4.dot(p2, planes[i]);

                if (t1 > 0 && t2 > 0) { //p1 InFront and p2 InFront
                    resultPoints.push(p2)
                } else if (t1 > 0 && t2 < 0) { //p1 InFront and p2 Behind
                    var k = t1 / (t1 - t2);
                    resultPoints.push(intersection(p1, p2, k))
                } else if (t1 < 0 && t2 > 0) { //p1 Behind and p2 Behind
                    var k = t1 / (t1 - t2);
                    resultPoints.push(intersection(p1, p2, k))
                    resultPoints.push(p2)
                }
            }
            vec4Points = resultPoints;
        }

        for (var j = 0; j < vec4Points.length; j++) {
            points[j] = vec4Points[j];
        }

        return vec4Points.length > 2;
    }


    static createPlaneFromVertexes(vertex1, vertex2, vertex3) {
        var edgeDir1 = vec4.create();

        vec3.subtract(edgeDir1, vertex1, vertex2);
        vec3.normalize(edgeDir1, edgeDir1);

        var edgeDir2 = vec4.create();

        vec3.subtract(edgeDir2, vertex1, vertex3);
        vec3.normalize(edgeDir2, edgeDir2);

        var planeNorm = vec4.create();
        vec3.cross(planeNorm, edgeDir2, edgeDir1);
        vec3.normalize(planeNorm, planeNorm);

        planeNorm[3] = 1;

        //Plane fpl(planeNorm, dot(planeNorm, vertexA))
        var distToPlane = vec4.dot(planeNorm, vertex1);
        planeNorm[3] = distToPlane;

    }

    static createPlaneFromEyeAndVertexes(eye, vertex1, vertex2) {
        var edgeDir1 = vec4.create();
        vec3.subtract(edgeDir1, vertex1, eye);

        var edgeDir2 = vec4.create();
        vec3.subtract(edgeDir2, vertex2, eye);

        //planeNorm=cross(viewDir, edgeDir)
        var planeNorm = vec4.create();
        vec3.cross(planeNorm, edgeDir2, edgeDir1);
        vec3.normalize(planeNorm, planeNorm);

        //Plane fpl(planeNorm, dot(planeNorm, vertexA))
        var distToPlane = vec3.dot(planeNorm, eye);
        planeNorm[3] = -distToPlane;

        return planeNorm;
    }

    static GetPolyFrustum(poly, num_verts, frustum, eye) {
        var v1, v2;

        for (var i = 0; i <= (num_verts - 1); i++) {
            v1 = poly[(i + 1) % num_verts];
            v2 = poly[i];

            //Normal start
            var edgeDir = vec4.create();

            vec3.subtract(edgeDir, v1, v2);
            vec3.normalize(edgeDir, edgeDir);

            //viewToPointDir = normalize(((vertexA+vertexB)*0.5)-viewPos)
            var viewToPointDir = vec4.create();
            vec3.add(viewToPointDir, v1, v2);
            vec3.scale(viewToPointDir, viewToPointDir, 0.5);
            vec3.subtract(viewToPointDir, viewToPointDir, eye);
            vec3.normalize(viewToPointDir, viewToPointDir);

            //planeNorm=cross(viewDir, edgeDir)
            frustum[i] = vec4.create();
            vec3.cross(frustum[i], viewToPointDir, edgeDir);
            vec3.normalize(frustum[i], frustum[i]);

            frustum[i][3] = 1;

            //Plane fpl(planeNorm, dot(planeNorm, vertexA))
            var distToPlane = vec4.dot(frustum[i], v1);
            frustum[i][3] = -distToPlane;
        }
    }

    static calcZ(p1, p2, p3, x, y) {
        var det = (p2[1] - p3[1]) * (p1[0] - p3[0]) + (p3[0] - p2[0]) * (p1[1] - p3[1]);

        if (det > -0.001 && det < 0.001) {
            return Math.min(p1[0], p2[0], p3[0]);
        }

        var l1 = ((p2[1] - p3[1]) * (x - p3[0]) + (p3[0] - p2[0]) * (y - p3[1])) / det;
        var l2 = ((p3[1] - p1[1]) * (x - p3[0]) + (p1[0] - p3[0]) * (y - p3[1])) / det;
        var l3 = 1.0 - l1 - l2;

        return l1 * p1[2] + l2 * p2[2] + l3 * p3[2];
    }

    static getBarycentric(p, a, b, c) {
        var v0 = vec3.create();
        vec3.subtract(v0, b, a);
        var v1 = vec3.create();
        vec3.subtract(v1, c, a);
        var v2 = vec3.create();
        vec3.subtract(v2, p, a);

        var d00 = vec3.dot(v0, v0);
        var d01 = vec3.dot(v0, v1);
        var d11 = vec3.dot(v1, v1);

        var d20 = vec3.dot(v2, v0);
        var d21 = vec3.dot(v2, v1);
        var denom = d00 * d11 - d01 * d01;
        if ((denom < 0.0001) && (denom > -0.0001)) {
            return vec3.fromValues(-1, -1, -1)
        };

        var v = (d11 * d20 - d01 * d21) / denom;
        var w = (d00 * d21 - d01 * d20) / denom;
        var u = 1.0 - v - w;
        return vec3.fromValues(u, v, w)
    }

    static checkFrustum(planes, box, num_planes, points) {
        // check box outside/inside of frustum
        points = null;
        for (var i = 0; i < num_planes; i++) {
            var out = 0;
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[0][1], box[0][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[0][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[1][1], box[0][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[1][1], box[0][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[0][1], box[1][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[1][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[1][1], box[1][2], 1.0)) < 0.0 ) ? 1 : 0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[1][1], box[1][2], 1.0)) < 0.0 ) ? 1 : 0);
            if (out == 8) return false;
        }

        // check frustum outside/inside box
        if (points) {
            out = 0; for (var i = 0; i < 8; i++) out += ((points[i][0] > box[1][0]) ? 1 : 0); if (out == 8) return false;
            out = 0; for (var i = 0; i < 8; i++) out += ((points[i][0] < box[0][0]) ? 1 : 0); if (out == 8) return false;
            out = 0; for (var i = 0; i < 8; i++) out += ((points[i][1] > box[1][1]) ? 1 : 0); if (out == 8) return false;
            out = 0; for (var i = 0; i < 8; i++) out += ((points[i][1] < box[0][1]) ? 1 : 0); if (out == 8) return false;
            out = 0; for (var i = 0; i < 8; i++) out += ((points[i][2] > box[1][2]) ? 1 : 0); if (out == 8) return false;
            out = 0; for (var i = 0; i < 8; i++) out += ((points[i][2] < box[0][2]) ? 1 : 0); if (out == 8) return false;
        }

        return true;
    }

    static getFrustumPoints(perspectiveMatrix, viewMatrix) {
        const frustumPoints =
            [
                [-1, -1, -1], //0
                [1, -1, -1],  //1
                [1, -1, 1],   //2
                [-1, -1, 1],  //3
                [-1, 1, 1],   //4
                [1, 1, 1],    //5
                [1, 1, -1],   //6
                [-1, 1, -1]   //7
            ];


        var inverseMat = mat4.create();
        mat4.multiply(inverseMat, perspectiveMatrix, viewMatrix);
        mat4.invert(inverseMat, inverseMat);

        var points = [];
        for (var i = 0; i < 8; i++) {
            points[i] = vec4.fromValues(frustumPoints[i][0], frustumPoints[i][1], frustumPoints[i][2], 1);
            vec4.transformMat4(points[i], points[i], inverseMat);
            vec4.scale(points[i], points[i], 1 / points[i][3])
        }

        return points;
    }

    static transformAABBWithMat4(mat4, aabb) {
        //Adapted from http://dev.theomader.com/transform-bounding-boxes/
        var xa = vec4.create();
        var xb = vec4.create();
        vec4.scale(xa, vec4.fromValues(mat4[0], mat4[1], mat4[2], mat4[3]), aabb[0][0]);
        vec4.scale(xb, vec4.fromValues(mat4[0], mat4[1], mat4[2], mat4[3]), aabb[1][0]);

        var ya = vec4.create();
        var yb = vec4.create();
        vec4.scale(ya, vec4.fromValues(mat4[4], mat4[5], mat4[6], mat4[7]), aabb[0][1]);
        vec4.scale(yb, vec4.fromValues(mat4[4], mat4[5], mat4[6], mat4[7]), aabb[1][1]);

        var za = vec4.create();
        var zb = vec4.create();
        vec4.scale(za, vec4.fromValues(mat4[8], mat4[9], mat4[10], mat4[11]), aabb[0][2]);
        vec4.scale(zb, vec4.fromValues(mat4[8], mat4[9], mat4[10], mat4[11]), aabb[1][2]);

        var vecx_min = vec4.create();
        var vecy_min = vec4.create();
        var vecz_min = vec4.create();
        var vecx_max = vec4.create();
        var vecy_max = vec4.create();
        var vecz_max = vec4.create();

        vec3.min(vecx_min, xa, xb);
        vec3.max(vecx_max, xa, xb);
        vec3.min(vecy_min, ya, yb);
        vec3.max(vecy_max, ya, yb);
        vec3.min(vecz_min, za, zb);
        vec3.max(vecz_max, za, zb);

        var translation = vec4.fromValues(mat4[12], mat4[13], mat4[14], 0);

        var bb_min = vec4.create();
        var bb_max = vec4.create();

        vec4.add(bb_min, vecx_min, vecy_min);
        vec4.add(bb_min, bb_min, vecz_min);
        vec4.add(bb_min, bb_min, translation);

        vec4.add(bb_max, vecx_max, vecy_max);
        vec4.add(bb_max, bb_max, vecz_max);
        vec4.add(bb_max, bb_max, translation);

        return [
            bb_min,
            bb_max
        ];
    }

    /*
     WMO specific algorithms
     */
    static queryBspTree(bbox, nodeId, nodes, bspLeafIdList) {
        if (nodeId == -1) return;

        if ((nodes[nodeId].planeType & 0x4)) {
            bspLeafIdList.push(nodeId);
        } else if ((nodes[nodeId].planeType == 0)) {
            var leftSide = MathHelper.checkFrustum([[-1, 0, 0, nodes[nodeId].fDist]], bbox, 1, null);
            var rightSide = MathHelper.checkFrustum([[1, 0, 0, -nodes[nodeId].fDist]], bbox, 1, null);

            if (leftSide) {
                MathHelper.queryBspTree(bbox, nodes[nodeId].children1, nodes, bspLeafIdList)
            }
            if (rightSide) {
                MathHelper.queryBspTree(bbox, nodes[nodeId].children2, nodes, bspLeafIdList)
            }
        } else if ((nodes[nodeId].planeType == 1)) {
            var leftSide = MathHelper.checkFrustum([[0, -1, 0, nodes[nodeId].fDist]], bbox, 1, null);
            var rightSide = MathHelper.checkFrustum([[0, 1, 0, -nodes[nodeId].fDist]], bbox, 1, null);

            if (leftSide) {
                MathHelper.queryBspTree(bbox, nodes[nodeId].children1, nodes, bspLeafIdList)
            }
            if (rightSide) {
                MathHelper.queryBspTree(bbox, nodes[nodeId].children2, nodes, bspLeafIdList)
            }
        } else if ((nodes[nodeId].planeType == 2)) {
            var leftSide = MathHelper.checkFrustum([[0, 0, -1, nodes[nodeId].fDist]], bbox, 1, null);
            var rightSide = MathHelper.checkFrustum([[0, 0, 1, -nodes[nodeId].fDist]], bbox, 1, null);

            if (leftSide) {
                MathHelper.queryBspTree(bbox, nodes[nodeId].children1, nodes, bspLeafIdList)
            }
            if (rightSide) {
                MathHelper.queryBspTree(bbox, nodes[nodeId].children2, nodes, bspLeafIdList)
            }
        }
    }

    static checkIfInsidePortals(point, groupFile, parentWmoFile) {
        var moprIndex = groupFile.mogp.moprIndex;
        var numItems = groupFile.mogp.numItems;

        var insidePortals = true;
        for (var j = moprIndex; j < moprIndex+numItems; j++) {
            var relation = parentWmoFile.portalRelations[j];
            var portalInfo = parentWmoFile.portalInfos[relation.portal_index];

            var nextGroup = relation.group_index;
            var plane = portalInfo.plane;

            var minX = 99999;
            var minY = 99999;
            var minZ = 99999;
            var maxX = -99999;
            var maxY = -99999;
            var maxZ = -99999;


            var base_index = portalInfo.base_index;
            var portalVerticles = parentWmoFile.portalVerticles;
            for (var k = 0; k < portalInfo.index_count; k++) {
                minX = Math.min(minX, portalVerticles[3 * (base_index + k)    ]);
                minY = Math.min(minY, portalVerticles[3 * (base_index + k) + 1]);
                minZ = Math.min(minZ, portalVerticles[3 * (base_index + k) + 2]);

                maxX = Math.max(maxX, portalVerticles[3 * (base_index + k)    ]);
                maxY = Math.max(maxX, portalVerticles[3 * (base_index + k) + 1]);
                maxZ = Math.max(maxZ, portalVerticles[3 * (base_index + k) + 2]);
            }

            var distanceToBB = MathHelper.distanceFromAABBToPoint([[minX, minY, minZ],[maxX, maxY, maxZ]], point);

            var dotResult = (vec4.dot(vec4.fromValues(plane.x, plane.y, plane.z, plane.w), point));
            var isInsidePortalThis = (relation.side < 0) ? (dotResult <= 0) : (dotResult >= 0);
            if (!isInsidePortalThis && (Math.abs(dotResult) < 0.1) && (Math.abs(distanceToBB) < 0.1)) {
                insidePortals = false;
                break;
            }
        }

        return insidePortals;
    }
    static calculateFrustumPoints(planes, numPlanes) {
        var points = [];
        for (var i = 0; i < numPlanes-2; i++) {
            for (var j = i+1; j < numPlanes-1; j++) {
                for (var k = j + 1; k < numPlanes; k++) {
                    //Using Cramer's rule
                    var detMat3 = mat3.fromValues(
                        planes[i][0],planes[j][0],planes[k][0],
                        planes[i][1],planes[j][1],planes[k][1],
                        planes[i][2],planes[j][2],planes[k][2]
                    );
                    var det = mat3.determinant(detMat3);
                    if ((det > -0.0001) && (det < 0.0001)) continue;

                    var det1Mat3 = mat3.fromValues(
                        -planes[i][3],-planes[j][3],-planes[k][3],
                        planes[i][1],planes[j][1],planes[k][1],
                        planes[i][2],planes[j][2],planes[k][2]
                    );
                    var det2Mat3 = mat3.fromValues(
                        planes[i][0],planes[j][0],planes[k][0],
                        -planes[i][3],-planes[j][3],-planes[k][3],
                        planes[i][2],planes[j][2],planes[k][2]
                    );
                    var det3Mat3 = mat3.fromValues(
                        planes[i][0],planes[j][0],planes[k][0],
                        planes[i][1],planes[j][1],planes[k][1],
                        -planes[i][3],-planes[j][3],-planes[k][3]
                    );
                    var x = mat3.determinant(det1Mat3) / det;
                    var y = mat3.determinant(det2Mat3) / det;
                    var z = mat3.determinant(det3Mat3) / det;

                    points.push(vec3.fromValues(x,y,z))
                }
            }
        }

        return points;
    }

    static getTopAndBottomTriangleFromBsp(cameraLocal, groupFile, parentWmoFile, bspLeafList) {
        var result = 0;
        var nodes = groupFile.nodes;
        var topZ = -999999;
        var bottomZ = 999999;
        var minPositiveDistanceToCamera = 99999;

        //1. Loop through bsp results
        for (var i = 0; i < bspLeafList.length; i++) {
            var node = nodes[bspLeafList[i]];

            for (var j = node.firstFace; j < node.firstFace + node.numFaces; j++) {
                var vertexInd1 = groupFile.indicies[3 * groupFile.mobr[j] + 0];
                var vertexInd2 = groupFile.indicies[3 * groupFile.mobr[j] + 1];
                var vertexInd3 = groupFile.indicies[3 * groupFile.mobr[j] + 2];

                var vert1 = vec3.fromValues(
                    groupFile.verticles[3 * vertexInd1 + 0],
                    groupFile.verticles[3 * vertexInd1 + 1],
                    groupFile.verticles[3 * vertexInd1 + 2]);

                var vert2 = vec3.fromValues(
                    groupFile.verticles[3 * vertexInd2 + 0],
                    groupFile.verticles[3 * vertexInd2 + 1],
                    groupFile.verticles[3 * vertexInd2 + 2]);

                var vert3 = vec3.fromValues(
                    groupFile.verticles[3 * vertexInd3 + 0],
                    groupFile.verticles[3 * vertexInd3 + 1],
                    groupFile.verticles[3 * vertexInd3 + 2]);

                //1. Get if camera position inside vertex

                var minX = Math.min(vert1[0], vert2[0], vert3[0]);
                var minY = Math.min(vert1[1], vert2[1], vert3[1]);
                var minZ = Math.min(vert1[2], vert2[2], vert3[2]);

                var maxX = Math.max(vert1[0], vert2[0], vert3[0]);
                var maxY = Math.max(vert1[1], vert2[1], vert3[1]);
                var maxZ = Math.max(vert1[2], vert2[2], vert3[2]);

                var testPassed = (
                    (cameraLocal[0] > minX && cameraLocal[0] < maxX) &&
                    (cameraLocal[1] > minY && cameraLocal[1] < maxY)
                );
                if (!testPassed) continue;

                var plane = MathHelper.createPlaneFromEyeAndVertexes(vert1, vert2, vert3);
                //var z = MathHelper.calcZ(vert1,vert2,vert3,cameraLocal[0],cameraLocal[1]);
                if ((plane[2] < 0.0001) && (plane[2] > -0.0001)) continue;

                var z = (-plane[3] - cameraLocal[0] * plane[0] - cameraLocal[1] * plane[1]) / plane[2];

                //2. Get if vertex top or bottom
                var normal1 = vec3.fromValues(
                    groupFile.normals[3 * vertexInd1 + 0],
                    groupFile.normals[3 * vertexInd1 + 1],
                    groupFile.normals[3 * vertexInd1 + 2]
                );
                var normal2 = vec3.fromValues(
                    groupFile.normals[3 * vertexInd2 + 0],
                    groupFile.normals[3 * vertexInd2 + 1],
                    groupFile.normals[3 * vertexInd2 + 2]
                );
                var normal3 = vec3.fromValues(
                    groupFile.normals[3 * vertexInd3 + 0],
                    groupFile.normals[3 * vertexInd3 + 1],
                    groupFile.normals[3 * vertexInd3 + 2]
                );

                var suggestedPoint = vec3.fromValues(cameraLocal[0], cameraLocal[1], z);
                var bary = MathHelper.getBarycentric(
                    suggestedPoint,
                    vert1,
                    vert2,
                    vert3
                );

                if ((bary[0] < 0) || (bary[1] < 0) || (bary[2] < 0)) continue;
                if (!MathHelper.checkIfInsidePortals(suggestedPoint, groupFile, parentWmoFile)) continue;

                var normal_avg = bary[0] * normal1[2] + bary[1] * normal2[2] + bary[2] * normal3[2];
                if (normal_avg > 0) {
                    //Bottom
                    var distanceToCamera = cameraLocal[2] - z;
                    if ((distanceToCamera > 0) && (distanceToCamera < minPositiveDistanceToCamera))
                        bottomZ = z;
                } else {
                    //Top
                    topZ = Math.max(z, topZ);
                }
            }
        }
        //2. Try to get top and bottom from portal planes
        var moprIndex = groupFile.mogp.moprIndex;
        var numItems = groupFile.mogp.numItems;

        for (var j = moprIndex; j < moprIndex + numItems; j++) {
            var relation = parentWmoFile.portalRelations[j];
            var portalInfo = parentWmoFile.portalInfos[relation.portal_index];

            var nextGroup = relation.group_index;
            var plane = portalInfo.plane;
            plane = [plane.x, plane.y, plane.z, plane.w];
            var base_index = portalInfo.base_index;
            var portalVerticles = parentWmoFile.portalVerticles;


            var dotResult = (vec4.dot(plane, cameraLocal));
            var isInsidePortalThis = (relation.side < 0) ? (dotResult <= 0) : (dotResult >= 0);
            //If we are going to borrow z from this portal, we should be inside it
            if (!isInsidePortalThis) continue;

            if ((plane[2] < 0.0001) && (plane[2] > -0.0001)) continue;
            var z = (-plane[3] - cameraLocal[0] * plane[0] - cameraLocal[1] * plane[1]) / plane[2];

            for (var k =0; k < portalInfo.index_count-2; k++) {
                var portalIndex;
                portalIndex = base_index+0;
                var point1 = vec3.fromValues(
                    portalVerticles[3 * (portalIndex)],
                    portalVerticles[3 * (portalIndex) + 1],
                    portalVerticles[3 * (portalIndex) + 2]);
                portalIndex = base_index+k+1;
                var point2 = vec3.fromValues(
                    portalVerticles[3 * (portalIndex)],
                    portalVerticles[3 * (portalIndex) + 1],
                    portalVerticles[3 * (portalIndex) + 2]);
                portalIndex = base_index+k+2;
                var point3 = vec3.fromValues(
                    portalVerticles[3 * (portalIndex)],
                    portalVerticles[3 * (portalIndex) + 1],
                    portalVerticles[3 * (portalIndex) + 2]);

                var bary = MathHelper.getBarycentric(
                    vec3.fromValues(cameraLocal[0], cameraLocal[1], z),
                    point1,
                    point2,
                    point3
                );
                if ((bary[0] < 0) || (bary[1] < 0) || (bary[2] < 0)) continue;
                if (z > cameraLocal[2]) {
                    if (topZ < -99999)
                        topZ = z;
                }
                if (z < cameraLocal[2]) {
                    if (bottomZ > 99999)
                        bottomZ = z;
                }
            }
        }
        if ((bottomZ > 99999) && (topZ < -99999)) {
            return null;
        }

        return {'topZ': topZ, 'bottomZ': bottomZ};
    }
}

export default MathHelper;