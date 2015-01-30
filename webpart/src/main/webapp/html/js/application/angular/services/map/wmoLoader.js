/**
 * Created by Deamon on 29/01/2015.
 */
(function (window, $, undefined) {
    var wmoLoader = angular.module('main.services.wmoLoader', ['main.services.chunkedLoader']);

    /*
    * Loader for group wmo files
    * These files contain geometry
    * */
    wmoLoader.factory('wmoGroupLoader', ["chunkedLoader", "$q", '$log', function (chunkedLoader, $q, $log) {
        return function(wmoFilePath){
            var deferred = $q.defer();

            var promise = chunkedLoader(wmoFilePath);
            promise.then(function(chunkedFile){
                /* First chunk in file has to be MVER */
                var chunk = chunkedFile.loadChunkAtOffset(0);
                if (chunk.chunkIdent !== "MVER") {
                    throw "Got bad WMO file " + wmoFilePath;
                }

                chunk = chunkedFile.loadChunkAtOffset(chunk.nextChunkOffset);
                var wmoGroup = {};
                while (chunk.chunkIdent != "") {
                    switch (chunk.chunkIdent) {

                        default:
                            $log.info("Unknown Chunk. Ident = " + chunk.chunkIdent+", file = "+wmoFilePath);
                    }
                    chunk = chunkedFile.loadChunkAtOffset(chunk.nextChunkOffset);
                }

                deferred.resolve(wmoGroup);
            }, function error(){
                deferred.reject();
            });

            return deferred.promise;
        };
    }]);

    /*
    * Loader for root wmo file
    * Do not contain any geometry, except bounding boxes;
    */
    wmoLoader.factory('wmoLoader', ["chunkedLoader", "$q", '$log', function (chunkedLoader, $q, $log) {
        return function(wmoFilePath){
            var deferred = $q.defer();

            function readMOMT(wmoObj,chunk){
                var offset = {offs : 0};
                var textures = [];
                for (var i = 0; i < wmoObj.nTextures; i++) {
                    var textureData = {};

                    textureData.flags1      = chunk.readInt32(offset);
                    textureData.flags2      = chunk.readInt32(offset);
                    textureData.blendMode   = chunk.readInt32(offset);
                    textureData.namestart1  = chunk.readInt32(offset);
                    textureData.color1      = chunk.readInt32(offset);
                    textureData.flags_1     = chunk.readInt32(offset);
                    textureData.namestart2  = chunk.readInt32(offset);
                    textureData.color2      = chunk.readInt32(offset);
                    textureData.flags_2     = chunk.readInt32(offset);
                    textureData.color_3     = chunk.readInt32(offset);
                    textureData.unk         = chunk.readInt32(offset);
                    textureData.dx          = chunk.readInt32Array(offset, 5);

                    textures.push(textureData);
                }

                return textures;
            }
            function readMOTX(wmoObj,chunk){
                var offset = {offs : 0};
                chunk.readUint8Array(offset, chunk.chunkLen);
            }
            function readMODN(wmoObj,chunk){
                var offset = {offs : 0};
                var m2Names = [];
                for (var i = 0; i < wmoObj.nModels; i++) {
                    var str = chunk.readString(offset); offset.offs++;
                    m2Names.push(str);
                }

                return m2Names;
            }
            function readMODS(wmoObj,chunk) {
                var offset = {offs: 0};
                var doodadSets = [];

                for (var i = 0; i < wmoObj.nDoodadSets; i++) {
                    var doodadSet = {};
                    doodadSet.name    = chunk.readUint8Array(offset, 20);
                    doodadSet.index   = chunk.readInt32(offset);
                    doodadSet.number  = chunk.readInt32(offset);
                    doodadSet.unused  = chunk.readInt32(offset);

                    doodadSets.push(doodadSet);
                }
                return doodadSets;
            }
            function readMODD(wmoObj,chunk) {
                /* Requires loaded MODS chunk. Pure parsing is not possible =(*/
                var offset = {offs: 0};
                var doodadsPerSet = [];

                for (var i = 0; i < wmoObj.nDoodadSets; i++) {
                    var doodadSetInfo = wmoObj.mods[i];
                    var doodadSet = {
                        name : doodadSetInfo.name,
                        doodads : []
                    };

                    for (var j = 0; j < doodadSetInfo.number; j++) {
                        var doodad = {};
                        doodad.nameIndex = chunk.readInt32(offset);
                        doodad.pos       = chunk.readVector3f(offset);
                        doodad.rotation  = chunk.readQuaternion(offset);
                        doodad.scale     = chunk.readFloat32(offset);
                        doodad.color     = chunk.readUint32(offset);

                        doodadSet.doodads.push(doodad);
                    }

                    doodadsPerSet.push(doodadSet);
                }

                return doodadsPerSet;
            }

            var promise = chunkedLoader(wmoFilePath);
            promise.then(function(chunkedFile){
                /* First chunk in file has to be MVER */
                var chunk = chunkedFile.loadChunkAtOffset(0);
                if (chunk.chunkIdent !== "MVER") {
                    throw "Got bad WMO file " + wmoFilePath;
                }

                $log.info("Loading ", wmoFilePath, ", version ", chunk.readInt32({offs : 0}));

                chunk = chunkedFile.loadChunkAtOffset(chunk.nextChunkOffset);
                var wmoObj = {};
                while (chunk.chunkIdent != "") {
                    switch (chunk.chunkIdent) {

                        case "MOHD":
                            var offset = {offs : 0};
                            wmoObj.nTextures    = chunk.readInt32(offset);
                            wmoObj.nGroups      = chunk.readInt32(offset);
                            wmoObj.nPortals     = chunk.readInt32(offset);
                            wmoObj.nLights      = chunk.readInt32(offset);
                            wmoObj.nModels      = chunk.readInt32(offset);
                            wmoObj.nDoodads     = chunk.readInt32(offset);
                            wmoObj.nDoodadSets  = chunk.readInt32(offset);
                            wmoObj.ambColor     = chunk.readInt32(offset);
                            wmoObj.unk1         = chunk.readInt32(offset);

                            wmoObj.BoundBoxCorner1 = chunk.readVector3f(offset);
                            wmoObj.BoundBoxCorner2 = chunk.readVector3f(offset);

                            wmoObj.WMOId        = chunk.readInt32(offset);

                            break;

                        case "MOTX":
                            /* Char array with textures names */
                            wmoObj.motx = readMOTX(wmoObj, chunk);
                            break;

                        case "MOMT":
                            /* Texture properties and
                            * index into motx array to get the actual texture name
                            */
                            wmoObj.momt = readMOMT(wmoObj, chunk);
                            break;

                        case "MODN":
                            /* List of filenames for M2 models */
                            wmoObj.modn = readMODN(wmoObj, chunk);
                            break;

                        case "MODS":
                            /* Doodads properties */
                            wmoObj.mods = readMODS(wmoObj, chunk);
                            break;

                        case "MODD":
                            wmoObj.modd = readMODD(wmoObj, chunk);
                            break;

                        default:
                            $log.info("Unknown Chunk. Ident = " + chunk.chunkIdent+", file = "+wmoFilePath);
                    }
                    chunk = chunkedFile.loadChunkAtOffset(chunk.nextChunkOffset);
                }

                deferred.resolve(wmoObj);
            }, function error(){
                deferred.reject();
            });

            return deferred.promise;
        };
    }]);
})(window, jQuery);
