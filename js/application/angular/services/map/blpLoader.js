/**
 * Created by Deamon on 07/02/2015.
 */
(function (window, $, undefined) {

    var blpLoader = angular.module('main.services.map.blpLoader', ['main.services.linedFileLoader']);
    blpLoader.factory('blpLoader', ['linedFileLoader', '$log', '$q', function (linedFileLoader, $log, $q) {

        var blpDefinition = {
            name: "header",
            type: "layout",
            layout : [
                {name : "type",         type: "int32"},
                {name : "encoding",     type: "uint8"},
                {name : "alphaDepth",   type: "uint8"},
                {name : "alphaEncoding",type: "uint8"},
                {name : "hasMips",      type: "uint8"},
                {name : "width",        type: "int32"},
                {name : "height",       type: "int32"},
                {name : "offsets",      type: "int32Array", len : 16 },
                {name : "lengths",      type: "int32Array", len : 16 },
                {name : "palette",      type: "uint8Array", len : 256 }
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
                    if (fileIdent != "BLP2"){
                        $log.error("Unknown BLP file ident = ", fileIdent, ", filepath = ", filePath);
                        promise.reject();
                    }

                    /* Parse the header */
                    var resultBLPObject = {
                        header : {}
                    };

                    var resultBLPObject = fileObject.parseSectionDefinition(resultBLPObject, blpDefinition, fileObject, offset);
                    resultBLPObject.fileName = filePath;

                    /* Post load for texture data. Can't define them through declarative definition */
                    var width = resultBLPObject.width;
                    var height = resultBLPObject.height;
                    if (resultBLPObject.type == 1) {

                        /* Determine texture format */
                        if (resultBLPObject.encoding == 2) {
                            switch(resultBLPObject.alphaDepth) {
                                case 0:
                                    resultBLPObject.textureFormat = "S3TC_RGB_DXT1";
                                    break;
                                case 1:
                                    resultBLPObject.textureFormat = "S3TC_RGB_DXT1";
                                    break;
                                case 4:
                                    resultBLPObject.textureFormat = "S3TC_RGBA_DXT3";
                                    break;
                                case 8:
                                    if (resultBLPObject.alphaEncoding == 1) {
                                        resultBLPObject.textureFormat = "S3TC_RGBA_DXT3";
                                    } else {
                                        resultBLPObject.textureFormat = "S3TC_RGBA_DXT5";
                                    }
                                    break;
                                default :
                                    resultBLPObject.textureFormat = "S3TC_RGBA_DXT3";
                                    break;
                            }
                        }
                        else if (resultBLPObject.encoding == 1) {
                            resultBLPObject.textureFormat = "BGRA";
                        }

                        /* Load texture by mipmaps */
                        var mipmaps = [];
                        for (var i = 0; i < 15; i++){
                            if ((resultBLPObject.lengths[i] == 0) || (resultBLPObject.offsets[i] == 0)) break;

                            var data = fileObject.readUint8Array({ offs : resultBLPObject.offsets[i]} ,resultBLPObject.lengths[i]);

                            mipmaps.push({
                                texture: data,
                                width: width,
                                height: height
                            });

                            height = Math.floor(height / 2);
                            width  = Math.floor(width / 2);
                            height = (height == 0) ? 1 : height;
                            width = (width == 0) ? 1 : width;
                        }
                    }
                    resultBLPObject.mipmaps = mipmaps;

                    deferred.resolve(resultBLPObject);
                },
                function error(errorObj){
                    deferred.reject();
                });

            return deferred.promise;
        }
    }]);
})(window, jQuery);
