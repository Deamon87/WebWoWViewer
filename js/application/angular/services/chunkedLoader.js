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
            processChunkAtOffsWithSize : function (offs, size, resultObj, parentSectionHandlerProc) {
                var chunk = this.loadChunkAtOffset(offs, size);
                if (parentSectionHandlerProc) {
                    var sectionHandlerProc = parentSectionHandlerProc.subChunks[chunk.chunkIdent];
                } else {
                    var sectionHandlerProc = sectionReaders.getHandler(chunk.chunkIdent)
                }
                this.processChunk(chunk, resultObj, sectionHandlerProc);
            },
            processChunkAtOffs : function (offs, resultObj, parentSectionHandlerProc) {
                var chunk = this.loadChunkAtOffset(offs);
                if (parentSectionHandlerProc) {
                    var sectionHandlerProc = parentSectionHandlerProc.subChunks[chunk.chunkIdent];
                } else {
                    var sectionHandlerProc = sectionReaders.getHandler(chunk.chunkIdent)
                }
                this.processChunk(sectionHandlerProc, chunk, resultObj);
            },
            processChunk : function (sectionHandlerProc, chunk, resultObj){
                if (sectionHandlerProc){
                    if (typeof sectionHandlerProc === 'function') {
                        sectionHandlerProc(resultObj, chunk, this);
                    } else {
                        var results = sectionHandlerProc[chunk.chunkIdent](resultObj, chunk);
                        var offset = results.offset.offs;
                        var subResultObj = results.resultObj;

                        /* Iteration through subchunks */
                        if (chunk.chunkLen > 0) {
                            if (offset > 0) {
                                var chunkLoadOffset = chunk.chunkDataOffset + offset;
                            } else {
                                var chunkLoadOffset = chunk.chunkDataOffset;
                            }
                            var chunkEndOffset = chunk.chunkDataOffset + chunk.chunkLen;
                            var subChunk;
                            while (chunkLoadOffset < chunkEndOffset && (subChunk = this.loadChunkAtOffset(chunkLoadOffset)).chunkIdent != "") {
                                var subchunkHandler = sectionHandlerProc.subChunks[subChunk.chunkIdent];
                                this.processChunk(subchunkHandler, subChunk, subResultObj);

                                chunkLoadOffset = subChunk.nextChunkOffset;
                            }
                        }
                    }
                } else {
                    if (chunk.chunkIdent == "MCRW")
                        debugger;
                    console.log("Unknown Chunk. Ident = " + chunk.chunkIdent);
                }
            },
            processFile: function(resultObj){
                var chunk = this.loadChunkAtOffset(0);

                while (chunk.chunkIdent != "") {
                    var sectionHandlerProc = sectionReaders.getHandler(chunk.chunkIdent)
                    this.processChunk(sectionHandlerProc, chunk, resultObj);
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
