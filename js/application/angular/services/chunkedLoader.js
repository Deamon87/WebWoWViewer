/**
 * Created by Deamon on 27/01/2015.
 */
(function (window, $, undefined) {

    var chunkedLoader = angular.module('main.services.chunkedLoader', ['main.services.fileReadHelper']);


    chunkedLoader.factory('chunkedLoader', ['configService', "fileReadHelper", '$http', "$q", '$log', function(configService, fileReadHelper, $http, $q, $log) {

        return function (filePath) {
            var deferred = $q.defer();
            var fullPath = configService.getUrlToLoadWoWFile() + filePath;

            $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                var fileReader = fileReadHelper(a);

                var sectionReaders  = null;

                var chunkedFileObj = {
                    getFileSize : function (){
                        return fileReader.getLength();
                    },
                    setSectionReaders : function (value) {
                        sectionReaders = value;
                    },
                    processChunkAtOffsWithSize : function (offs, size, resultObj) {
                        var chunk = this.loadChunkAtOffset(offs, size);
                        this.processChunk(chunk, resultObj);
                    },
                    processChunkAtOffs : function (offs, resultObj) {
                        var chunk = this.loadChunkAtOffset(offs);
                        this.processChunk(chunk, resultObj);
                    },
                    processChunk : function (chunk, resultObj){
                        var sectionHandlerProc = sectionReaders.getHandler(chunk.chunkIdent);
                        if (sectionHandlerProc){
                            if (typeof sectionHandlerProc === 'function') {
                                sectionHandlerProc(resultObj, chunk, this);
                            } else {
                                var offset = sectionHandlerProc[chunk.chunkIdent](resultObj, chunk);

                                /* Iteration through subchunks */
                                var subChunk = this.loadChunkAtOffset(chunk.chunkOffset + offset.offs);
                                while (subChunk.chunkIdent != "") {
                                    var subchunkHandler = sectionHandlerProc.subChunks[subChunk.chunkIdent];
                                    if (subchunkHandler){
                                        subchunkHandler(resultObj, subChunk, this);
                                    } else {
                                        //$log.info("Unknown SubChunk. Ident = " + subChunk.chunkIdent+", file = "+fullPath);
                                    }

                                    subChunk = this.loadChunkAtOffset(subChunk.nextChunkOffset);
                                }
                            }
                        } else {
                            //$log.info("Unknown Chunk. Ident = " + chunk.chunkIdent+", file = "+fullPath);
                        }
                    },
                    processFile: function(resultObj){
                        var chunk = this.loadChunkAtOffset(0);

                        while (chunk.chunkIdent != "") {
                            this.processChunk(chunk, resultObj, sectionReaders);
                            chunk = this.loadChunkAtOffset(chunk.nextChunkOffset);
                        }
                    },
                    loadChunkAtOffset : function (offset, size){
                        var offsetObj = { offs : offset };

                        /* Read chunk header */
                        var chunkIdent = "";
                        var chunkSize = 0;
                        var chunkDataOff = -1;

                        // 8 is length of chunk header
                        if (offsetObj.offs + 8 < fileReader.getLength()) {
                            chunkIdent = fileReader.reverseStr(fileReader.readString(offsetObj, 4));
                            chunkSize = fileReader.readInt32(offsetObj);
                            if (size != undefined) {
                                chunkSize = size
                            }
                            chunkDataOff = offsetObj.offs;
                        }

                        /* If chunk is empty - skip it. Otherwise - load the chunkData */
                        var chunkReader = null;
                        if (chunkSize > 0) {
                            chunkReader = fileReadHelper(a, offsetObj.offs, chunkSize);
                        }

                        var chunkPiece = {
                            chunkIdent : chunkIdent,
                            chunkLen   : chunkSize,

                            chunkOffset: offset,
                            chunkDataOffset : chunkDataOff,
                            nextChunkOffset : offset + 8 + chunkSize //8 is length of chunk header
                        };
                        chunkPiece.__proto__ = chunkReader;

                        return chunkPiece;
                    }
                };

                deferred.resolve(chunkedFileObj);
            }).error(function() {
                deferred.reject();
            });

            return deferred.promise;
        }
    }]);

})(jQuery, window);
