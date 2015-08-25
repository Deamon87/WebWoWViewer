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
                        //16x16 records
                        for (var i = 0; i < 256; i++) {
                            var MCINEntry = {};
                            MCINEntry.offsetMCNK = chunk.readUint32(offs);
                            MCINEntry.size = chunk.readUint32(offs);
                            MCINEntry.flags = chunk.readUint32(offs);
                            MCINEntry.asyncId = chunk.readUint32(offs);

                            //Load and process MCNK for this block
                            chunkedFile.processChunkAtOffs({offs : MCINEntry.offsetMCNK}, adtObject);
                        }
                    },
                    "MCNK" : function (mcnkObj, chunk) {
                        var offs = {offs : 0};

                        mcnkObj.flags             = chunk.readUint32(offs);
                        mcnkObj.ix                = chunk.readUint32(offs);
                        mcnkObj.iy                = chunk.readUint32(offs);
                        mcnkObj.nLayers           = chunk.readUint32(offs);
                        mcnkObj.nDoodadRefs       = chunk.readUint32(offs);
                        var ofsHeight             = chunk.readUint32(offs);
                        var ofsNormal             = chunk.readUint32(offs);
                        var ofsLayer              = chunk.readUint32(offs);
                        var ofsRefs               = chunk.readUint32(offs);
                        var ofsAlpha              = chunk.readUint32(offs);
                        mcnkObj.sizeAlpha         = chunk.readUint32(offs);
                        var ofsShadow             = chunk.readUint32(offs);
                        mcnkObj.sizeShadow        = chunk.readUint32(offs);
                        mcnkObj.areaid            = chunk.readUint32(offs);
                        mcnkObj.nMapObjRefs       = chunk.readUint32(offs);
                        mcnkObj.holes             = chunk.readUint32(offs);
                        mcnkObj.s1                 = chunk.readUint16(offs);
                        mcnkObj.s2                 = chunk.readUint16(offs);
                        mcnkObj.d1                = chunk.readUint32(offs);
                        mcnkObj.d2                = chunk.readUint32(offs);
                        mcnkObj.d3                = chunk.readUint32(offs);
                        mcnkObj.predTex           = chunk.readUint32(offs);
                        var nEffectDoodad         = chunk.readUint32(offs);
                        var ofsSndEmitters        = chunk.readUint32(offs);
                        var nSndEmitters          = chunk.readUint32(offs);
                        var ofsLiquid             = chunk.readUint32(offs);
                        var sizeLiquid            = chunk.readUint32(offs);
                        var pos                    = chunk.readVector3f(offs);
                        mcnkObj.textureId         = chunk.readUint32(offs);
                        mcnkObj.props             = chunk.readUint32(offs);
                        mcnkObj.effectId          = chunk.readUint32(offs);

                        //1. Load MCVT

                        //2. Load MCNR
                        //3. Load MCLY
                        //4. Load MCAL

                    },
                    "MTEX" : function (adtObject, chunk) {
                        var offset = {offs: 0};
                        var textureNames = chunk.readUint8Array(offset, chunk.chunkLen);

                        adtObject.mtex = textureNames;
                    },
                    "MMDX" : function (adtObject, chunk) {
                        var offset = {offs: 0};
                        var m2Names = chunk.readUint8Array(offset, chunk.chunkLen);

                        adtObject.mmdx = m2Names;
                    },
                    "MMID" : function (adtObject, chunk) {
                        var offset = {offs: 0};
                        var mmid = chunk.readInt32Array(offset, chunk.chunkLen >> 2);

                        adtObject.mmid = mmid;
                    },
                    "MWMO" : function (adtObject, chunk) {
                        var offset = {offs: 0};
                        var wmoNames = chunk.readUint8Array(offset, chunk.chunkLen);

                        adtObject.mwmo = wmoNames;
                    },
                    "MWID" : function (adtObject, chunk) {
                        var offset = {offs: 0};
                        var mwid = chunk.readInt32Array(offset, chunk.chunkLen >> 2);

                        adtObject.mwid = mwid;
                    },
                    "MDDF" : function (adtObject, chunk) {
                        var m2Objs = [];
                        var offset = {offs : 0};

                        var mddfCount = (chunk.chunkLen / (4 + 4 + 4*3 + 4*3 + 4));
                        for (var i = 0; i < mddfCount; i++){
                            var m2Placement = {};

                            m2Placement.nameID    = chunk.readInt32(offset);
                            m2Placement.uniqueId  = chunk.readInt32(offset);
                            m2Placement.pos       = chunk.readVector3f(offset);
                            m2Placement.rotation  = chunk.readVector3f(offset);
                            //flags               : WORD;
                            m2Placement.scale     = chunk.readInt32(offset);

                            m2Objs.push(m2Placement);
                        }

                        adtObject.mddf = m2Objs;
                    },
                    "MODF" : function (adtObject, chunk) {
                        var offset = { offs : 0 };
                        var wmoObjs = [];

                        var modfCount = (chunk.chunkLen / (4 + 4 + 4*3 + 4*3 +4*3 + 4*3 + 2 + 2 + 4));
                        for (var i = 0; i < modfCount; i++) {
                            var modfChunk = {};

                            modfChunk.nameId = chunk.readInt32(offset);
                            modfChunk.uniqueId = chunk.readInt32(offset);

                            modfChunk.pos        = chunk.readVector3f(offset);
                            modfChunk.rotation   = chunk.readVector3f(offset);
                            modfChunk.bb1        = chunk.readVector3f(offset);
                            modfChunk.bb2        = chunk.readVector3f(offset);

                            modfChunk.doodadSet = chunk.readUint16(offset);
                            modfChunk.nameSet   = chunk.readUint16(offset);
                            modfChunk.flags     = chunk.readInt32(offset);

                            wmoObjs.add(modfChunk);
                        }

                        adtObject.wmoObjs = wmoObjs;
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
