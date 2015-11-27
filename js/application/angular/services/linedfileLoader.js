/**
 * Created by Deamon on 03/02/2015.
 */

(function (window, $, undefined) {

    var linedFileLoader = angular.module('main.services.linedFileLoader', ['main.services.fileReadHelper']);


    linedFileLoader.factory('linedFileLoader', ['fileLoader', "fileReadHelper", "$q", '$log', function (fileLoader, fileReadHelper, $q, $log) {
        return function (filePath) {
            return fileLoader(filePath).then(function success(a) {
                var fileReader = fileReadHelper(a);

                function LinedFileObj(){
                    this.loadDataAtOffset = function (offset, length) {
                        return fileReadHelper(a, offset, length)
                    };
                    this.readType = function(fileObject, sectionDef, offset, len) {
                        var self = this;
                        var result;

                        var type = sectionDef.type;
                        switch (type) {
                            case "int8":
                                result = fileObject.readInt8(offset);
                                break;
                            case "int16":
                                result = fileObject.readInt16(offset);
                                break;
                            case "int32" :
                                result = fileObject.readInt32(offset);
                                break;
                            case "uint8":
                                result = fileObject.readUint8(offset);
                                break;
                            case "uint16":
                                result = fileObject.readUint16(offset);
                                break;
                            case "uint32":
                                result = fileObject.readUint32(offset);
                                break;
                            case "int32Array" :
                                result = fileObject.readInt32Array(offset, len);
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
                            case "ablock" :

                                result = {};
                                result.interpolation_type = fileObject.readUint16(offset);
                                result.global_sequence = fileObject.readUint16(offset);

                                /* 1. Timestamps  */
                                var timeStampAnimationsCnt = fileObject.readInt32(offset);
                                var timeStampAnimationsOffset = fileObject.readInt32(offset);

                                timeStampAnimationsCnt = (timeStampAnimationsCnt < 0) ? 0 : timeStampAnimationsCnt;

                                result.timestampsPerAnimation = [];
                                result.timestampsPerAnimation.length = timeStampAnimationsCnt;

                                var off1 = {offs: timeStampAnimationsOffset};
                                for (var i = 0; i < timeStampAnimationsCnt; i++) {
                                    result.timestampsPerAnimation[i] = [];
                                    var timestampsCnt = fileObject.readUint32(off1);
                                    var timestampsOff = fileObject.readUint32(off1);

                                    var offs2 = {offs : timestampsOff};
                                    result.timestampsPerAnimation[i].length = timestampsCnt;
                                    for (var j = 0; j < timestampsCnt; j++) {
                                        result.timestampsPerAnimation[i][j] = fileObject.readUint32(offs2);
                                    }
                                }

                                /* 2. Values */
                                var valuesAnimationsCnt = fileObject.readInt32(offset);
                                var valuesAnimationsOffset = fileObject.readInt32(offset);

                                valuesAnimationsCnt = (valuesAnimationsCnt <= 0) ? 0 : valuesAnimationsCnt;

                                result.valuesPerAnimation = [];
                                result.valuesPerAnimation.length = valuesAnimationsCnt;

                                var offs1 = {offs: valuesAnimationsOffset} ;
                                for (var i = 0; i < valuesAnimationsCnt; i++) {
                                    result.valuesPerAnimation[i] = [];

                                    var valuesCnt = fileObject.readUint32(offs1);
                                    var valuesOffset = fileObject.readUint32(offs1);
                                    result.valuesPerAnimation[i].length = valuesCnt;

                                    var offs2 = {offs : valuesOffset};
                                    for (var j = 0; j < valuesCnt; j++) {
                                        result.valuesPerAnimation[i][j] = self.readType(
                                            fileObject,
                                            {type : sectionDef.valType, len: sectionDef.len},
                                            offs2,
                                            sectionDef.len
                                        );
                                    }
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
                    };

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
                        } else if (typeof sectionDefinition.len == "function") {
                            len = sectionDefinition.len(parentObject);
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

                return linedFileObj;
            }, function error(e) {
                return e;
            });

        };

    }]);

})(window, jQuery);