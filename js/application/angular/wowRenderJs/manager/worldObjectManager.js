class WorldObjectManager {
    constructor(){
        this.objectMap = {};
    }

    update(deltaTime, cameraPos) {
        for (var field in this.objectMap) {
            if (this.objectMap.hasOwnProperty(field)) {
                this.objectMap[field].update(deltaTime, cameraPos);
            }
        }
    }
}
export default WorldObjectManager;