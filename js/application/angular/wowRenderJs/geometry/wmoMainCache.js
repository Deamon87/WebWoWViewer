class WmoMainCache {
    constructor(sceneApi) {
        var self = this;

        this.cache = cacheTemplate(function loadGroupWmo(fileName) {
            /* Must return promise */
            return wmoLoader(fileName);
        }, function (a) {
            return a;
        });
    }
    loadWmoMain (fileName) {
        return this.cache.get(fileName);
    };

    unLoadWmoMain (fileName) {
        this.cache.remove(fileName)
    }
}

export default WmoMainCache;

