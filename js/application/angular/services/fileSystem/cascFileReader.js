import Module from 'exports?Module!imports?require=stubModule!cascLib/libcasc.js';

class CascReader {
    constructor (fileList) {
        this.Module = Module;
    }
}

export default CascReader;