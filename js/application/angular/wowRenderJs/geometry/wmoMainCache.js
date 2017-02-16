import Cache from './../cache.js';

import {wmoLoader} from './../../services/map/wmoLoader.js'

class WmoMainCache extends Cache{
    constructor(sceneApi) {
        var self = this;
    }
    load(fileName) {
        /* Must return promise */
        return wmoLoader(fileName);
    }
    process(a) {
        return a;
    }
    loadWmoMain (fileName) {
        return this.cache.get(fileName);
    };

    unLoadWmoMain (fileName) {
        this.cache.remove(fileName)
    }
}

export default WmoMainCache;

