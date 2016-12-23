class WorldObject {
    constructor(){
    }

    setPosition(pos) {
        this.pos = pos;
    }
    getPosition() {
        return this.pos;
    }
    setRotation(f) {
        this.f = f;
    }
    setScale(scale) {
        this.scale = scale;
    }

}

export default WorldObject;