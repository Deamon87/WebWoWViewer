/**
 * Created by Deamon on 07/02/2015.
 */
(function (window, $, undefined) {

    var skinLoader = angular.module('main.services.map.skinLoader', ['main.services.linedFileLoader']);

    skinLoader.factory('skinLoader', ['linedFileLoader', '$log', '$q', function (linedFileLoader, $log, $q) {
        var skinDefinition = {
            name: "header",
            type: "layout",
            layout: [
                {name: "nIndex", type: "int32"},
                {name: "ofsIndex", type: "int32"},
                {name: "nTris", type: "int32"},
                {name: "ofsTris", type: "int32"},
                {name: "nProps", type: "int32"},
                {name: "ofsProps", type: "int32"},
                {name: "nSub", type: "int32"},
                {name: "ofsSub", type: "int32"},
                {name: "nTex", type: "int32"},
                {name: "ofsTex", type: "int32"},
                {name: "LOD", type: "int32"} ,

                {
                    name: "indexes",
                    offset: "ofsIndex",
                    len : "nIndex",
                    type : "uint16Array"
                },
                {
                    name: "triangles",
                    offset: "ofsTris",
                    len : "nTris",
                    type : "uint16Array"
                },
                {
                    name: "subMeshes",
                    offset: "ofsSub",
                    count : "nSub",
                    type : "layout",
                    layout : [
                        {name : "meshID",       type: "int32"},
                        {name : "vStart",       type: "uint16"},
                        {name : "vCount",       type: "uint16"},
                        {name : "idxStart",     type: "uint16"},
                        {name : "idxCount",     type: "uint16"},
                        {name : "idxBone",      type: "uint16"},
                        {name : "OfsBoneList",  type: "uint16"},
                        {name : "unk1",         type: "uint16"},
                        {name : "rootBone",     type: "uint16"},
                        {name : "pos",          type: "vector3f"},
                        {name : "unkPos",       type: "vector3f"},
                        {name : "unkFloat",     type: "float32"}

                    ]
                },
                {
                    name: "texs",
                    offset: "ofsTex",
                    count : "nTex",
                    type : "layout",
                    layout : [
                        {name : "flags",               type: "uint16"},
                        {name : "renderOrder",         type: "int16"},
                        {name : "submeshIndex",        type: "uint16"},
                        {name : "unk1",                type: "uint16"},
                        {name : "colorIndex",          type: "uint16"},
                        {name : "renderFlagIndex",     type: "uint16"},
                        {name : "textureUnitNum",      type: "uint16"},
                        {name : "unk2",                type: "uint16"},
                        {name : "textureIndex",        type: "uint16"},
                        {name : "unk3",                type: "uint16"},
                        {name : "transpIndex",         type: "uint16"},
                        {name : "textureAnim",         type: "uint16"}
                    ]
                }
            ]
        };

        return function(filePath) {
            var deferred = $q.defer();
            var promise = linedFileLoader(filePath);

            promise.then(function success(fileObject){
                    /* Read the header */
                    var offset = {offs : 0};
                    var fileIdent = fileObject.readNZTString(offset, 4);
                    //var fileVersion  = fileObject.readInt32(offset); //is this really version?

                    /* Check the ident */
                    if (fileIdent != "SKIN"){
                        $log.error("Unknown SKIN file ident = ", fileIdent, ", filepath = ", filePath);
                        promise.reject();
                    }

                    /* Parse the header */
                    var resultSkinObject = {
                        header : {}
                    };

                    resultSkinObject.header = fileObject.parseSectionDefinition(resultSkinObject, skinDefinition, fileObject, offset);

                    deferred.resolve(resultSkinObject);
                },
                function error(errorObj){
                    deferred.reject();
                });

            return deferred.promise;
        }
    }]);

})(window, jQuery);