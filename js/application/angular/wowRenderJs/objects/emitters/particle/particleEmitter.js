class ParticleEmitter {
    constructor(m2File) {
        this.m2File = m2File;
        this.m_ParticleGenerator = null;
        this.seed = 0;
        this.childEmitters = null;
    }
}