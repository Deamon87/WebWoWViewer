var urlToLoadWoWFile = '/get/';
var readFileMethod = 'zip';
var archiveUrl = 'http://deamon87.github.io/WoWFiles/shattrath.zip';

var archiveFile = null;

var renderAdt = true;
var renderMd2 = true;
var renderBSP = false;
var renderPortals = false;
var usePortalCulling = true;

var drawWmoBB = false;
var drawM2BB = false;
var secondCamera = false;
var doubleCameraDebug = false;

var drawDepthBuffer = false;
var fileList = [];

var cameraM2 = null;

var savedUrlForLoading;
try {
    savedUrlForLoading = localStorage.getItem('urlForLoading');
} catch(e){
    console.log(e);
}
if (savedUrlForLoading) {
    urlToLoadWoWFile = savedUrlForLoading;
}

var sceneParams = null;

export default {
    getUrlToLoadWoWFile: function (){
        return urlToLoadWoWFile;
    },
    setUrlToLoadWoWFile : function (url){
        urlToLoadWoWFile = url;
        try {
            localStorage.setItem('urlForLoading', url);
        } catch(e) {
            console.log(e);
        }
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
    getRenderAdt : function () {
        return renderAdt;
    },
    setRenderAdt : function (value) {
        renderAdt = value;
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
    getDrawDepthBuffer : function () {
        return drawDepthBuffer;
    },
    setDrawDepthBuffer : function (value) {
        drawDepthBuffer = value;
    },
    getCameraM2 : function () {
        return cameraM2;
    },
    setCameraM2 : function (value) {
        cameraM2 = value;
    },
    setFileList: function (value){
        debugger;
        fileList = value;
    },
    getFileList: function () {
        return fileList;
    }
}
