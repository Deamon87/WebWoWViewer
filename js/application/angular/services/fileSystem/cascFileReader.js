import {Module,FS,WORKERFS,Runtime} from 'exports?Module,FS,WORKERFS,Runtime!imports?Module=cascLib/moduleStub.js!imports?require=>function(){}!cascLib/libcasc_min.js';

let repositoryDir = '/repository';
class CascReader {
    constructor (fileList) {
        this.fileList = fileList;
        this.initFileSystem();
    }

    initFileSystem() {
        debugger;
        FS.mkdir(repositoryDir);
        FS.mount(WORKERFS, {
            files: this.fileList
        }, repositoryDir);
    }

    loadStorage() {
        /* 2. Bloat code to pass parameters */                                                                                                                         22.
        /* 2. Bloat code to pass parameters */                                                                                                                             22.
        debugger;
        var dataDir = repositoryDir  + '/World of Warcraft/';
        var hStoragePtr = Module._malloc(4);
        var StoragePtrHeap = new Uint8Array(Module.HEAPU8.buffer, hStoragePtr, 4);

        var repositoryDirPtr = Module._malloc((dataDir.length << 2) + 1);
        var repositoryDirPtrHeap = new Uint8Array(Module.HEAPU8.buffer, repositoryDirPtr, (dataDir.length << 2) + 1);

        Module.stringToUTF8(dataDir, repositoryDirPtr, repositoryDirPtrHeap.length);


        /* 3. Call function */
        var a = Module._CascOpenStorage(repositoryDirPtrHeap.byteOffset, 0xFFFFFFFF, StoragePtrHeap.byteOffset);

        /* 4. Get function result */
        debugger;
        var hStorage;
        if (a) {
            hStorage = new Uint32Array(StoragePtrHeap.buffer, StoragePtrHeap.byteOffset, 1)[0];
            this.hStorage = hStorage;
        } else {
            //TODO: FIX
            //var errorCode = Module._GetLastError();
        }

        /* 6. Free memory */
        Module._free(hStoragePtr);
        Module._free(repositoryDirPtr);
    }
    getFileDataId(fileName) {
        Runtime.stackSave();
        var fileNameMem = Runtime.stackAlloc((fileName.length << 2) + 1);
        Module.writeStringToMemory(fileName, fileNameMem);

        var fileDataId = Module._CascGetFileId(this.hStorage, fileNameMem);

        Runtime.stackRestore();

        return fileDataId;
    }
    loadFile(fileDataId) {

        var defer = {};
        defer.promise = new Promise(function(resolve, reject) {
            defer.onResolve = function (value) {
                "use strict";
                resolve(value)
            };
            defer.onReject = function (value) {
                "use strict";
                resolve(value)
            }
        });

        var fileName = 'File'+fileDataId+'.unk';
        var dwFlags = 0;

        var hFilePtr = Module._malloc(4);
        var hFilePtrHeap = new Uint8Array(Module.HEAPU8.buffer, hFilePtr, 4);

        Runtime.stackSave();
        var fileNameMem = Runtime.stackAlloc((fileName.length << 2) + 1);
        Module.writeStringToMemory(fileName, fileNameMem);

        var fileContent = null;
        if (Module._CascOpenFile(this.hStorage, fileNameMem, 0, dwFlags, hFilePtrHeap.byteOffset)){
            var hFile = new Uint32Array(hFilePtrHeap.buffer, hFilePtrHeap.byteOffset, 1)[0];

            var fileSize1 = Module._CascGetFileSize(hFile, 0);

            var dwBytesReadPtr = Module._malloc(4);
            var dwBytesReadHeap = new Uint8Array(Module.HEAPU8.buffer, dwBytesReadPtr, 4);
            var dwBytesView = new Uint32Array(hFilePtrHeap.buffer, hFilePtrHeap.byteOffset, 1);

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
        }


        Module._free(hFilePtrHeap.byteOffset);
        Runtime.stackRestore();

        defer.onResolve(fileContent);
        return defer.promise;
    }

}

export default CascReader;