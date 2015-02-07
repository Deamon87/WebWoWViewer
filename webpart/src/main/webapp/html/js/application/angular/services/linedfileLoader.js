/**
 * Created by Deamon on 03/02/2015.
 */

(function (window, $, undefined) {

    var linedFileLoader = angular.module('main.services.linedFileLoader', ['main.services.fileReadHelper']);


    linedFileLoader.factory('linedFileLoader', ['configService', "fileReadHelper", '$http', "$q", '$log', function (configService, fileReadHelper, $http, $q, $log) {
        return function (filePath) {
            var deferred = $q.defer();
            var fullPath = configService.urlToLoadWoWFile + filePath;

            $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                var fileReader = fileReadHelper(a);

                function LinedFileObj(){
                    this.loadDataAtOffset = function (offset, length) {
                        return fileReadHelper(a, offset, length)
                    };
                    this.readType = function(fileObject, sectionDef, offset, len) {
                        var result;

                        var type = sectionDef.type;
                        switch (type) {
                            case "int16":
                                result = fileObject.readInt16(offset);
                                break;
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
                            case "uint16Array" :
                                result = fileObject.readUint16Array(offset, len);
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
                                    resultObj[paramName] = this.parseSectionDefinition(resultObj, layout[i], fileObject, offset);
                                }

                                return resultObj;

                            default:
                                $log.info("Unknown type in layout. type = ", type);
                                break
                        }

                        return result;
                    }

                    this.parseSectionDefinition = function(parentObject, sectionDefinition, fileObject, offset){
                        var offs;
                        if (typeof sectionDefinition.offset == "string") {
                            offs = parentObject[sectionDefinition.offset];
                        } else {
                            //Assume this is number
                            offs = sectionDefinition.offset;
                        }

                        var len = sectionDefinition.len;
                        if (typeof sectionDefinition.len == "string") {
                            len = parentObject[len];
                        }

                        if (offset && offs) {
                            offset =  {offs : offs};
                        } else if (offs){
                            offset = { offs : offs };
                        } else if (!offset){
                            offset = { offs : 0};
                        }

                        var fieldObject;
                        var fieldArray = [];

                        var count = 1;
                        var countIsGiven = sectionDefinition.count !== undefined;
                        if (countIsGiven) {
                            count = parentObject[sectionDefinition.count];
                        }

                        for (var j = 0; j < count; j++) {
                            fieldObject = this.readType(fileObject, sectionDefinition, offset, len);
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
                }
                LinedFileObj.prototype = fileReader;

                var linedFileObj = new LinedFileObj();

                deferred.resolve(linedFileObj);
            }).error(function() {
                deferred.reject();
            });

            return deferred.promise;
        };

    }]);

})(window, jQuery);