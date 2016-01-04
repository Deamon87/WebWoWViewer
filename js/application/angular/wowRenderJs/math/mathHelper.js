'use strict';
function MathHelper(){}
MathHelper.prototype = {
    getFrustumClipsFromMatrix : function (mat) {
        var planes = new Array(6);
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
    },
    checkFrustum : function (planes, box) {
      // check box outside/inside of frustum
        for(i=0; i<6; i++ )
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
        out=0; for(i=0; i<8; i++ ) out += ((fru.mPoints[i].x > box.mMaxX)?1:0); if( out==8 ) return false;
        out=0; for(i=0; i<8; i++ ) out += ((fru.mPoints[i].x < box.mMinX)?1:0); if( out==8 ) return false;
        out=0; for(i=0; i<8; i++ ) out += ((fru.mPoints[i].y > box.mMaxY)?1:0); if( out==8 ) return false;
        out=0; for(i=0; i<8; i++ ) out += ((fru.mPoints[i].y < box.mMinY)?1:0); if( out==8 ) return false;
        out=0; for(i=0; i<8; i++ ) out += ((fru.mPoints[i].z > box.mMaxZ)?1:0); if( out==8 ) return false;
        out=0; for(i=0; i<8; i++ ) out += ((fru.mPoints[i].z < box.mMinZ)?1:0); if( out==8 ) return false;
*/

        return true;
    }
};

var cacheTemplate = angular.module('js.wow.math.mathHelper', []);
cacheTemplate.service("mathHelper", MathHelper);
