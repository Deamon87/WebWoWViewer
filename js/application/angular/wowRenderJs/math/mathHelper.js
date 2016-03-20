import {vec4, vec3} from 'gl-matrix';

class MathHelper{
    static getFrustumClipsFromMatrix (mat) {
        var planes = new Array(6);
        // Right clipping plane.
        planes[0] = vec4.fromValues(mat[3]-mat[0],
            mat[7]-mat[4],
            mat[11]-mat[8],
            mat[15]-mat[12]);
        // Left clipping plane.
        planes[1] = vec4.fromValues(mat[3]+mat[0],
            mat[7]+mat[4],
            mat[11]+mat[8],
            mat[15]+mat[12]);
        // Bottom clipping plane.
        planes[2] = vec4.fromValues(mat[3]+mat[1],
            mat[7]+mat[5],
            mat[11]+mat[9],
            mat[15]+mat[13] );
        // Top clipping plane.
        planes[3] = vec4.fromValues(mat[3]-mat[1],
            mat[7]-mat[5],
            mat[11]-mat[9],
            mat[15]-mat[13] );
        // Far clipping plane.
        planes[4] = vec4.fromValues(mat[3]-mat[2],
            mat[7]-mat[6],
            mat[11]-mat[10],
            mat[15]-mat[14] );
        // Near clipping plane.
        planes[5] = vec4.fromValues(mat[3]+mat[2],
            mat[7]+mat[6],
            mat[11]+mat[10],
            mat[15]+mat[14]);

        for(var i = 0; i < 6; i++ ) {
            //Hand made normalize
            var invVecLength = 1/vec3.length(planes[i]);
            vec4.scale(planes[i], planes[i], invVecLength);
        }

        return planes;
    }
    static createPlaneFromEyeAndVertexes (eye, vertex1, vertex2 ) {
        var edgeDir = vec4.create();

        vec4.subtract(edgeDir, vertex1, vertex2);
        vec4.normalize(edgeDir);

        //viewToPointDir = normalize(((vertexA+vertexB)*0.5)-viewPos)
        var viewToPointDir = vec4.create();
        vec4.add(viewToPointDir, vertex1, vertex2);
        vec4.scale(viewToPointDir, viewToPointDir, 0.5);
        vec4.subtract(viewToPointDir, viewToPointDir, eye);
        vec4.normalize(viewToPointDir, viewToPointDir);

        //planeNorm=cross(viewDir, edgeDir)
        var planeNorm = vec4.create();
        vec4.cross(planeNorm, viewToPointDir, edgeDir);
        vec4.normalize(planeNorm, planeNorm);

        //Plane fpl(planeNorm, dot(planeNorm, vertexA))
        var distToPlane = vec4.dot(planeNorm, vertex1);
        planeNorm[3] = distToPlane;

        return distToPlane;
    }
    static checkPortalFrustum (portalVerticles, planes) {
        /*
        for(var i=0; i<6; i++ )
        {
            var out = 0;
            out += ((vec4.dot(planes[i], vec4.fromValues(box[0][0], box[0][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            out += ((vec4.dot(planes[i], vec4.fromValues(box[1][0], box[0][1], box[0][2], 1.0) ) < 0.0 )?1:0);
            if( out==2 ) return false;
        }
        */
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