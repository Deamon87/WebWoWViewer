/**
 * Created by Deamon on 28/01/2015.
 */
(function (window, $, undefined) {

    var fileReadHelper = angular.module('main.services.fileReadHelper', ['main.services.config']);


    fileReadHelper.factory('fileReadHelper', [function () {
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
                readInt8 : function (offs) {
                    return dataView.getInt8(offs);
                },
                readInt16 : function (offs) {
                    return dataView.getInt16(offs, isLittleEndian);
                },
                readInt32 : function (offs) {
                    return dataView.getInt32(offs, isLittleEndian);
                },
                readUint8 : function (offs) {
                    return dataView.getUint8(offs);
                },
                readUint16 : function (offs) {
                    return dataView.getUint16(offs, isLittleEndian);
                },
                readUint32 : function (offs) {
                    return dataView.getUint32(offs, isLittleEndian);
                },
                readString : function (offs, maxlen) {
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
                    var strStart  = offs;
                    var strEnd = findInArray(uint8Array, 0, offs, offs+maxlen);

                    var tempStr = textDecoder.decode(uint8Array.subarray(strStart, strEnd));
                    return tempStr;
                },
                reverseStr : function(str) {
                    return reverseStr(str);
                }
            }
        }
    }]);

})(window, jQuery);