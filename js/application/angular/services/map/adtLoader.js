/**
 * Created by Deamon on 07/02/2015.
 */
(function (window, $, undefined) {

    var adtLoader = angular.module('main.services.map.adtLoader', ['main.services.linedFileLoader']);
    adtLoader.factory('adtLoader', ['chunkedLoader', 'fileReadHelper', '$log', '$q', function (chunkedLoader, fileReadHelper, $log, $q) {
        return function(filename){
            var deferred = $q.defer();

            function ADTLoader() {
                var handlerTable = {
                    "MVER" : function (adtObject, chunk) {
                        if (chunk.chunkIdent !== "MVER") {
                            throw "Got bad group ADT file " + filename;
                        }
                        var version = chunk.readInt32({offs: 0});
                        //$log.info("Loading ", filename, ", version ", version);
                    },
                    "MHDR" : function (adtObject, chunk, chunkedFile) {
                        var offs = {offs : 0};

                        var flags = chunk.readUint32(offs);
                        var mcinOffs = chunk.readUint32(offs);
                        var mtexOffs = chunk.readUint32(offs);
                        var mmdxOffs = chunk.readUint32(offs);
                        var mmidOffs = chunk.readUint32(offs);
                        var mwmoOffs = chunk.readUint32(offs);
                        var mwidOffs = chunk.readUint32(offs);
                        var mddfOffs = chunk.readUint32(offs);
                        var modfOffs = chunk.readUint32(offs);
                        var mfboOffs = chunk.readUint32(offs); // this is only set if flags & mhdr_MFBO.
                        var mh2oOffs = chunk.readUint32(offs);
                        var mtxfOffs = chunk.readUint32(offs);
                        var pad4 = chunk.readUint32(offs);
                        var pad5 = chunk.readUint32(offs);
                        var pad6 = chunk.readUint32(offs);
                        var pad7 = chunk.readUint32(offs);

                        //1. Load MCIN
                        chunkedFile.processChunkAtOffs({offs : mcinOffs}, adtObject);
                        //2. Load MTEX
                        chunkedFile.processChunkAtOffs({offs : mtexOffs}, adtObject);
                        //3. Load MMDX
                        chunkedFile.processChunkAtOffs({offs : mmdxOffs}, adtObject);
                        //4. Load MMID
                        chunkedFile.processChunkAtOffs({offs : mmidOffs}, adtObject);
                        //5. Load MWMO
                        chunkedFile.processChunkAtOffs({offs : mwmoOffs}, adtObject);
                        //6. Load MWID
                        chunkedFile.processChunkAtOffs({offs : mwidOffs}, adtObject);
                        //7. Load MDDF
                        chunkedFile.processChunkAtOffs({offs : mddfOffs}, adtObject);
                        //8. Load MODF
                        chunkedFile.processChunkAtOffs({offs : modfOffs}, adtObject);
                    },
                    "MCIN" : function (adtObject, chunk, chunkedFile) {
                        var offs = {offs : 0};
                        for (var i = 0; i < 256; i++) {
                            var MCINEntry = {};
                            MCINEntry.offsetMCNK = chunk.readUint32(offs);
                            MCINEntry.size = chunk.readUint32(offs);
                            MCINEntry.flags = chunk.readUint32(offs);
                            MCINEntry.asyncId = chunk.readUint32(offs);

                            chunkedFile.processChunkAtOffs({offs : MCINEntry.offsetMCNK}, adtObject);
                        }
                    },
                    "MCNK" : function (adtObject, chunk) {
                        var offs = {offs : 0};
                        var flags                 = chunk.readUint32(offs);
                        var ix                    = chunk.readUint32(offs);
                        var iy                    = chunk.readUint32(offs);
                        var nLayers               = chunk.readUint32(offs);
                        var nDoodadRefs           = chunk.readUint32(offs);
                        var ofsHeight             = chunk.readUint32(offs);
                        var ofsNormal             = chunk.readUint32(offs);
                        var ofsLayer              = chunk.readUint32(offs);
                        var ofsRefs               = chunk.readUint32(offs);
                        var ofsAlpha              = chunk.readUint32(offs);
                        var sizeAlpha             = chunk.readUint32(offs);
                        var ofsShadow             = chunk.readUint32(offs);
                        var sizeShadow            = chunk.readUint32(offs);
                        var areaid                = chunk.readUint32(offs);
                        var nMapObjRefs           = chunk.readUint32(offs);
                        var holes                 = chunk.readUint32(offs);
                        var s1                    = chunk.readUint16(offs);
                        var s2                    = chunk.readUint16(offs);
                        var d1                    = chunk.readUint32(offs);
                        var d2                    = chunk.readUint32(offs);
                        var d3                    = chunk.readUint32(offs);
                        var predTex               = chunk.readUint32(offs);
                        var nEffectDoodad         = chunk.readUint32(offs);
                        var ofsSndEmitters        = chunk.readUint32(offs);
                        var nSndEmitters          = chunk.readUint32(offs);
                        var ofsLiquid             = chunk.readUint32(offs);
                        var sizeLiquid            = chunk.readUint32(offs);
                        var pos                   = chunk.readVector3f(offs);
                        var textureId             = chunk.readUint32(offs);
                        var props                 = chunk.readUint32(offs);
                        var effectId              = chunk.readUint32(offs);


                    },
                    "MTEX" : function () {

                    },
                    "MMDX" : function () {

                    },
                    "MMID" : function () {

                    },
                    "MWMO" : function () {

                    },
                    "MWID" : function () {

                    },
                    "MDDF" : function () {

                    },
                    "MODF" : function () {

                    }
                };

                this.getHandler = function (sectionName) {
                    return handlerTable[sectionName];
                }
            }

            var promise = chunkedLoader(filename);
            promise.then(function (chunkedFile) {
                /* First chunk in file has to be MVER */

                var adtObj = {};
                chunkedFile.setSectionReaders(new ADTLoader());
                chunkedFile.processFile(adtObj);

                deferred.resolve(adtObj);
            }, function error() {
                deferred.reject();
            });

            return deferred.promise;
        }

    }]);
})(window, jQuery);
