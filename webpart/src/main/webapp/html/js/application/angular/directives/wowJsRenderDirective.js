/**
 * Created by Deamon on 10/03/2015.
 */
(function (window, $, undefined) {
    var threeJsElem = angular.module('main.directives.wowJsRender', ['js.wow.render.scene']);


    threeJsElem.directive('wowJsRender', ['$log', '$timeout', '$interval', 'scene', function ($log, $timeout, $interval, scene) {
        return {
            restrict: 'E',
            template: '<div class="threeJsDiv"><canvas width = "1024" height = "768"></canvas>' +
            '<div>camera = ( {{cameraVecs.cameraVec3[0]}}, {{cameraVecs.cameraVec3[1]}}, {{cameraVecs.cameraVec3[2]}} )</div>' +
            '<div>lookAt = ( {{cameraVecs.lookAtVec3[0]}}, {{cameraVecs.lookAtVec3[1]}}, {{cameraVecs.lookAtVec3[2]}} )</div>' +

            '</div>',
            link: function postLink(scope, element, attrs) {
                var canvas = element.find('canvas').get(0);

                var sceneObj = new scene(canvas);
                var lastTimeStamp = undefined;

                var renderIntervalObj = $interval(function(){

                    var currentTimeStamp = new Date().getTime();
                    var timeDelta = 0;
                    if (lastTimeStamp !== undefined) {
                        timeDelta = currentTimeStamp - lastTimeStamp;
                    }
                    lastTimeStamp = currentTimeStamp;

                    var cameraVecs = sceneObj.draw(timeDelta);


                    scope.cameraVecs = cameraVecs;
                }, 1);


                //sceneObj.loadWMOMap('World/wmo/Dungeon/Ulduar/Ulduar_dwarf77.wmo');
                sceneObj.loadWMOMap("World/wmo/KhazModan/Cities/Ironforge/ironforge.wmo");
                //sceneObj.loadWMOMap("World/wmo/Northrend/Dalaran/ND_Dalaran.wmo");
                //sceneObj.loadWMOMap("World/wmo/Azeroth/Buildings/Stormwind/Stormwind.wmo");
            }
        }
    }]);
})(window, jQuery);