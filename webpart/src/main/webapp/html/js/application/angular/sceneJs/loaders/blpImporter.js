/**
 * Created by Deamon on 10/02/2015.
 */
(function (window, $, undefined) {
    var wmoLoader = angular.module('main.angular.sceneJs.loader.blpImporter', ['main.services.map.blpLoader']);

    /*
     * Loader for group wmo files
     * These files contain geometry
     * */
    wmoLoader.factory('registerBlpImporter', ["blpLoader", '$log', function (blpLoader, $log) {
        SceneJS.Types.addType("import/blp", {
            construct: function (params) {
                if (!params.src) {
                    this.log("error", "Attribute expected: src");
                }

                // Notify SceneJS so it can support loading/busy indicators etc
                this._taskId = this.taskStarted("Loading .blp");
                var self = this;



                blpLoader(params.src).then(function success(blpFile) {
                    self.addNode({
                        type: "texture",
                        compressed: blpFile.textureFormat,

                        image : blpFile.mipmaps,
                        nodes: params.nodes
                    });

                    /*
                     self.addNode({
                     type: "_texture",
                     layers: [
                     {
                     compressed: blpFile.textureFormat,
                     image : blpFile.mipmaps,
                     applyTo: "color",
                     scale: {
                     x: .2,
                     y: .2
                     }
                     }
                     ],
                     coreId : params.src
                     });
                     */

                    self._taskId = self.taskFinished(self._taskId);
                }, function error(){});
            }
        });
    }]);
})(window, jQuery);