import axios from 'axios';
import ZipReader from './zipFileReader.js';
import CascReader from './cascFileReader';

class FileLoader {
    constructor(configService) {
        this.configService = configService;
        this.zipReader = new ZipReader(configService);
        this.cascReader = new CascReader(configService.getFileList().map((a) => {
            var b = Object.create(a.file,
                {
                    name : {value: a.fullPath},
                    lastModifiedDate: {value: a.lastModifiedDate},
                    size : {value: a.size},
                });
            b.slice = function(){
                //TODO: Check this hack in latest firefox
                return b.__proto__.slice.apply(b.__proto__, arguments);
            }
            return b}
        ));
        //this.cascReader.loadStorage();
    }
    loadStorage() {
        this.cascReader.loadStorage();
    }

    getFile (filePath) {
        //Hack for zero terminated strings with zero being inside string
        if (filePath[filePath.length - 1] == String.fromCharCode(0)) {
            filePath = filePath.substr(0, filePath.length - 1);
        }
        if (filePath) {
            filePath = filePath.toLowerCase();
        }

        if (this.configService.getFileReadMethod() == 'http') {
            var fullPath = this.configService.getUrlToLoadWoWFile() + filePath;

            return axios.get(fullPath,{responseType: "arraybuffer"}).then(function success(a) {
                return new Uint8Array(a.data);
            }, function error(a) {
                console.log("axios error" + e);
                throw a;
            });
        } else if (this.configService.getFileReadMethod() == 'zip') {
            if (filePath) {
                filePath = filePath.replace(/\\/g, "/");
            }

            return this.zipReader.readFile(filePath);
        } else if (this.configService.getFileReadMethod() == 'casc') {
            //var fileDataId = this.cascReader.getFileDataId(filePath);
            return this.cascReader.loadFile(filePath);
        }
    }
}

export default FileLoader;