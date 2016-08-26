import {vec4, vec3, mat4} from 'gl-matrix';

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
        //var nearPlane = planes[5];
        //var cameraVec4 = vec4.fromValues(camera[0], camera[1],camera[2],1);
        //var dist = vec4.dot(nearPlane, cameraVec4);
        //nearPlane[3] -= dist;
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

    static planeCull (points, planes) {
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
        for( var j = 0; j < points.length; j++) {
            vec4Points[j] = vec4.fromValues(points[j][0], points[j][1], points[j][2], 1.0)
        }

        for ( var i=0; i< planes.length; i++ ) {
            var out = 0;
            var epsilon = 0;

            for( var j = 0; j < vec4Points.length; j++) {
                out += ((vec4.dot(planes[i], vec4Points[j]) + epsilon < 0.0 ) ? 1 : 0);
            }

            if( out==vec4Points.length ) return false;

            //---------------------------------
            // Cull by points by current plane
            //---------------------------------
            var resultPoints = new Array();
            var pointO;
            if (planes[i][2] != 0) {
                pointO = vec3.fromValues(0,0,-planes[i][3]/planes[i][2]);
            } else if (planes[i][1] != 0) {
                pointO = vec3.fromValues(0,-planes[i][3]/planes[i][1],0);
            } else if (planes[i][0] != 0) {
                pointO = vec3.fromValues(-planes[i][3]/planes[i][0],0,0);
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
                    var k = t1/(t1 - t2);
                    resultPoints.push(intersection(p1, p2, k))
                } else if (t1 < 0 && t2 > 0) { //p1 Behind and p2 Behind
                    var k = t1/(t1 - t2);
                    resultPoints.push(intersection(p1, p2, k))
                    resultPoints.push(p2)
                }
            }
            vec4Points = resultPoints;
        }

        for( var j = 0; j < vec4Points.length; j++) {
            points[j] = vec4Points[j];
        }

        return vec4Points.length > 2;
    }


    static createPlaneFromVertexes(vertex1, vertex2, vertex3) {
        var edgeDir1 = vec4.create();

        vec3.subtract(edgeDir, vertex1, vertex2);
        vec3.normalize(edgeDir, edgeDir);

        var edgeDir2 = vec4.create();

        vec3.subtract(edgeDir2, vertex1, vertex3);
        vec3.normalize(edgeDir2, edgeDir2);

        var planeNorm = vec4.create();
        vec3.cross(planeNorm, edgeDir2, edgeDir);
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
    static getBarycentric( p, a, b, c) {
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
        var v = (d11 * d20 - d01 * d21) / denom;
        var w = (d00 * d21 - d01 * d20) / denom;
        var u = 1.0 - v - w;
        return vec3.fromValues(u, v, w)
    }
    static checkFrustum (planes, box, num_planes, points) {
      // check box outside/inside of frustum
        for(var i=0; i< num_planes; i++ )
        {
            var out = 0;
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[0][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[1][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[1][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[0][1], box[1][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[1][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[1][1], box[1][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[1][1], box[1][2], 1.0) ) < 0.0 )?1:0);
            if( out==8 ) return false;
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
    static getFrustumPoints(perspectiveMatrix, viewMatrix){
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
            vec4.scale(points[i], points[i], 1/points[i][3])
        }

        return points;
    }
    static transformAABBWithMat4 (mat4,aabb) {
        //Adapted from http://dev.theomader.com/transform-bounding-boxes/
        var xa = vec4.create();
        var xb = vec4.create();
        vec4.scale(xa, vec4.fromValues(mat4[0],mat4[1],mat4[2],mat4[3]), aabb[0][0]);
        vec4.scale(xb, vec4.fromValues(mat4[0],mat4[1],mat4[2],mat4[3]), aabb[1][0]);

        var ya = vec4.create();
        var yb = vec4.create();
        vec4.scale(ya, vec4.fromValues(mat4[4],mat4[5],mat4[6],mat4[7]), aabb[0][1]);
        vec4.scale(yb, vec4.fromValues(mat4[4],mat4[5],mat4[6],mat4[7]), aabb[1][1]);

        var za = vec4.create();
        var zb = vec4.create();
        vec4.scale(za, vec4.fromValues(mat4[8],mat4[9],mat4[10],mat4[11]), aabb[0][2]);
        vec4.scale(zb, vec4.fromValues(mat4[8],mat4[9],mat4[10],mat4[11]), aabb[1][2]);

        var vecx_min = vec4.create();
        var vecy_min = vec4.create();
        var vecz_min = vec4.create();
        var vecx_max = vec4.create();
        var vecy_max = vec4.create();
        var vecz_max = vec4.create();

        vec3.min(vecx_min, xa, xb); vec3.max(vecx_max, xa, xb);
        vec3.min(vecy_min, ya, yb); vec3.max(vecy_max, ya, yb);
        vec3.min(vecz_min, za, zb); vec3.max(vecz_max, za, zb);

        var translation = vec4.fromValues(mat4[12],mat4[13],mat4[14],0);

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
}

export default MathHelper;