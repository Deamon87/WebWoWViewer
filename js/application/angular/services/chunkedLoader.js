import fileReadHelper from './fileReadHelper.js';
import fileLoader from './fileLoader.js';

export default function (filePath, arrayBuffer) {

    function parseArrayBuffer(a) {
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
                if (sectionHandlerProc && chunk.chunkLen !== 0){
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
                    if (size || size === 0) {
                        chunkSize = size
                    }
                    chunkDataOff = offsetObj.offs;
                }

                /* If chunk is empty - skip it. Otherwise - load the chunkData */
                var chunkReader = null;
                if (chunkSize > 0) {
                    chunkReader = fileReadHelper(a, offsetObj.offs, chunkSize);
                }

                var chunkPiece = Object.create(chunkReader, {
                    chunkIdent :  {value: chunkIdent},
                    chunkLen   :  {value : chunkSize},

                    chunkOffset: {value : offset},
                    chunkDataOffset : {value : chunkDataOff},
                    nextChunkOffset : {value :offset + 8 + chunkSize, writable: true} //8 is length of chunk header
                });
                //chunkPiece.__proto__ = ;

                return chunkPiece;
            }
        };

        return chunkedFileObj;
    }

    if (arrayBuffer) {
        return parseArrayBuffer(arrayBuffer);
    } else  {
        return fileLoader(filePath).then(function success(a) {
            return parseArrayBuffer(a);
        }, function error(e) {
            return e;
        });
    }
}
