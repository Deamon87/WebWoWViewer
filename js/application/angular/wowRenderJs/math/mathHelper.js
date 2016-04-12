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

        vec3.subtract(edgeDir, vertex1, vertex2);
        vec3.normalize(edgeDir, edgeDir );

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
    //Half converted from https://github.com/erich666/GraphicsGems/blob/master/gems/PolyScan/poly_clip.c
    static CLIP_AND_SWAP(p1, elem, sign, k, obj) {
        poly_clip_to_halfspace(obj.p, obj.q, elem, sign, sign*k);
        if (q.length==0) {
            p1.length = 0;
            return "POLY_CLIP_OUT";
        }
        obj.r = obj.p;
        obj.p = obj.q;
        obj.q = obj.r;
    }

    static poly_clip_to_box(p1, box) {
        var POLY_NMAX = 12;
        var x0out = 0, x1out = 0, y0out = 0, y1out = 0, z0out = 0, z1out = 0;
        var i;
        var v;
        var p2, p, q, r;

        if (p1.length+6>POLY_NMAX) {
            //fprintf(stderr, "poly_clip_to_box: too many vertices: %d (max=%d-6)\n",
            //p1->n, POLY_NMAX);
            //exit(1);
        }

        /* count vertices "outside" with respect to each of the six planes */
        for (i=p1.length; i>0; i--) {
            v = p1[i];

            if (v[0] < box->x0*v[3]) x0out++;	/* out on left */
            if (v[0] > box->x1*v[3]) x1out++;	/* out on right */
            if (v[1] < box->y0*v[3]) y0out++;	/* out on top */
            if (v[1] > box->y1*v[3]) y1out++;	/* out on bottom */
            if (v[2] < box->z0*v[3]) z0out++;	/* out on near */
            if (v[2] > box->z1*v[3]) z1out++;	/* out on far */
        }

        /* check if all vertices inside */
        if (x0out+x1out+y0out+y1out+z0out+z1out == 0) return POLY_CLIP_IN;

        /* check if all vertices are "outside" any of the six planes */
        if (x0out==p1.length || x1out==p1.length || y0out==p1.length ||
            y1out==p1.length || z0out==p1.length || z1out==p1.length) {
            p1.length = 0;

            return "POLY_CLIP_OUT"
        }

        /*
         * now clip against each of the planes that might cut the polygon,
         * at each step toggling between polygons p1 and p2
         */
        p = p1;
        q = p2;
        var obj = {'p': p, 'q': q, 'r' : r};
        var result;
        if (x0out) result = CLIP_AND_SWAP(p1, 0 /*sx*/, -1., box->x0, obj); if (result) return result;
        if (x1out) result = CLIP_AND_SWAP(p1, 0 /*sx*/,  1., box->x1, obj); if (result) return result;
        if (y0out) result = CLIP_AND_SWAP(p1, 1 /*sy*/, -1., box->y0, obj); if (result) return result;
        if (y1out) result = CLIP_AND_SWAP(p1, 1 /*sy*/,  1., box->y1, obj); if (result) return result;
        if (z0out) result = CLIP_AND_SWAP(p1, 2 /*sz*/, -1., box->z0, obj); if (result) return result;
        if (z1out) result = CLIP_AND_SWAP(p1, 2 /*sz*/,  1., box->z1, obj); if (result) return result;

        /* if result ended up in p2 then copy it to p1 */
        p = obj.p;
        p2 = obj.q;
        if (p==p2) {
            //memcpy(p1, &p2, sizeof(Poly)-(POLY_NMAX-p2.n)*sizeof(Poly_vert));
        }

        return "POLY_CLIP_PARTIAL";
    }

    static poly_clip_to_halfspace(p, q, index, sign, k) {
        var m;
        var up, vp, wp;
        var v;
        var i;
        var t, tu, tv;

        q.length = 0;
        q.mask = p.mask;

        /* start with u=vert[n-1], v=vert[0] */
        var u = p[p.length - 1];
        tu = sign * u[index] - u[3] * k;
        for (v = p[0], i = p.length; i > 0; i--, u = v, tu = tv)
        {
            /* on old polygon (p), u is previous vertex, v is current vertex */
            /* tv is negative if vertex v is in */
            tv = sign * v[index]- v[3] * k;
            if ((tu <= 0.) ^ (tv <= 0.)) {
                /* edge crosses plane; add intersection point to q */
                t = tu / (tu - tv);
                up = u;
                vp = v;
                wp = q[q.length];
                for (var j = 0; j < 3; j++) {
                    wp[j] = up[j] + t * (vp[j] - up[j]); // fucking indexes! Redo!!!
                }

                q.length = q.length+1;
            }
            if (tv <= 0.) {        /* vertex v is in, copy it to q */
                q[q.length] = v;
                q.length = q.length + 1;
            }

            v = p[p.length - i + 1]
        }
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