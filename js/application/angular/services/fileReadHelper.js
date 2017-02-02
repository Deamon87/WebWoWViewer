import * as textEncodeModule from "text-encoding";

var isLittleEndian = true;
var textDecoder = null;

try {
    textDecoder = new TextDecoder("utf-8");
} catch (e) {
    textDecoder = new textEncodeModule.TextDecoder("utf-8");
}


function reverseStr(str) {
    var newStr = '', i;
    for (i = str.length - 1; i >= 0; i--) {
        newStr += str.charAt(i);
    }
    return newStr;
}


export default function (arrayBuffer, start, end){
    var dataView;
    if (start&&end) {
        dataView = new DataView(arrayBuffer, start, end);
    } else {
        dataView = new DataView(arrayBuffer);
    }
    var uint8Array;
    if (start&&end) {
        uint8Array = new Uint8Array(arrayBuffer, start, end);
    } else {
        uint8Array = new Uint8Array(arrayBuffer);
    }
    return {
        getArrayBuffer : function() {
            return arrayBuffer;
        },
        sliceArrayBuffer : function(start, end) {
            return arrayBuffer.slice(start, end);
        },
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
            var result = dataView.getFloat32(offsetObj.offs, isLittleEndian);
            offsetObj.offs += 4;

            return result;
        },
        readFloat64 : function (offsetObj) {
            var result = dataView.getFloat64(offsetObj.offs, isLittleEndian); offsetObj.offs += 8;
            return result;
        },
        readVector4f : function (offsetObj) {
            var vector3f = {};

            vector3f.x = this.readFloat32(offsetObj);
            vector3f.y = this.readFloat32(offsetObj);
            vector3f.z = this.readFloat32(offsetObj);
            vector3f.w = this.readFloat32(offsetObj);

            return vector3f;
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
            var newArrayBuffer = this.sliceArrayBuffer(dataView.byteOffset + offsetObj.offs, dataView.byteOffset+offsetObj.offs+length);
            var vector = new Uint8Array(newArrayBuffer);
            offsetObj.offs += length;

            return vector;
        },
        readInt8Array : function (offsetObj, length) {
            var newArrayBuffer = this.sliceArrayBuffer(dataView.byteOffset + offsetObj.offs, dataView.byteOffset+offsetObj.offs+length);
            var vector = new Int8Array(newArrayBuffer);
            offsetObj.offs += length;

            return vector;
        },
        readUint16Array : function (offsetObj, length) {
            var vectorByteOffset = dataView.byteOffset + offsetObj.offs;
            var vectorByteLength = length * 2;

            var newArrayBuffer = this.sliceArrayBuffer(vectorByteOffset, vectorByteOffset+vectorByteLength);
            var vector = new Uint16Array(newArrayBuffer);

            offsetObj.offs += vectorByteLength;

            return vector;
        },
        readInt16Array : function (offsetObj, length) {
            var vectorByteOffset = dataView.byteOffset + offsetObj.offs;
            var vectorByteLength = length * 2;

            var newArrayBuffer = this.sliceArrayBuffer(vectorByteOffset, vectorByteOffset+vectorByteLength);
            var vector = new Int16Array(newArrayBuffer);

            offsetObj.offs += vectorByteLength;

            return vector;
        },
        readInt32Array : function (offsetObj, length) {
            var vectorByteOffset = dataView.byteOffset + offsetObj.offs;
            var vectorByteLength = length * 4;

            var newArrayBuffer = this.sliceArrayBuffer(vectorByteOffset, vectorByteOffset+vectorByteLength);
            var vector = new Int32Array(newArrayBuffer);

            offsetObj.offs += vectorByteLength;
            return vector;
        },
        readFloat32Array : function (offsetObj, length) {
            var vectorByteOffset = dataView.byteOffset + offsetObj.offs;
            var vectorByteLength = length * 4;

            var newArrayBuffer = this.sliceArrayBuffer(vectorByteOffset, vectorByteOffset+vectorByteLength);
            var vector = new Float32Array(newArrayBuffer);

            offsetObj.offs += vectorByteLength;

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
};
