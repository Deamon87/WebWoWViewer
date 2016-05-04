import {vec4, vec3} from 'gl-matrix';

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

    static planeCull (points, planes) {
        // check box outside/inside of frustum
        var vec4Points = new Array(points.length);
        for( var j = 0; j < points.length; j++) {
            vec4Points[j] = vec4.fromValues(points[j][0], points[j][1], points[j][2], 1.0)
        }

        for ( var i=0; i< planes.length; i++ ) {
            var out = 0;
            var epsilon = 0;
            if (i == 5) epsilon = 1; //mitigation for near clipping plane

            for( var j = 0; j<points.length; j++) {
                out += ((vec4.dot(planes[i], vec4Points[j]) + epsilon < 0.0 ) ? 1 : 0);
            }
            if( out==points.length ) return false;
        }

        // check frustum outside/inside box
        /*
         out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].x > box.mMaxX)?1:0); if( out==8 ) return false;
         out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].x < box.mMinX)?1:0); if( out==8 ) return false;
         out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].y > box.mMaxY)?1:0); if( out==8 ) return false;
         out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].y < box.mMinY)?1:0); if( out==8 ) return false;
         out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].z > box.mMaxZ)?1:0); if( out==8 ) return false;
         out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].z < box.mMinZ)?1:0); if( out==8 ) return false;
         */

        //Clamp against planes
        /*epsilon = 0.01;
        for ( var i=0; i< planes.length; i++ ) {
            var normal = vec3.clone(planes[i]);

            for( var j = 0; j < points.length; j++) {
                var dotResult = vec4.dot(planes[i], vec4Points[j]);
                if (dotResult < 0) {
                    vec3.scale(normal, normal, -epsilon-dotResult);
                    vec3.add(vec4Points[j], vec4Points[j], normal);
                }
            }
        }


        for( var j = 0; j < points.length; j++) {
            points[j] = vec4Points[j];
        }
        */
        return true;
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

    static checkFrustum (planes, box, num_planes) {
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
        /*
        out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].x > box.mMaxX)?1:0); if( out==8 ) return false;
        out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].x < box.mMinX)?1:0); if( out==8 ) return false;
        out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].y > box.mMaxY)?1:0); if( out==8 ) return false;
        out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].y < box.mMinY)?1:0); if( out==8 ) return false;
        out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].z > box.mMaxZ)?1:0); if( out==8 ) return false;
        out=0; for(var i=0; i<8; i++ ) out += ((fru.mPoints[i].z < box.mMinZ)?1:0); if( out==8 ) return false;
*/

        return true;
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