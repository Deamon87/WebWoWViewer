/**
 * Created by Deamon on 10/03/2015.
 */
(function (window, $, undefined) {
    var wowJsRender = angular.module('main.directives.wowJsRender', ['js.wow.render.scene']);
    wowJsRender.directive('wowJsRender', ['$log', '$timeout', '$interval', '$window', 'scene', 'adtLoader',
        function ($log, $timeout, $interval, $window, scene, adtLoader) {
        return {
            restrict: 'E',
            template:
                '<div class=""><canvas width = "1024" height = "768" ></canvas>' +
                '<div>camera = ( {{cameraVecs.cameraVec3[0]}}, {{cameraVecs.cameraVec3[1]}}, {{cameraVecs.cameraVec3[2]}} )</div>' +
                '<div>lookAt = ( {{cameraVecs.lookAtVec3[0]}}, {{cameraVecs.lookAtVec3[1]}}, {{cameraVecs.lookAtVec3[2]}} )</div>' +
                '</div>',
            link: function postLink(scope, element, attrs) {
                var canvas = element.find('canvas')[0];

                var sceneObj = new scene(canvas);
                var lastTimeStamp = undefined;

                var renderfunc = function(){

                    var currentTimeStamp = new Date().getTime();
                    var timeDelta = 0;
                    if (lastTimeStamp !== undefined) {
                        timeDelta = currentTimeStamp - lastTimeStamp;
                    }
                    lastTimeStamp = currentTimeStamp;

                    var cameraVecs = sceneObj.draw(timeDelta);
                    scope.cameraVecs = cameraVecs;

                    //scope.$digest();

                    $window.requestAnimationFrame(renderfunc);
                };
                $window.requestAnimationFrame(renderfunc);

                $window.setInterval(function(){
                    scope.$digest();
                }, 200);

                /*sceneObj.loadWMOFile({
                    fileName : "World/wmo/Dungeon/Ulduar/Ulduar_dwarf77.wmo",
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    doodadSet: 0
                });*/

                /*
                sceneObj.loadWMOFile({
                    fileName : "World/wmo/KhazModan/Cities/Ironforge/ironforge.wmo",
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    doodadSet: 0
                });*/

                ///sceneObj.loadWMOMap("WORLD/WMO/OUTLAND/TEROKKAR/SHATTRATHCITY.WMO");
                //sceneObj.loadWMOMap("World/wmo/Northrend/Dalaran/ND_Dalaran.wmo");
                /*
                sceneObj.loadWMOFile({
                 fileName : "World/wmo/Azeroth/Buildings/Stormwind/Stormwind.wmo",
                 uniqueId : 0,
                 pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                 rotation : {x : 0, y: 0, z : 0},
                 doodadSet: 0
                 });
                  */

                sceneObj.loadWMOFile({
                    fileName : "World/wmo/Dungeon/Ulduar/Ulduar_Raid.wmo",
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    doodadSet: 0
                });


                /*
                sceneObj.loadWMOFile({
                    fileName : "World/wmo/Dungeon/MD_DiamondMt/DiamondMountain.wmo",
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    doodadSet: 0
                });
                */

                //sceneObj.loadMap("Kalimdor", 32, 32);
                //sceneObj.loadMap("Azeroth", 31, 31);
                //sceneObj.loadMap("Northrend", 29, 22); sceneObj.setCameraPos(4800, 1066, 137);
                //sceneObj.loadMap("DeathKnightStart", 43, 28); sceneObj.setCameraPos(2033, -5843, 230);
                //sceneObj.loadMap("Expansion01", 22, 35); sceneObj.setCameraPos(-1663, 5098, 27);
                //sceneObj.loadMap("HallsOfReflection", 28, 21); sceneObj.setCameraPos(5245, 2025, 733);
                //sceneObj.loadMap("HallsOfReflection", 30, 21); sceneObj.setCameraPos(5641, 963, 733);
                /*
                sceneObj.loadM2File({
                    fileName : "WORLD\\EXPANSION01\\DOODADS\\SHATTRATH\\PASSIVEDOODADS\\CENTRAL_ENERGY_FX\\SHATTRATH_NARRU_ENERGY_FX.m2",
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    scale    : 1024
                });
                */


                /*
                sceneObj.loadM2File({
                    fileName : "WORLD\\GENERIC\\HUMAN\\PASSIVE DOODADS\\THRONE\\STORMWINDTHRONE.MD2",
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    scale    : 1024
                });
                  */

                //adtLoader('world//maps\\AhnQiraj\\AhnQiraj_26_46.adt');
                //adtLoader('world\\maps\\Kalimdor\\Kalimdor_19_12.adt')
                //adtLoader('world\\maps\\Kalimdor\\Kalimdor_1_1.adt')
            }
        }
    }]);
})(window, jQuery);