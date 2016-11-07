var urlToLoadWoWFile = '/get/';
var readFileMethod = 'zip';
var archiveUrl = 'http://deamon87.github.io/WoWFiles/shattrath.zip';

var archiveFile = null;

var renderMd2 = true;
var renderBSP = false;
var renderPortals = false;
var usePortalCulling = true;

var drawWmoBB = false;
var drawM2BB = false;
var secondCamera = false;
var doubleCameraDebug = false;

var wireframeMod = true;

var savedUrlForLoading = localStorage.getItem('urlForLoading');
if (savedUrlForLoading) {
    urlToLoadWoWFile = savedUrlForLoading;
}

var sceneParams = null;

//zip.workerScriptsPath = 'js/lib/bower/zip.js/WebContent/';
/*zip.workerScripts = {
    deflater: ['<zip_js_dir>/z-worker.js', '<zip_js_dir>/deflate.js'],
    inflater: null
};*/

export default {
    getUrlToLoadWoWFile: function (){
        return urlToLoadWoWFile;
    },
    setUrlToLoadWoWFile : function (url){
        urlToLoadWoWFile = url;
        localStorage.setItem('urlForLoading', url);
    },
    getFileReadMethod : function(){
        return readFileMethod;
    },
    setFileReadMethod : function(value){
        readFileMethod = value;
    },
    getArchiveUrl : function (){
        return archiveUrl;
    },
    setArchiveUrl : function (value) {
        archiveUrl = value;
    },

    getArchiveFile : function (){
        return archiveFile;
    },
    setArchiveFile : function(archive) {
        archiveFile = archive;
    },
    getRenderM2 : function () {
        return renderMd2;
    },
    setRenderM2 : function (value) {
        renderMd2 = value;
    },
    getRenderBSP : function () {
        return renderBSP;
    },
    setRenderBSP : function (value) {
        renderBSP = value;
    },
    getRenderPortals : function () {
        return renderPortals;
    },
    setRenderPortals : function (value) {
        renderPortals = value;
    },
    getUsePortalCulling : function () {
        return usePortalCulling;
    },
    setUsePortalCulling : function (value) {
        usePortalCulling = value;
    },
    getSceneParams : function () {
        return sceneParams;
    },
    setSceneParams: function (value) {
        sceneParams = value;
    },
    getDrawWmoBB : function (){
        return drawWmoBB;
    },
    setDrawWmoBB : function (value) {
        drawWmoBB = value;
    },
    getDrawM2BB : function (){
        return drawM2BB;
    },
    setDrawM2BB: function (value) {
        drawM2BB = value;
    },
    getUseSecondCamera : function() {
        return secondCamera;
    },
    setUseSecondCamera : function(value) {
        secondCamera = value;
    },
    getDoubleCameraDebug : function () {
        return doubleCameraDebug;
    },
    setDoubleCameraDebug : function (value) {
        doubleCameraDebug = value;
    },
    getWireframeMod: function () {
        return wireframeMod
    }
}

