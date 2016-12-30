import linedFileLoader from './../linedfileLoader.js';

const blpDefinition = {
    name: "header",
    type: "layout",
    layout : [
        {name : "version",                  type: "int32"},
        {name : "colorEncoding",            type: "uint8"},
        {name : "alphaChannelBitDepth",     type: "uint8"},
        {name : "preferredFormat",          type: "uint8"},
        {name : "mipmap_level_and_flags",   type: "uint8"},
        {name : "width",                    type: "int32"},
        {name : "height",                   type: "int32"},
        {name : "offsets",                  type: "int32Array", len : 16 },
        {name : "lengths",                  type: "int32Array", len : 16 },
        {name : "palette",                  type: "uint8Array", len : 1024 }
    ]
};

export default function (filePath) {
    var promise = linedFileLoader(filePath);

    var newPromise = promise.then(function success(fileObject) {
            /* Read the header */
            var offset = {offs: 0};
            var fileIdent = fileObject.readNZTString(offset, 4);
            //var fileVersion  = fileObject.readInt32(offset); //is this really version?

            /* Check the ident */
            if (fileIdent != "BLP2") {
                var errorMessage = "Unknown BLP file ident = " + fileIdent + ", filepath = ", filePath;
                $log.error(errorMessage);
                throw errorMessage;
            }

            /* Parse the header */
            var resultBLPObject = {
                header: {}
            };

            var resultBLPObject = fileObject.parseSectionDefinition(resultBLPObject, blpDefinition, fileObject, offset);
            resultBLPObject.fileName = fileObject.filePath;

            /* Post load for texture data. Can't define them through declarative definition */
            var width = resultBLPObject.width;
            var height = resultBLPObject.height;

            /* Determine texture format */
            switch (resultBLPObject.preferredFormat) {
                case 0:
                    if (resultBLPObject.alphaChannelBitDepth > 0) {
                        resultBLPObject.textureFormat = "S3TC_RGBA_DXT1";
                    } else {
                        resultBLPObject.textureFormat = "S3TC_RGB_DXT1";
                    }
                    break;
                case 1:
                    resultBLPObject.textureFormat = "S3TC_RGBA_DXT3";
                    break;
                case 3:
                    resultBLPObject.textureFormat = "BGRA";
                    break;
                case 4:
                    resultBLPObject.textureFormat = "PalARGB1555DitherFloydSteinberg";
                    break;
                case 5:
                    resultBLPObject.textureFormat = "PalARGB4444DitherFloydSteinberg";
                    break;
                case 7:
                    resultBLPObject.textureFormat = "S3TC_RGBA_DXT5";
                    break;
                case 8:
                    resultBLPObject.textureFormat = "BGRA";
                    break;
                case 9:
                    resultBLPObject.textureFormat = "PalARGB2565DitherFloydSteinberg";
                    break;

                default:
                    break;
            }


            /* Load texture by mipmaps */
            var mipmaps = [];
            for (var i = 0; i < 15; i++) {
                if ((resultBLPObject.lengths[i] == 0) || (resultBLPObject.offsets[i] == 0)) break;

                var data = fileObject.readUint8Array({offs: resultBLPObject.offsets[i]}, resultBLPObject.lengths[i]);

                if ((resultBLPObject.colorEncoding == 1) && (resultBLPObject.preferredFormat == 8)) {//Unk format && pixel format 8
                    var paleteData = data;
                    data = new Uint8Array(width*height*4);
                    for (var j = 0; j< width*height; j++) {
                        var colIndex = paleteData[j];
                        var b = resultBLPObject.palette[colIndex*4 + 0];
                        var g = resultBLPObject.palette[colIndex*4 + 1];
                        var r = resultBLPObject.palette[colIndex*4 + 2];

                        var a = paleteData[width*height + j];


                        data[j*4 + 0] = r;
                        data[j*4 + 1] = g;
                        data[j*4 + 2] = b;
                        data[j*4 + 3] = a;
                    }
                }
                //Check dimensions for dxt textures
                var validSize = data.length;
                if ((resultBLPObject.textureFormat == "S3TC_RGBA_DXT5") || (resultBLPObject.textureFormat == "S3TC_RGBA_DXT3")) {
                    validSize = Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;
                }
                if ((resultBLPObject.textureFormat == "S3TC_RGB_DXT1") || (resultBLPObject.textureFormat == "S3TC_RGBA_DXT1")) {
                    validSize = Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;
                }

                if (data.length != validSize) {
                    var newData = new Uint8Array(validSize);
                    for (var j = 0; j < data.length; j++) {
                        newData[j] = data[j];
                    }
                    data = newData;
                }


                mipmaps.push({
                    texture: data,
                    width: width,
                    height: height
                });

                height = Math.floor(height / 2);
                width = Math.floor(width / 2);
                height = (height == 0) ? 1 : height;
                width = (width == 0) ? 1 : width;
            }

            resultBLPObject.mipmaps = mipmaps;

            return resultBLPObject;
        },
        function error(errorObj) {
            throw errorObj;
        });

    return newPromise;
}
