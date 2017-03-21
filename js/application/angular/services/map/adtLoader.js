import $q from 'q';
import chunkedLoader from './../chunkedLoader.js';
import fileReadHelper from './../fileReadHelper.js';

const handlerTable = {
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
        if (mcinOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mcinOffs, adtObject);
        //2. Load MTEX
        if (mtexOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mtexOffs, adtObject);
        //3. Load MMDX
        if (mmdxOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mmdxOffs, adtObject);
        //4. Load MMID
        if (mmidOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mmidOffs, adtObject);
        //5. Load MWMO
        if (mwmoOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mwmoOffs, adtObject);
        //6. Load MWID
        if (mwidOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mwidOffs, adtObject);
        //7. Load MDDF
        if (mddfOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + mddfOffs, adtObject);
        //8. Load MODF
        if (modfOffs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkDataOffset + modfOffs, adtObject);

        //Stop loading
        if (mcinOffs > 0) {
            chunk.nextChunkOffset = chunkedFile.getFileSize();
        }
    },
    "MCIN" : function (adtObject, chunk, chunkedFile) {
        var offs = {offs : 0};
        //16x16 records
        var mcnkObjs = [];
        for (var i = 0; i < 256; i++) {
            var MCINEntry = {};
            MCINEntry.offsetMCNK = chunk.readUint32( offs);
            MCINEntry.size = chunk.readUint32(offs);
            MCINEntry.flags = chunk.readUint32(offs);
            MCINEntry.asyncId = chunk.readUint32(offs);

            //Load and process MCNK for this block
            var mcnkObj = {};
            chunkedFile.processChunkAtOffs(MCINEntry.offsetMCNK, adtObject);
            mcnkObjs.push(mcnkObj);
        }
        adtObject.mcnkObjs = mcnkObjs;
    },
    "MCNK" : function (adtObject, chunk, chunkedFile) {
        var offs = {offs : 0};
        var mcnkObj = {};
        if (!adtObject.mcnkObjs) {
            adtObject.mcnkObjs = new Array();
        }
        adtObject.mcnkIndex = 0;

        mcnkObj.flags             = chunk.readUint32(offs);
        mcnkObj.ix                = chunk.readUint32(offs);
        mcnkObj.iy                = chunk.readUint32(offs);
        mcnkObj.nLayers           = chunk.readUint32(offs);
        mcnkObj.nDoodadRefs       = chunk.readUint32(offs);
        var ofsHeight             = chunk.readUint32(offs);
        var ofsNormal             = chunk.readUint32(offs);
        var ofsLayer              = chunk.readUint32(offs);
        var ofsRefs               = chunk.readUint32(offs);
        mcnkObj.m2Refs = [];
        var ofsAlpha              = chunk.readUint32(offs);
        mcnkObj.sizeAlpha         = chunk.readUint32(offs);
        var ofsShadow             = chunk.readUint32(offs);
        mcnkObj.sizeShadow        = chunk.readUint32(offs);
        mcnkObj.areaId            = chunk.readUint32(offs);
        mcnkObj.nMapObjRefs       = chunk.readUint32(offs);
        mcnkObj.wmoRefs = [];
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
        mcnkObj.pos               = chunk.readVector3f(offs);
        mcnkObj.ofsMCCV           = chunk.readUint32(offs);
        mcnkObj.ofsMCLV           = chunk.readUint32(offs);
        mcnkObj.unused            = chunk.readUint32(offs);

        adtObject.mcnkObjs[adtObject.mcnkIndex++] = mcnkObj;
        //1. Load MCVT
        if (ofsHeight > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkOffset + ofsHeight, mcnkObj);
        //2. Load MCNR
        if (ofsNormal > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkOffset + ofsNormal, mcnkObj);
        //3. Load MCLY
        if (ofsLayer > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkOffset + ofsLayer, mcnkObj);
        //4. Load MCAL
        if (ofsAlpha > 0)
            chunkedFile.processChunkAtOffsWithSize(chunk.chunkOffset + ofsAlpha, mcnkObj.sizeAlpha, mcnkObj);
        //5. Load MCRF
        if (ofsRefs > 0)
            chunkedFile.processChunkAtOffs(chunk.chunkOffset + ofsRefs, mcnkObj);
    },
    "MCVT" : function (mcnkObj, chunk, chunkedFile) {
        var offs = {offs : 0};

        var heights = chunk.readFloat32Array(offs, 145);
        mcnkObj.heights = heights;
    },
    "MCNR" : function (mcnkObj, chunk, chunkedFile) {
        var offs = {offs : 0};
        var normales = [];

        for (var i = 0; i < 9*9 + 8*8; i++) {
            var x = chunk.readInt8(offs) / 127;
            var y = chunk.readInt8(offs) / 127;
            var z = chunk.readInt8(offs) / 127;

            normales.push(x);
            normales.push(y);
            normales.push(z);
        }
        mcnkObj.normales = normales;
    },
    "MCLY" : function (mcnkObj, chunk, chunkedFile) {
        var offs = {offs : 0};
        var recCount = chunk.chunkLen >> 4;
        var textureLayers = [];

        for (var i = 0; i < recCount; i++) {
            var textureLayer = {};
            textureLayer.textureID  = chunk.readInt32(offs); //offset into MTEX list

            textureLayer.flags      = chunk.readInt32(offs);
            textureLayer.alphaMap   = chunk.readInt32(offs);
            textureLayer.detailTex  = chunk.readInt32(offs);
            textureLayers.push(textureLayer);
        }

        mcnkObj.textureLayers = textureLayers;
    },
    "MCAL" : function (mcnkObj, chunk, chunkedFile) {
        var offset = {offs: 0};
        var alphaArray = chunk.readUint8Array(offset, chunk.chunkLen);

        mcnkObj.alphaArray = alphaArray;
    },
    "MCRF": function (mcnkObj, chunk, chunkedFile) {
        var offset = {offs: 0};
        var m2Refs = chunk.readInt32Array(offset, mcnkObj.nDoodadRefs);
        var wmoRefs = chunk.readInt32Array(offset, mcnkObj.nMapObjRefs);

        mcnkObj.m2Refs = m2Refs;
        mcnkObj.wmoRefs = wmoRefs;
    },
    "MTEX" : function (adtObject, chunk) {
        var offset = {offs: 0};
        var textureNames = [];

        while (offset.offs < chunk.chunkLen) {
            var textStr = chunk.readString(offset, chunk.chunkLen - offset.offs); offset.offs += 1;
            textureNames.push(textStr);
        }

        adtObject.mtex = textureNames;
    },
    "MMDX" : function (adtObject, chunk) {
        var offset = {offs: 0};
        var m2Names = null;

        if (chunk.chunkLen > 0) {
            m2Names = chunk.readUint8Array(offset, chunk.chunkLen);
        }

        adtObject.mmdx = m2Names;
    },
    "MMID" : function (adtObject, chunk) {
        var offset = {offs: 0};
        var mmid = null;

        if (chunk.chunkLen > 0) {
            mmid = chunk.readInt32Array(offset, chunk.chunkLen >> 2);
        }

        adtObject.mmid = mmid;
    },
    "MWMO" : function (adtObject, chunk) {
        var offset = {offs: 0};
        var wmoNames = null;

        if (chunk.chunkLen > 0) {
            wmoNames = chunk.readUint8Array(offset, chunk.chunkLen);
        }

        adtObject.mwmo = wmoNames;
    },
    "MWID" : function (adtObject, chunk) {
        var offset = {offs: 0};

        var mwid = null;

        if (chunk.chunkLen > 0) {
            mwid = chunk.readInt32Array(offset, chunk.chunkLen >> 2);
        }

        adtObject.mwid = mwid;
    },
    "MDDF" : function (adtObject, chunk) {
        var m2Objs = [];
        var offset = {offs : 0};

        var mddfCount = (chunk.chunkLen / (4 + 4 + 4*3 + 4*3 + 4));
        if (mddfCount > 0) {
            var mmdxBuff = fileReadHelper(adtObject.mmdx.buffer);
        }
        for (var i = 0; i < mddfCount; i++){
            var m2Placement = {};

            m2Placement.nameID    = chunk.readInt32(offset);
            m2Placement.uniqueId  = chunk.readInt32(offset);
            m2Placement.pos       = chunk.readVector3f(offset);
            m2Placement.rotation  = chunk.readVector3f(offset);
            //flags               : WORD;
            m2Placement.scale     = chunk.readInt32(offset);

            var nameOffset = adtObject.mmid[m2Placement.nameID];
            m2Placement.fileName  = mmdxBuff.readString({offs : nameOffset}, mmdxBuff.getLength() - nameOffset);
            m2Objs.push(m2Placement);
        }

        adtObject.mddf = m2Objs;
    },
    "MODF" : function (adtObject, chunk) {
        var offset = { offs : 0 };
        var wmoObjs = [];
        var modfCount = (chunk.chunkLen / (4 + 4 + 4*3 + 4*3 +4*3 + 4*3 + 2 + 2 + 4));

        if (modfCount > 0)  {
            var mwmoBuff = fileReadHelper(adtObject.mwmo.buffer);
        }

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

            var nameOffset = adtObject.mwid[modfChunk.nameId];
            modfChunk.fileName  = mwmoBuff.readString({offs : nameOffset}, mwmoBuff.getLength() - nameOffset);

            wmoObjs.push(modfChunk);
        }

        adtObject.wmoObjs = wmoObjs;
    }
};

