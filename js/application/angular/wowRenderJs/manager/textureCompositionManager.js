var texturePaths = [

];

class TextureCompositionManager {
    constructor (sceneApi) {
        this.sceneApi = sceneApi;
        this.needsUpdate = false;

        this.textureArray = new Array(13);
    }


    clear() {
        this.textureArray = new Array(13);
    }
    addTexture(slot, textureName) {
        if (!this.textureArray[slot]) {
            this.textureArray[slot] = new Array();
        }
        this.textureArray[slot].push(textureName)
    }

    update() {
        if (!this.needsUpdate) return null;
    }

}

export default TextureCompositionManager;