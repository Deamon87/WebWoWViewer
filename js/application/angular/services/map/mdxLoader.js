import $q from 'q';
import linedFileLoader from './../linedfileLoader.js';


const mdx_ver264 = {
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
        {name: "nAnimationLookup",      type: "int32"},
        {name: "ofsAnimationLookup",    type: "int32"},
        {name: "nBones",                type: "int32"},
        {name: "ofsBones",              type: "int32"},
        {name: "nKeyBoneLookup",        type: "int32"},
        {name: "ofsKeyBoneLookup",      type: "int32"},
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
        {name: "nAttachLookup",         type: "int32"},
        {name: "ofsAttachLookup",       type: "int32"},
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
        {name: "nBlendOverrides",     type: "int32"},
        {name: "ofsBlendOverrides",   type: "int32"},
        {
            name : "vertexes",
            offset: "ofsVertexes",
            type : 'uint8Array',
            /*
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
             */
            len : function(obj){
                return obj.nVertexes
                    * (
                        (4 * 3)
                        + 4
                        + 4
                        + (4 * 3)
                        + 4
                        + 4
                        + 4
                        + 4
                    );
            }
        },
        {
            name : "vertexesDebug",
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
            name : "globalSequences",
            offset : "ofsGlobalSequences",
            count : "nGlobalSequences",
            type: "uint32"
        },
        {
            name : "animations",
            offset : "ofsAnimations",
            count : "nAnimations",
            type: "layout",
            layout: [
                //Adapted from http://www.pxr.dk/wowdev/wiki/index.php?title=M2/WotLK#Animation_sequences
                {name: "animation_id",          type: "uint16"},  // Animation id in AnimationData.dbc
                {name: "sub_animation_id",      type: "uint16"},  // Sub-animation id: Which number in a row of animations this one is.
                {name: "length",                type: "uint32"},  // The length (timestamps) of the animation. I believe this actually the length of the animation in milliseconds.
                {name: "moving_speed",          type: "float32"}, // This is the speed the character moves with in this animation.
                {name: "flags",                 type: "uint32"},  // See below.
                {name: "probability",           type: "int16"},   // This is used to determine how often the animation is played. For all animations of the same type, this adds up to 0x7FFF (32767).
                {name: "_padding",              type: "uint16"},
                {name: "minimum_repetitions",   type: "uint32"},  // May both be 0 to not repeat. Client will pick a random number of repetitions within bounds if given.
                {name: "maximum_repetitions",   type: "uint32"},
                {name: "blend_time",            type: "uint32"},  // The client blends (lerp) animation states between animations where the end and start values differ. This specifies how long that blending takes. Values: 0, 50, 100, 150, 200, 250, 300, 350, 500.
                {name: "boundingCorner1",       type: "vector3f"},
                {name: "boundingCorner2",       type: "vector3f"},
                {name: "bound_radius",          type: "float32"},
                {name: "next_animation",        type: "int16"},   // id of the following animation of this AnimationID, points to an Index or is -1 if none.
                {name: "aliasNext",             type: "uint16"}   // id in the list of animations. Used to find actual animation if this sequence is an alias (flags & 0x40)
            ]
        },
        {
            name : "texLookup",
            offset: "ofsTexLookup",
            count : "nTexLookup",
            type: "uint16"
        },
        {
            name : "colors",
            offset: "ofsColors",
            count : "nColors",
            type: "layout",
            layout: [
                {
                    name: "color",
                    type: "ablock",
                    valType: "vector3f"
                },
                {
                    name: "alpha",
                    type: "ablock",
                    valType: "int16"
                }
            ]
        },
        {
            name : "transparencies",
            offset: "ofsTransparency",
            count : "nTransparency",
            type: "layout",
            layout: [
                {
                    name: "values",
                    type: "ablock",
                    valType: "int16"
                }
            ]
        },
        {
            name : "bones",
            offset: "ofsBones",
            count : "nBones",
            type: "layout",
            layout: [
                {name: "key_bone_id", type: "int32"},
                {name: "flags", type: "uint32"},
                {name: "parent_bone", type: "int16"},
                {name: "submesh_id", type: "uint16"},
                {name: "unk1", type: "uint16"},
                {name: "unk2", type: "uint16"},
                {
                    name: "translation",
                    type: "ablock",
                    valType: "vector3f"
                },
                {
                    name: "rotation",
                    type: "ablock",
                    valType: "int16Array",
                    len: 4
                },
                {
                    name: "scale",
                    type: "ablock",
                    valType: "vector3f"
                },
                {name: "pivot", type: "vector3f"}
            ]
        },
        /* Animated textures */
        {
            name : "texAnimLookup",
            offset: "ofsTexAnimLookup",
            count: "nTexAnimLookup",
            type: "int16"
        },
        {
            name : "blendOverrides",
            offset: "ofsBlendOverrides",
            count: "nBlendOverrides",
            type: "int16",
            condition: function(a) {
                return (a.ModelType & 0x8) > 0
            }
        },
        {
            name : "texAnims",
            offset : "ofsTexAnims",
            count : "nTexAnims",
            type: "layout",
            layout: [
                {
                    name: "translation",
                    type: "ablock",
                    valType: "vector3f"
                },
                {
                    name: "rotation",
                    type: "ablock",
                    valType: "vector4f",
                    len: 4
                },
                {
                    name: "scale",
                    type: "ablock",
                    valType: "vector3f"
                }
            ]
        },
        {
            name : "transLookup",
            offset: "ofsTransLookup",
            count : "nTransLookup",
            type: "int16"
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
            type: "int16"
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
        },
        {
            name : "attachments",
            offset: "ofsAttachments",
            count: "nAttachments",
            type: "layout",
            layout: [
                {name : "id",   type : "uint32"},
                {name : "bone", type : "uint16"},
                {name : "unk",  type : "uint16"},
                {name : "pos",  type : "vector3f"},
                {
                    name: "animate_attached",
                    type: "ablock",
                    valType: "uint8"
                }
            ]
        }
    ]
};
const mdx_ver274 = {
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
            type : 'uint8Array',
            /*
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
             */
            len : function(obj){
                return obj.nVertexes
                    * (
                        (4 * 3)
                        + 4
                        + 4
                        + (4 * 3)
                        + 4
                        + 4
                        + 4
                        + 4
                    );
            }
        },
        {
            name : "vertexesDebug",
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
            name : "globalSequences",
            offset : "ofsGlobalSequences",
            count : "nGlobalSequences",
            type: "uint32"
        },
        {
            name : "animations",
            offset : "ofsAnimations",
            count : "nAnimations",
            type: "layout",
            layout: [
                //Adapted from http://www.pxr.dk/wowdev/wiki/index.php?title=M2/WotLK#Animation_sequences
                {name: "animation_id",          type: "uint16"},  // Animation id in AnimationData.dbc
                {name: "sub_animation_id",      type: "uint16"},  // Sub-animation id: Which number in a row of animations this one is.
                {name: "length",                type: "uint32"},  // The length (timestamps) of the animation. I believe this actually the length of the animation in milliseconds.
                {name: "moving_speed",          type: "float32"}, // This is the speed the character moves with in this animation.
                {name: "flags",                 type: "uint32"},  // See below.
                {name: "probability",           type: "int16"},   // This is used to determine how often the animation is played. For all animations of the same type, this adds up to 0x7FFF (32767).
                {name: "_padding",              type: "uint16"},
                {name: "minimum_repetitions",   type: "uint32"},  // May both be 0 to not repeat. Client will pick a random number of repetitions within bounds if given.
                {name: "maximum_repetitions",   type: "uint32"},
                {name: "blend_time",            type: "uint32"},  // The client blends (lerp) animation states between animations where the end and start values differ. This specifies how long that blending takes. Values: 0, 50, 100, 150, 200, 250, 300, 350, 500.
                {name: "boundingCorner1",       type: "vector3f"},
                {name: "boundingCorner2",       type: "vector3f"},
                {name: "bound_radius",          type: "float32"},
                {name: "next_animation",        type: "int16"},   // id of the following animation of this AnimationID, points to an Index or is -1 if none.
                {name: "aliasNext",             type: "uint16"}   // id in the list of animations. Used to find actual animation if this sequence is an alias (flags & 0x40)
            ]
        },
        {
            name : "texLookup",
            offset: "ofsTexLookup",
            count : "nTexLookup",
            type: "uint16"
        },
        {
            name : "colors",
            offset: "ofsColors",
            count : "nColors",
            type: "layout",
            layout: [
                {
                    name: "color",
                    type: "ablock",
                    valType: "vector3f"
                },
                {
                    name: "alpha",
                    type: "ablock",
                    valType: "int16"
                }
            ]
        },
        {
            name : "transparencies",
            offset: "ofsTransparency",
            count : "nTransparency",
            type: "layout",
            layout: [
                {
                    name: "values",
                    type: "ablock",
                    valType: "int16"
                }
            ]
        },
        {
            name : "bones",
            offset: "ofsBones",
            count : "nBones",
            type: "layout",
            layout: [
                {name: "key_bone_id", type: "int32"},
                {name: "flags", type: "uint32"},
                {name: "parent_bone", type: "int16"},
                {name: "submesh_id", type: "uint16"},
                {name: "unk1", type: "uint16"},
                {name: "unk2", type: "uint16"},
                {
                    name: "translation",
                    type: "ablock",
                    valType: "vector3f"
                },
                {
                    name: "rotation",
                    type: "ablock",
                    valType: "int16Array",
                    len: 4
                },
                {
                    name: "scale",
                    type: "ablock",
                    valType: "vector3f"
                },
                {name: "pivot", type: "vector3f"}
            ]
        },
        /* Animated textures */
        {
            name : "texAnimLookup",
            offset: "ofsTexAnimLookup",
            count: "nTexAnimLookup",
            type: "int16"
        },
        {
            name : "texAnims",
            offset : "ofsTexAnims",
            count : "nTexAnims",
            type: "layout",
            layout: [
                {
                    name: "translation",
                    type: "ablock",
                    valType: "vector3f"
                },
                {
                    name: "rotation",
                    type: "ablock",
                    valType: "int16Array",
                    len: 4
                },
                {
                    name: "scale",
                    type: "ablock",
                    valType: "vector3f"
                }
            ]
        },
        {
            name : "transLookup",
            offset: "ofsTransLookup",
            count : "nTransLookup",
            type: "int16"
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
            type: "int16"
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
const mdxTablePerVersion = {
    "264" : mdx_ver264,
    "272" : mdx_ver264,
    "274" : mdx_ver274
};

const mdxChunked = {
    'DIFA' : function (mdxObj, chunk) {

    },
    'DIFB' : function (mdxObj, chunk) {

    },
    'DIFP': function (mdxObj, chunk) {
        var offset = {offs: 0};
    },
    'DIFS': function (mdxObj, chunk) {
        var offset = {offs: 0};
    },
    '12DM': function (mdxObj, chunk) {
        var offset = {offs: 0};
        var arrayBuffer = chunk.sliceArrayBuffer(chunk.chunkOffset+8, chunk.chunkOffset+8+chunk.chunkLen);
        var fileObj = linedFileLoader("", arrayBuffer);
        var resultMDXObject = parseOldFile(fileObj);

        $.extend(mdxObj, resultMDXObject);
    }
};


function parseOldFile(fileObject){
    var offset = {offs : 0};
    var fileIdent =  fileObject.readNZTString(offset, 4);
    var fileVersion = fileObject.readInt32(offset); //is this really version?

    var mdxDescription = mdxTablePerVersion[fileVersion];

    if (mdxDescription == undefined) {
        var errorMessage = "Unknown MDX file version = " + fileVersion + ", filepath = " + filePath;
        $log.error(errorMessage);
        throw errorMessage;
    }

    /* Parse the header */
    var resultMDXObject = {};
    try {
        resultMDXObject = fileObject.parseSectionDefinition(resultMDXObject, mdxDescription, fileObject, offset);
    } catch (e) {
        throw e;
    }
    return resultMDXObject;
}


class BaseMdxChunkedLoader {
    getHandler(sectionName) {
        return handlerTable[sectionName];
    }
}
const mdxChunkedLoader = new BaseMdxChunkedLoader();


export default function(filePath) {
    var promise = linedFileLoader(filePath);

    var newPromise = promise.then(function success(fileObject){
        /* Read the header */
        var offset = {offs : 0};
        var fileIdent = fileObject.readNZTString(offset, 4);

        /* Check the ident */
        if (fileIdent != "MD20" && fileIdent != "MD21"){
            var errorMessage = "Unknown MDX file ident = " + fileIdent + ", filepath = " +  filePath;
            $log.error(errorMessage);
            throw errorMessage;
        }

        if (fileIdent == 'MD21') {
            var resultMDXObject = {};
            var chunkedFile = chunkedLoader(filePath, fileObject.getArrayBuffer());
            chunkedFile.setSectionReaders(mdxChunkedLoader);
            chunkedFile.processFile(resultMDXObject);

            return resultMDXObject;
        } else {
            /* Check the version */
            var deferred = $q.defer();
            var promise = deferred.promise;

            resultMDXObject = parseOldFile(fileObject);
        }
        /* Debug
        if (resultMDXObject.bones.filter((a) => ((a.flags & 0x40) > 0)).length > 0){
            $log.info("File "+ filePath + " has cylindric billboarding bones")
        }
        */

        resultMDXObject.fileName = filePath;
        return resultMDXObject;
    },
    function error(errorObj){
        return errorObj;
    });

    return newPromise;
}
