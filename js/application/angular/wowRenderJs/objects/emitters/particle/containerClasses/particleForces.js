import {vec3} from 'gl-matrix';

class ParticleForces {
    constructor() {
        this.drift = vec3.create();
        this.velocity = vec3.create();
        this.position = vec3.create();
        this.drag = 0.0;
    }
};

export default ParticleForces;