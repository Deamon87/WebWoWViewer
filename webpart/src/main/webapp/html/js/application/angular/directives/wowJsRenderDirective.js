/**
 * Created by Deamon on 10/03/2015.
 */
(function (window, $, undefined) {
    var threeJsElem = angular.module('main.directives.wowJsRender', ['js.wow.render.scene']);


    threeJsElem.directive('wowJsRender', ['$log', '$timeout', '$interval', 'scene', function ($log, $timeout, $interval, scene) {
        return {
            restrict: 'E',
            template: '<div class="threeJsDiv"><canvas></canvas></div>',
            link: function postLink(scope, element, attrs) {
                var canvas = element.find('canvas').get(0);

                var sceneObj = new scene(canvas);

                var renderIntervalObj = $interval(function(){
                    sceneObj.draw();
                }, 1);

                sceneObj.loadWMOMap('World/wmo/Dungeon/Ulduar/Ulduar_dwarf77.wmo');
            }
        }
    }]);
})(window, jQuery);