class ADTLoader {
    getHandler(sectionName) {
        return handlerTable[sectionName];
    }
}

const defaultAdtLoader = new ADTLoader();

export default function(filename, parentADT){
    var deferred = $q.defer();

    function addTextureNames(adtObj){
        //Add texture names
        if (!adtObj.mcnkObjs) return;
        for (var i = 0; i < adtObj.mcnkObjs.length; i++) {
            var mcnkObj = adtObj.mcnkObjs[i];
            var mtex = adtObj.mtex;

            if (!mcnkObj.textureLayers) continue;
            for (var j = 0; j < mcnkObj.textureLayers.length; j++) {
                var textIndex = mcnkObj.textureLayers[j].textureID;
                var textureName = mtex[textIndex];

                mcnkObj.textureLayers[j].textureName = textureName;
            }
        }
    }

    var promise = chunkedLoader(filename);
    promise.then(function (chunkedFile) {
        /* First chunk in file has to be MVER */

        var adtObj = {};
        adtObj.fileName = filename;
        chunkedFile.setSectionReaders(defaultAdtLoader);
        chunkedFile.processFile(adtObj);
        addTextureNames(adtObj);

        //console.log(adtObj);
        deferred.resolve(adtObj);
    }, function error() {
        deferred.reject();
    });

    return deferred.promise;
}
