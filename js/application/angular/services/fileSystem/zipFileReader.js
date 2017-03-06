import 'imports?this=>global!zip.js/WebContent/zip.js';
import 'imports?this=>global!zip.js/WebContent/inflate.js';
import 'imports?this=>global!zip.js/WebContent/z-worker.js';
global.zip.useWebWorkers = false;

function ArrayBufferReaderSync(arrayBuffer) {
    var that = this;

    function init(callback) {
        that.size = arrayBuffer.byteLength;
        callback();
    }
    function readUint8Array(index, length, callback, onerror) {
        var newArrayBuffer = arrayBuffer.slice(index, index+length);
        var result = new Uint8Array(newArrayBuffer);
        callback(result);
    }

    that.size = 0;
    that.init = init;
    that.readUint8Array = readUint8Array;
}
ArrayBufferReaderSync.prototype = new global.zip.Reader();
ArrayBufferReaderSync.prototype.constructor = ArrayBufferReaderSync;

function concatTypedArrays(a, b) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

function ArrayBufferWriterSync(contentType) {
    var uint8Array, that = this;

    function init(callback) {
        uint8Array = new Uint8Array(0);
        callback();
    }

    function writeUint8Array(array, callback) {
        uint8Array = concatTypedArrays(uint8Array, array);
        callback();
    }

    function getData(callback) {
        callback(uint8Array);
    }

    that.init = init;
    that.writeUint8Array = writeUint8Array;
    that.getData = getData;
}
ArrayBufferWriterSync.prototype = new global.zip.Writer();
ArrayBufferWriterSync.prototype.constructor = ArrayBufferWriterSync;

class ZipReader {
    constructor(configService) {
        this.inited = false;
        this.zipEntries = [];
        this.initDefers = [];
        this.configService = configService;
    }
    initZipEntries() {
        var defer = {};
        var self = this;
        defer.promise = new Promise(function(resolve, reject) {
            defer.onResolve = function (value) {
                "use strict";
                resolve(value)
            }
            defer.onReject = function (value) {
                "use strict";
                resolve(value)
            }
        });

        this.initDefers.push(defer);

        var zipFile = this.configService.getArchiveFile();
        //console.log("initDefers.length = "+initDefers.length);
        if (this.initDefers.length <= 1) {
            global.zip.createReader(new ArrayBufferReaderSync(zipFile), function (reader) {
                // get all entries from the zip
                reader.getEntries(function (entries) {
                    //1. Transform array into map
                    //console.log("getting file list completed");
                    var map = {};
                    for (var i = 0; i < entries.length; i++) {
                        var key = entries[i].filename.trim().replace(/\\/g, "/").toLowerCase();
                        var value = entries[i];
                        map[key] = value;
                    }

                    //console.log("getting file list completed");
                    //2. Return map
                    var len = self.initDefers.length;
                    for (var i = 0; i < len; i++) {
                        self.initDefers[i].onResolve(map);
                    }
                    self.initDefers = [];
                });
            }, function (error) {
                // onerror callback
                var len = self.initDefers.length;
                for (var i = 0; i < len; i++) {
                    self.initDefers[i].onReject(error);
                }
                self.initDefers = [];
            });
        }

        return defer.promise;
    }
    readZipFileFromArchive(fileName) {
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

        fileName = fileName.replace(/\u0000/g, '');
        fileName = fileName.toLowerCase();
        fileName = fileName.replace(/\\/g, "/").toLowerCase()


        var result = null;

        result = this.zipEntries[fileName];
        if (result) {
            result.getData(new ArrayBufferWriterSync(), function (data) {
                defer.onResolve(data);
            });
        } else {
            defer.onReject(null);
        }

        return defer.promise;
    }
    readFile(filePath){
        var self = this;
        if (!this.inited) {
            return self.initZipEntries().then(function succees(a) {
                self.zipEntries = a;
                return self.readZipFileFromArchive(filePath);
            }, function error(a,b,c) {
                return
            }).then(function success(fileData) {
                return fileData;
            }, function error(e) {
                return e;
            });
        } else {
            return self.readZipFileFromArchive(filePath).then(function success(fileData) {
                return fileData;
            }, function error(e) {
                return e;
            });
        }


    }
}

export default ZipReader