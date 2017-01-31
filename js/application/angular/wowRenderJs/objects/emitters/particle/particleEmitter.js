import GeneratorAniProp from './containerClasses/generatorAniProp.js';

class ParticleEmitter {
    constructor(particleRecord) {
        this.data = particleRecord;
        this.m_particleGenerator = null;
        this.seed = 0;
        this.childEmitters = null;
        this.generatorAniProp = new GeneratorAniProp();
    }
}

export default ParticleEmitter;