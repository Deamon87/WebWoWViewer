export default function(wdtFilePath) {
    var deferred = $q.defer();

    var promise = chunkedLoader(wdtFilePath);
    promise.then(function(chunkedFile){

        /* First chunk in file has to be MVER */
        var chunk = chunkedFile.loadChunkAtOffset(0);
        if (chunk.chunkIdent !== "MVER") {
            throw "Got bad WDT file " + wdtFilePath;
        }

        chunk = chunkedFile.loadChunkAtOffset(chunk.nextChunkOffset);
        var wdtObj = {};
        while (chunk.chunkIdent != "") {
            switch (chunk.chunkIdent) {
                case "MAIN":
                    var chunkOffs = { offs : 0 };
                    var tileTable = {};

                    for (var i =0; i < 64; i++) {
                        var tile = {};

                        for (var j = 0; j < 64; j++ ) {
                            tile[j] = chunk.readInt32(chunkOffs);
                            chunkOffs.offs+=4; // skip next 4 bytes. They are plain zeros
                        }
                        tileTable[i] = tile;
                    }

                    wdtObj.tileTable = tile;
                    break;
                case "MPHD":
                    var offset = { offs : 0 };
                    wdtObj.flags = chunk.readUint8(offset);
                    wdtObj.isWMOMap = wdtObj.flags & 1 > 0;
                    break;

                case "MWMO":
                    var offset = { offs : 0 };
                    var wmoNames = null;

                    if (chunk.chunkLen > 0) {
                        wmoNames = chunk.readUint8Array(offset, chunk.chunkLen);
                    }

                    wdtObj.mwmo = wmoNames;
                    break;

                case "MODF":
                    /* Placement information for WMO maps*/
                    var offset = { offs : 0 };
                    var modfChunk = {};

                    var mwmoBuff = fileReadHelper(wdtObj.mwmo.buffer);


                    modfChunk.nameId = chunk.readInt32(offset);
                    modfChunk.uniqueId = chunk.readInt32(offset);

                    modfChunk.pos        = chunk.readVector3f(offset);
                    modfChunk.rotation   = chunk.readVector3f(offset);
                    modfChunk.unkVector1 = chunk.readVector3f(offset);
                    modfChunk.unkVector2 = chunk.readVector3f(offset);

                    modfChunk.doodadSet = chunk.readUint16(offset);
                    modfChunk.nameSet   = chunk.readUint16(offset);
                    modfChunk.flags     = chunk.readInt32(offset);

                    var nameOffset = modfChunk.nameId;
                    modfChunk.fileName  = mwmoBuff.readString({offs : nameOffset}, mwmoBuff.getLength() - nameOffset);

                    wdtObj.modfChunk = modfChunk;
                    break;

                default:
                    $log.info("Unknown Chunk. Ident = " + chunk.chunkIdent+", file = "+wdtFilePath);
            }
            chunk = chunkedFile.loadChunkAtOffset(chunk.nextChunkOffset);
        }

        deferred.resolve(wdtObj);
    }, function error(){
        deferred.reject();
    });

    return deferred.promise;
}