import 'imports?this=>global!zip.js/WebContent/z-worker.js';
import 'imports?this=>global!zip.js/WebContent/inflate.js';
import 'imports?this=>global!zip.js/WebContent/zip.js';

//debugger;
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


export default function (configService, $q) {
    var zipEntries;

    var initDefers = [];

    function initZipEntries() {
        var defer = $q.defer();
        initDefers.push(defer);

        var zipFile = configService.getArchiveFile();
        global.zip.createReader(new ArrayBufferReaderSync(zipFile), function (reader) {

            // get all entries from the zip
            reader.getEntries(function (entries) {
                //1. Transform array into map
                var map = {};
                for (var i = 0; i < entries.length; i++) {
                    var key = entries[i].filename.trim().replace(/\\/g, "/").toLowerCase();
                    var value = entries[i];
                    map[key] = value;
                }

                //2. Return map
                var len = initDefers.length;
                for (var i = 0; i < len; i++) {
                    initDefers[i].resolve(map);
                }
                initDefers = [];
            });
        }, function (error) {
            // onerror callback
            var len = initDefers.length;
            for (var i = 0; i < len; i++) {
                initDefers[i].reject(error);
            }
            initDefers = [];
        });

        return defer.promise;
    }

    function readZipFile(fileName) {
        var defer = $q.defer();
        fileName = fileName.replace(/\u0000/g, '');
        fileName = fileName.toLowerCase();
        fileName = fileName.replace(/\\/g, "/").toLowerCase()


        var result = null;

        result = zipEntries[fileName];
        /*
         zipEntries.every(function(entry) {
         if(entry.filename.trim().replace(/\\/g, "/").toLowerCase() == fileName.toLowerCase()) {
         result = entry;
         return false;
         }

         return true;
         });
         */

        if (result) {
            result.getData(new ArrayBufferWriterSync(), function (data) {
                defer.resolve(data);
            });
        } else {
            defer.reject(null);
        }

        return defer.promise;
    }

    function fileLoader(filePath) {
        //Hack for zero terminated strings with zero being inside string
        if (filePath[filePath.length - 1] == String.fromCharCode(0)) {
            filePath = filePath.substr(0, filePath.length - 1);
        }
        if (filePath) {
            filePath = filePath.toLowerCase();
        }

        if (configService.getFileReadMethod() == 'http') {
            var fullPath = configService.getUrlToLoadWoWFile() + filePath;

            return $http.get(fullPath, {responseType: "arraybuffer"}).then(function success(a) {
                return a.data;
            }, function error(a) {
            });

        } else if (configService.getFileReadMethod() == 'zip') {
            if (filePath) {
                filePath = filePath.replace(/\\/g, "/");
            }
            if (!zipEntries) {
                return initZipEntries().then(function succees(a) {
                    zipEntries = a;
                    return readZipFile(filePath);
                }, function error(a,b,c) {
                    return
                }).then(function success(fileData) {
                    return fileData;
                }, function error(e) {
                    return e;
                });
            } else {
                return readZipFile(filePath).then(function success(fileData) {
                    return fileData;
                }, function error(e) {
                    return e;
                });
            }
        }
    }

    return fileLoader
};