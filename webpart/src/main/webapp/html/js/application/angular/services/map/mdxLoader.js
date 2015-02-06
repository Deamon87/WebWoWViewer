/**
 * Created by Deamon on 01/02/2015.
 */
(function (window, $, undefined) {

    var mdxLoader = angular.module('main.services.map.mdxLoader', ['main.services.linedFileLoader']);

    mdxLoader.factory('mdxLoader', ['linedFileLoader', '$log', '$q', function (linedFileLoader, $log, $q){

        var mdx_ver264 = {
            name : "header",
            type : "layout",
            layout : [
                {name: "MNameLen",              type: "int32"},
                {name: "MNameOffs",             type: "int32"},
                {name: "ModelType",             type: "int32"},
                {name: "nGlobalSequences",      type: "int32"},
                {name: "ofsGlobalSequences",    type: "int32"},
                {name: "nAnimations",           type: "int32"},
                {name: "ofsAnimations",         type: "int32"},
                {name: "nC",                    type: "int32"},
                {name: "ofsC",                  type: "int32"},
                {name: "nBones",                type: "int32"},
                {name: "ofsBones",              type: "int32"},
                {name: "nF",                    type: "int32"},
                {name: "ofsF",                  type: "int32"},
                {name: "nVertexes",             type: "int32"},
                {name: "ofsVertexes",           type: "int32"},
                {name: "nViews",                type: "int32"},
                {name: "nColors",               type: "int32"},
                {name: "ofsColors",             type: "int32"},
                {name: "nTextures",             type: "int32"},
                {name: "ofsTextures",           type: "int32"},
                {name: "nTransparency",         type: "int32"},
                {name: "ofsTransparency",       type: "int32"},
                {name: "nTexAnims",             type: "int32"},
                {name: "ofsTexAnims",           type: "int32"},
                {name: "nTexReplace",           type: "int32"},
                {name: "ofsTexReplace",         type: "int32"},
                {name: "nRenderFlags",          type: "int32"},
                {name: "ofsRenderFlags",        type: "int32"},
                {name: "nGroupBoneIDs",         type: "int32"},
                {name: "ofsGroupBoneIDs",       type: "int32"},
                {name: "nTexLookup",            type: "int32"},
                {name: "ofsTexLookup",          type: "int32"},
                {name: "nTexUnits",             type: "int32"},
                {name: "ofsTexUnits",           type: "int32"},
                {name: "nTransLookup",          type: "int32"},
                {name: "ofsTransLookup",        type: "int32"},
                {name: "nTexAnimLookup",        type: "int32"},
                {name: "ofsTexAnimLookup",      type: "int32"},
                {name: "BoundingCorner1",       type: "vector3f"},
                {name: "BoundingCorner2",       type: "vector3f"},
                {name: "BoundingRadius",        type: "float32"},
                {name: "Corner1",               type: "vector3f"},
                {name: "Corner2",               type: "vector3f"},
                {name: "Radius",                type: "float32"},
                {name: "nBoundingTriangles",    type: "int32"},
                {name: "ofsBoundingTriangles",  type: "int32"},
                {name: "nBoundingVertices",     type: "int32"},
                {name: "ofsBoundingVertices",   type: "int32"},
                {name: "nBoundingNormals",      type: "int32"},
                {name: "ofsBoundingNormals",    type: "int32"},
                {name: "nAttachments",          type: "int32"},
                {name: "ofsAttachments",        type: "int32"},
                {name: "nP",                    type: "int32"},
                {name: "ofsP",                  type: "int32"},
                {name: "nNumEvents",            type: "int32"},
                {name: "ofsNumEvents",          type: "int32"},
                {name: "nLights",               type: "int32"},
                {name: "ofsLights",             type: "int32"},
                {name: "nCameras",              type: "int32"},
                {name: "ofsCameras",            type: "int32"},
                {name: "nCameraLookup",         type: "int32"},
                {name: "ofsCameraLookup",       type: "int32"},
                {name: "nRibbonEmitters",       type: "int32"},
                {name: "ofsRibbonEmitters",     type: "int32"},
                {name: "nParticleEmitters",     type: "int32"},
                {name: "ofsParticleEmitters",   type: "int32"},
                {
                    name : "vertexes",
                    offset: "ofsVertexes",
                    count : "nVertexes",
                    type : "layout",
                    layout: [
                        {name: "pos",           type : "vector3f"},
                        {name: "bonesWeight",   type : "uint8Array", len: 4},
                        {name: "bones",         type : "uint8Array", len: 4},
                        {name: "normal",        type : "vector3f"},
                        {name: "textureX",      type : "float32"},
                        {name: "textureY",      type : "float32"},
                        {name : "unk1",         type : "int32"},
                        {name : "unk2",         type : "int32"}
                    ]
                },
                {
                    name : "textureDefinition",
                    offset : "ofsTextures",
                    count : "nTextures",
                    type: "layout",
                    layout: [
                        {name: "texType",         type : "uint32"},
                        {name: "flags",           type : "uint32"},
                        {name: "filenameLen",     type : "uint32"},
                        {name: "ofsFilename",     type : "uint32"},
                        {
                            name: "textureName",
                            offset : "ofsFilename",
                            len : "filenameLen",
                            type: "string"
                        }
                    ]
                },
                {
                    name : "texLookup",
                    offset: "ofsTexLookup",
                    count : "nTexLookup",
                    type: "uint16"
                },
                {
                    name : "texReplace",
                    offset: "ofsTexReplace",
                    count : "nTexReplace",
                    type: "uint16"
                },
                {
                    name : "textUnitLookup",
                    offset: "ofsTexUnits",
                    count : "nTexUnits",
                    type: "uint16"
                },
                {
                    name : "renderFlags",
                    offset: "ofsRenderFlags",
                    count : "nRenderFlags",
                    type: "layout",
                    layout : [
                        {name: "flags",         type : "uint16"},
                        {name: "blend",         type : "uint16"}
                    ]
                }
            ]
        };
        var mdxTablePerVersion = {
            "264" : mdx_ver264
        };
        function readType(fileObject, sectionDef, offset, len) {
            var result;

            var type = sectionDef.type;
            switch (type) {
                case "int32" :
                    result = fileObject.readInt32(offset);
                    break;
                case "uint16":
                    result = fileObject.readUint16(offset);
                    break;
                case "uint32":
                    result = fileObject.readUint32(offset);
                    break;
                case "uint8Array" :
                    result = fileObject.readUint8Array(offset, len);
                    break;
                case "vector3f" :
                    result = fileObject.readVector3f(offset);
                    break;
                case "float32" :
                    result = fileObject.readFloat32(offset);
                    break;
                case "string" :
                    if (len != undefined) {
                        result = fileObject.readNZTString(offset, len);
                    } else {
                        result = fileObject.readString(offset, 9999);
                    }
                    break;
                case "layout" :
                    /*
                    * Parse layout
                    */
                    var layout = sectionDef.layout;
                    var resultObj = {};

                    if (!layout instanceof Array) {
                        throw "layout is not array";
                    }

                    for (var i = 0; i < layout.length; i++) {
                        var paramName = layout[i].name;
                        resultObj[paramName] = parseSectionDefinition(resultObj, layout[i], fileObject, offset);
                    }

                    return resultObj;

                default:
                    $log.info("Unknown type in layout. type = ", type);
                    break
            }

            return result;
        }

        function parseSectionDefinition(parentObject, sectionDefinition, fileObject, offset){
            var offs;
            if (typeof sectionDefinition.offset == "string") {
                offs = parentObject[sectionDefinition.offset];
            } else {
                //Assume this is number
                offs = sectionDefinition.offset;
            }

            var len = sectionDefinition.len;
            if (typeof sectionDefinition.len == "string") {
                len = sectionDefinition[len];
            }

            if (offset && offs) {
                offset =  {offs : offs};
            } else if (offs){
                offset = { offs : offs };
            } else if (!offset){
                offset = { offs : 0};
            }


            var layout = sectionDefinition.layout;

            var fieldObject;
            var fieldArray = [];

            var count = 1;
            var countIsGiven = sectionDefinition.count !== undefined;
            if (countIsGiven) {
                count = parentObject[sectionDefinition.count];
            }

            for (var j = 0; j < count; j++) {
                fieldObject = readType(fileObject, sectionDefinition, offset, len);
                fieldArray.push(fieldObject);
            }
            var resultObj;
            if (countIsGiven) {
                resultObj = fieldArray;
            } else {
                resultObj = fieldArray[0];
            }

            return resultObj;
        }


        return function(filePath) {
            var deferred = $q.defer();
            var promise = linedFileLoader(filePath);

            promise.then(function success(fileObject){
                /* Read the header */
                var offset = {offs : 0};
                var fileIdent = fileObject.readNZTString(offset, 4);
                var fileVersion  = fileObject.readInt32(offset); //is this really version?

                /* Check the ident */
                if (fileIdent != "MD20"){
                    $log.error("Unknown MDX file ident = ", fileIdent, ", filepath = ", filePath);
                    promise.reject();
                }

                /* Check the version */
                var mdxDescription = mdxTablePerVersion[fileVersion];
                if (mdxDescription == undefined) {
                    $log.error("Unknown MDX file version = ", fileVersion, ", filepath = ", filePath);
                    promise.reject();
                }

                /* Parse the header */
                var resultMDXObject = {
                    header : {}
                };

                resultMDXObject.header = parseSectionDefinition(resultMDXObject, mdxDescription, fileObject, offset);

                deferred.resolve(resultMDXObject);
            },
            function error(errorObj){
                deferred.reject();
            });

            return deferred.promise;
        }
    }]);

})(window, jQuery);
