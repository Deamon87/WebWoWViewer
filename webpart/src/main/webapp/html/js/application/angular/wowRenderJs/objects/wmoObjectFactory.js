'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoObjectFactory', ['js.wow.render.wmoM2ObjectFactory']);
    cacheTemplate.factory("wmoObjectFactory", ['$q', '$timeout', 'wmoM2ObjectFactory', function($q, $timeout, wmoM2ObjectFactory) {

        function WmoObject(sceneApi){
            var self = this;
            self.sceneApi = sceneApi;

            self.wmoGroupArray = [];
            self.doodadsArray = [];
        }
        WmoObject.prototype = {
            loadGeom : function (num, filename){
                var self = this;
                self.sceneApi.loadWmoGeom(filename).then(
                    function success(wmoGeom){
                        self.wmoGroupArray[num] = wmoGeom;

                        /* 1. Load textures */
                        wmoGeom.loadTextures(self.wmoObj.momt);

                    }, function error(){
                    }
                );
            },
            loadDoodads : function (doodadsInd){
                var self = this;
                var doodadsSet = self.wmoObj.modd[doodadsInd];

                this.doodadsArray = [];
                //for (var i = 0; i < doodadsSet.doodads.length; i++) {
                for (var i = 0; i < 10; i++) {
                    var doodad = doodadsSet.doodads[i];
                    this.loadDoodad(i, doodad);
                }
            },
            loadDoodad : function (index, doodad) {
                var self = this;

                self.doodadsArray[index] = new wmoM2ObjectFactory(self.sceneApi);
                self.doodadsArray[index].load(doodad)
            },
            load : function (filename, doodadsInd){
                var deferred = $q.defer();
                var self = this;

                var wmoMailPromise = self.sceneApi.loadWmoMain(filename);
                wmoMailPromise.then(function success(wmoObj){
                    self.wmoObj = wmoObj;
                    self.wmoGroupArray = [];
                    self.wmoGroupArray.length = wmoObj.nGroups;

                    /* 1. Load wmo group files */
                    var template = filename.substr(0, filename.lastIndexOf("."));
                    for (var i = 0; i < wmoObj.nGroups; i++) {
                        /* Fill the string with zeros, so it would have length of 3 */
                        var num = (i).toString();
                        for (;num.length != 3; ){
                            num = '0' + num;
                        }

                        //self.loadGeom(i, template + "_" + num + ".wmo");
                    }

                    /* 2. Load doodads */
                    self.loadDoodads(doodadsInd);
                }, function error (){
                });
            },
            draw : function () {
                /* Draw */
                for (var i = 0; i < this.wmoGroupArray.length; i++){
                    if (this.wmoGroupArray[i]){
                        this.wmoGroupArray[i].draw();
                    }
                }

                for (var i = 0; i < this.doodadsArray.length; i++) {
                    this.doodadsArray[i].draw()
                }
            }
        };

        return WmoObject;
    }]);
})(window, jQuery);