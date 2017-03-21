//import {} from 'promise?exports?Module,FS,WORKERFS,Runtime,run!imports?Module=cascLib/moduleStub.js!imports?require=>function(){}!cascLib/libcasc.js';
import initModule from 'imports?require=>function(){}!cascLib/libcasc.js';
//import test from 'cascLib/emscriptenModule.js'
import axios from 'axios';
import ModuleClass from 'cascLib/moduleStub.js';

var Module;
var FS, WORKERFS, Runtime, runInitFunc;
let repositoryDir = '/repository';
class CascReader {
    constructor (fileList) {
        this.fileList = fileList;
        this.initPromises = new Map();
        this.inited = false;

        var self = this;
        //Load wasm module
        axios.get("http://localhost:8888/libcasc.wasm",{responseType: "arraybuffer"}).then(function success(a) {
            Module = new ModuleClass();
            Module['wasmBinary'] = a.data;
            initModule(Module);
            FS = Module['FS'];
            WORKERFS = Module['WORKERFS'];
            Runtime = Module['Runtime'];

            //runInitFunc();
            self.initFileSystem();
            self.loadStorage();

            self.inited = true;
            self.walkThroughInitPromises();

        }, function error(a) {
            onerror("axios error" + a);
            throw a;
        });
    }

    walkThroughInitPromises() {
        var self = this;
        this.initPromises.forEach((value, key) => {
            var defer = value;
            var fileName = key;

            var fileId = self.getFileDataId(fileName);
            if (fileId > 0) {
                var fileContent = self.loadFileById(fileId);
                if (fileContent) {
                    defer.onResolve(fileContent)
                } else {
                    defer.onReject("Could not load content by FileId")
                }
            } else {
                defer.onReject("FileId not found")
            }

        });
    }

    initFileSystem() {
        FS.mkdir(repositoryDir);
        FS.mount(WORKERFS, {
            files: this.fileList
        }, repositoryDir);
    }

    loadStorage() {
        /* 2. Bloat code to pass parameters */                                                                                                                             22.
        var dataDir = repositoryDir  + '/World of Warcraft/';
        var hStoragePtr = Module._malloc(4);
        var StoragePtrHeap = new Uint8Array(Module.HEAPU8.buffer, hStoragePtr, 4);

        var repositoryDirPtr = Module._malloc((dataDir.length << 2) + 1);
        var repositoryDirPtrHeap = new Uint8Array(Module.HEAPU8.buffer, repositoryDirPtr, (dataDir.length << 2) + 1);

        Module.stringToUTF8(dataDir, repositoryDirPtr, repositoryDirPtrHeap.length);


        /* 3. Call function */
        var a = Module._CascOpenStorage(repositoryDirPtrHeap.byteOffset, 0xFFFFFFFF, StoragePtrHeap.byteOffset);

        /* 4. Get function result */
        var hStorage;
        if (a) {
            hStorage = new Uint32Array(StoragePtrHeap.buffer, StoragePtrHeap.byteOffset, 1)[0];
            this.hStorage = hStorage;
        } else {
            //TODO: FIX
            //var errorCode = Module._GetLastError();
            console.log("could not read load casc storage")
        }

        /* 6. Free memory */
        Module._free(hStoragePtr);
        Module._free(repositoryDirPtr);
    }
    getFileDataId(fileName) {
        var fileNameMem = Module._malloc((fileName.length << 2) + 1);
        Module.writeStringToMemory(fileName, fileNameMem, false);

        var fileDataId = Module._CascGetFileId(this.hStorage, fileNameMem);

        Module._free(fileNameMem);
        return fileDataId;
    }
    loadFileById(fileDataId) {
        var stringedFileId = (fileDataId).toString(16);
        if (stringedFileId.length < 8) {
            var length = stringedFileId.length;
            for (var i = 0; i < 8-length; i++) {
                stringedFileId = '0'+stringedFileId;
            }
        }

        var fileName = 'File'+stringedFileId+'.unk';
        var dwFlags = 0;

        var hFilePtr = Module._malloc(4);
        var hFilePtrHeap = new Uint8Array(Module.HEAPU8.buffer, hFilePtr, 4);

        var fileNameMem = Module._malloc((fileName.length << 2) + 1);
        Module.writeStringToMemory(fileName, fileNameMem, false);

        var fileContent = null;
        if (Module._CascOpenFile(this.hStorage, fileNameMem, 0, dwFlags, hFilePtrHeap.byteOffset)){
            var hFile = new Uint32Array(hFilePtrHeap.buffer, hFilePtrHeap.byteOffset, 1)[0];

            var fileSize1 = Module._CascGetFileSize(hFile, 0);

            var dwBytesReadPtr = Module._malloc(4);
            var dwBytesReadHeap = new Uint8Array(Module.HEAPU8.buffer, dwBytesReadPtr, 4);
            var dwBytesView = new Uint32Array(dwBytesReadHeap.buffer, dwBytesReadHeap.byteOffset, 1);

            var bufferPtr =  Module._malloc(fileSize1);
            var bufferPtrHeap = new Uint8Array(Module.HEAPU8.buffer, bufferPtr, fileSize1);

            var totalBytesRead = 0;
            while (true) {
                var dwBytesRead = dwBytesView[0] = 0;

                Module._CascReadFile(hFile, bufferPtrHeap.byteOffset+totalBytesRead, fileSize1-totalBytesRead, dwBytesReadHeap.byteOffset);
                dwBytesRead = dwBytesView[0];

                if(dwBytesRead == 0) {
                    break;
                }

                totalBytesRead += dwBytesRead;
            }

            fileContent = bufferPtrHeap.slice(0);

            Module._CascCloseFile(hFile);
            Module._free(dwBytesReadHeap.byteOffset);
            Module._free(bufferPtr);
        }


        Module._free(hFilePtrHeap.byteOffset);
        Module._free(fileNameMem);

        return fileContent;
    }
    loadFile(fileName) {
        var defer = {};
        defer.promise = new Promise(function(resolve, reject) {
            defer.onResolve = function (value) {
                "use strict";
                resolve(value)
            };
            defer.onReject = function (value) {
                "use strict";
                reject(value)
            }
        });

        if (this.inited) {
            var fileId = this.getFileDataId(fileName);
            if (fileId > 0) {
                var fileContent = this.loadFileById(fileId);
                if (fileContent) {
                    defer.onResolve(fileContent)
                } else {
                    defer.onReject("Could not load content by FileId")
                }
            } else {
                defer.onReject("FileId not found")
            }
        } else {
            this.initPromises.set(fileName, defer)
        }

        return defer.promise;
    }

}

export default CascReader;