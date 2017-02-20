import Cache from './../cache.js';

import {wmoLoader} from './../../services/map/wmoLoader.js'

class WmoMainCache extends Cache{
    constructor(sceneApi) {
        super()
    }
    load(fileName) {
        /* Must return promise */
        return wmoLoader(fileName);
    }
    process(a) {
        return a;
    }
    loadWmoMain (fileName) {
        return this.get(fileName);
    };

    unLoadWmoMain (fileName) {
        this.remove(fileName)
    }
}

export default WmoMainCache;

