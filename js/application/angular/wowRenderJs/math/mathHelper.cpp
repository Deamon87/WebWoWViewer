float plane_vec3_dot(const float plane[4], float vec_0, float vec_1, float vec_2) {
    return plane[0]*vec_0+plane[1]*vec_1+plane[2]*vec_2+plane[3];
}
bool checkFrustum (const float planes[][4], const float box[2][3], int num_planes, const float points[][3]) {
    // check box outside/inside of frustum
    for(int i = 0; i< num_planes; i++ )
    {
        int out = 0;
        out += ((plane_vec3_dot(planes[i], box[0][0], box[0][1], box[0][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[1][0], box[0][1], box[0][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[0][0], box[1][1], box[0][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[1][0], box[1][1], box[0][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[0][0], box[0][1], box[1][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[1][0], box[0][1], box[1][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[0][0], box[1][1], box[1][2]) < 0.0 )?1:0);
        out += ((plane_vec3_dot(planes[i], box[1][0], box[1][1], box[1][2]) < 0.0 )?1:0);
        if( out==8 ) return false;
    }

    // check frustum outside/inside box
    if (points != 0) {
        int out;
        out = 0; for (int i = 0; i < 8; i++) out += ((points[i][0] > box[1][0]) ? 1 : 0); if (out == 8) return false;
        out = 0; for (int i = 0; i < 8; i++) out += ((points[i][0] < box[0][0]) ? 1 : 0); if (out == 8) return false;
        out = 0; for (int i = 0; i < 8; i++) out += ((points[i][1] > box[1][1]) ? 1 : 0); if (out == 8) return false;
        out = 0; for (int i = 0; i < 8; i++) out += ((points[i][1] < box[0][1]) ? 1 : 0); if (out == 8) return false;
        out = 0; for (int i = 0; i < 8; i++) out += ((points[i][2] > box[1][2]) ? 1 : 0); if (out == 8) return false;
        out = 0; for (int i = 0; i < 8; i++) out += ((points[i][2] < box[0][2]) ? 1 : 0); if (out == 8) return false;
    }

    return true;
}
