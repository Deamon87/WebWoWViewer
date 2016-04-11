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

    static createPlaneFromEyeAndVertexes(eye, vertex1, vertex2) {
        var edgeDir = vec4.create();

        vec3.subtract(edgeDir, vertex1, vertex2);
        vec3.normalize(edgeDir, edgeDir);

        //viewToPointDir = normalize(((vertexA+vertexB)*0.5)-viewPos)
        var viewToPointDir = vec4.create();
        vec3.add(viewToPointDir, vertex1, vertex2);
        vec3.scale(viewToPointDir, viewToPointDir, 0.5);
        vec3.subtract(viewToPointDir, viewToPointDir, eye);
        vec3.normalize(viewToPointDir, viewToPointDir);

        //planeNorm=cross(viewDir, edgeDir)
        var planeNorm = vec4.create();
        vec3.cross(planeNorm, viewToPointDir, edgeDir);
        vec3.normalize(planeNorm, planeNorm);

        planeNorm[3] = 1;

        //Plane fpl(planeNorm, dot(planeNorm, vertexA))
        var distToPlane = vec4.dot(planeNorm, vertex1);
        planeNorm[3] = distToPlane;

        return distToPlane;
    }

    static ClipPolygon(dst, src, num_verts, planes, num_planes) {
        var swap = new Array(18); //vec3_t
        for (var i = 0; i < swap.length; i++) {
            swap[i] = vec3.create();
        }

        var num = MathHelper.ClipPlane(dst, src, num_verts, planes[0]); //uint
        for (var i = 1; i <= num_planes - 1; i++) {

            if ((i & 1) != 0) { // ???????? ?? ????????
                num = MathHelper.ClipPlane(swap, dst, num, planes[i])
            } else {
                num = MathHelper.ClipPlane(dst, swap, num, planes[i]);
            }
        }

        if ((num_planes & 1) == 0) {
            // swap->dest
            for (var i = 0; i < num; i++) {
                dst[i] = swap[i];
            }
        }

        return num; // ???-?? ?????? ? dst
    }
    static GetPolyFrustum(poly, num_verts, frustum, eye) {
        var v1, v2;

        for (var i = 0; i <= (num_verts - 1); i++) {
            v1 = poly[(i + 1) % num_verts];
            v2 = poly[i];

            //Normal start
            var edge1 = vec3.create();
            vec3.subtract(edge1, v2, eye);

            var edge2 = vec3.create();
            vec3.subtract(edge2, v1, eye);

            var normal = vec3.create();
            vec3.cross(normal, edge1, edge2);
            vec3.normalize(normal, normal);

            // Normal end

            frustum[i][0] = normal[0];
            frustum[i][1] = normal[1];
            frustum[i][2] = normal[2];

            frustum[i][3] = -vec3.dot(normal, eye);
        }
    }

    static ClipPlane(dst, src, num_verts, plane) {
        var v1, v2;//: vec3_t; // ??????? ?????????? ?????
        var t1, t2;//: single;
        var k1, k2;//: single;

        var num = 0; // ???-?? ?????? ? dst
        for (var i = 0; i <= (num_verts - 1); i++) {
            v1 = src[i];
            v2 = src[(i + 1) % num_verts];

            t1 = vec3.dot(v1, [plane[0],plane[1], plane[2]]) + plane[3];
            t2 = vec3.dot(v2, [plane[0],plane[1], plane[2]]) + plane[3];

            if (t1 >= 0) {
                dst[num] = v1;
                num++;
            }

            if ((t1 * t2) < 0) {
                k1 = t2 / (t2 - t1);
                k2 = -t1 / (t2 - t1);

                dst[num][0] = v1[0] * k1 + v2[0] * k2;
                dst[num][1] = v1[1] * k1 + v2[1] * k2;
                dst[num][2] = v1[2] * k1 + v2[2] * k2;
                num++;
            }
        }
        return num;
    }

    static checkFrustum (planes, box) {
      // check box outside/inside of frustum
        for(var i=0; i<6; i++ )
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