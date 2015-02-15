/**
 * Created by Deamon on 28/01/2015.
 */
(function (window, $, undefined) {

    var fileReadHelper = angular.module('main.services.fileReadHelper', ['main.services.config']);


    fileReadHelper.factory('fileReadHelper', ['$log', function ($log) {
        var isLittleEndian = true;
        var textDecoder = new TextDecoder("utf-8");

        function reverseStr(str) {
            var newStr = '', i;
            for (i = str.length - 1; i >= 0; i--) {
                newStr += str.charAt(i);
            }
            return newStr;
        }


        return function (arrayBuffer, start, end){
            var dataView = new DataView(arrayBuffer, start, end);
            var uint8Array = new Uint8Array(arrayBuffer, start, end);

            return {
                getLength : function(){
                    return uint8Array.length;
                },
                readInt8 : function (offsetObj) {
                    var result = dataView.getInt8(offsetObj.offs); offsetObj.offs += 1;
                    return result;
                },
                readInt16 : function (offsetObj) {
                    var result = dataView.getInt16(offsetObj.offs, isLittleEndian); offsetObj.offs += 2;
                    return result;
                },
                readInt32 : function (offsetObj) {
                    var result = dataView.getInt32(offsetObj.offs, isLittleEndian); offsetObj.offs += 4;
                    return result;
                },
                readUint8 : function (offsetObj) {
                    var result = dataView.getUint8(offsetObj.offs); offsetObj.offs += 1;
                    return result;
                },
                readUint16 : function (offsetObj) {
                    var result = dataView.getUint16(offsetObj.offs, isLittleEndian); offsetObj.offs += 2;
                    return result;
                },
                readUint32 : function (offsetObj) {
                    var result = dataView.getUint32(offsetObj.offs, isLittleEndian); offsetObj.offs += 4;
                    return result;
                },
                readFloat32 : function (offsetObj) {
                    var result = dataView.getFloat32(offsetObj.offs, isLittleEndian); offsetObj.offs += 4;
                    return result;
                },
                readFloat64 : function (offsetObj) {
                    var result = dataView.getFloat64(offsetObj.offs, isLittleEndian); offsetObj.offs += 8;
                    return result;
                },
                readVector3f : function (offsetObj) {
                    var vector3f = {};

                    vector3f.x = this.readFloat32(offsetObj);
                    vector3f.y = this.readFloat32(offsetObj);
                    vector3f.z = this.readFloat32(offsetObj);

                    return vector3f;
                },
                readVector2f : function (offsetObj) {
                    var vector2f = {};

                    vector2f.x = this.readFloat32(offsetObj);
                    vector2f.y = this.readFloat32(offsetObj);

                    return vector2f;
                },
                readQuaternion : function (offsetObj) {
                    var quaternion = {};

                    /* Imagine part of quaternion */
                    quaternion.imag = this.readVector3f(offsetObj);
                    /* Real part of quaternion */
                    quaternion.real = this.readFloat32(offsetObj);

                    return quaternion;
                },
                readUint8Array : function (offsetObj, length) {
                    var vector = new Uint8Array(length);
                    for (var i = 0; i < length; i ++) {
                        vector[i] = this.readUint8(offsetObj);
                    }

                    return vector;
                },
                readUint16Array : function (offsetObj, length) {
                    var vector = [];
                    for (var i = 0; i < length; i ++) {
                        vector[i] = this.readUint16(offsetObj);
                    }

                    return vector;
                },
                readInt32Array : function (offsetObj, length) {
                    var vector = [];
                    for (var i = 0; i < length; i ++) {
                        vector[i] = this.readInt32(offsetObj);
                    }

                    return vector;
                },
                readFloat32Array : function (offsetObj, length) {
                    var vector = [];
                    for (var i = 0; i < length; i ++) {
                        vector[i] = this.readFloat32(offsetObj);
                    }

                    return vector;
                },
                readString : function (offsetObj, maxlen) {
                    /**
                     * @param array Array where to search
                     * @param valueToFind Value to search for
                     * @param start Start search at this index
                     * @param stop Stop search before this index
                     *
                     * @returns number in array
                     */
                    function findInArray(array, valueToFind, start, stop){
                        for (var i = start; i < stop; i++) {
                            if (array[i] == valueToFind) {
                                return i;
                            }
                        }
                        return stop;
                    }
                    var strStart  = offsetObj.offs;
                    var strEnd = findInArray(uint8Array, 0, strStart, strStart+maxlen);

                    var tempStr = textDecoder.decode(uint8Array.subarray(strStart, strEnd));
                    offsetObj.offs = strEnd;

                    return tempStr;
                },
                /* Read non-zero terminated string */
                readNZTString : function (offsetObj, maxlen) {
                    var strStart  = offsetObj.offs;
                    var strEnd = strStart+maxlen;

                    var tempStr = textDecoder.decode(uint8Array.subarray(strStart, strEnd));
                    offsetObj.offs = strEnd;

                    return tempStr;
                },
                reverseStr : function(str) {
                    return reverseStr(str);
                }
            }
        }
    }]);

})(window, jQuery);