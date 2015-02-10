/**
 * Created by Deamon on 08/02/2015.
 */
(function (window, $, undefined) {
    var threeJsElem = angular.module('main.directives.threeJsElem', ['main.threejs.wmoThreejsLoader']);


    threeJsElem.directive('threeJsElem', ['$log', '$timeout', '$interval', 'wmoThreejsLoader', function ($log, $timeout, $interval, wmoThreejsLoader) {
        return {
            restrict: 'E',
            template: '<div class="threeJsDiv"></div>',
            link: function postLink(scope, element, attrs) {
                var camera, renderer, scene, stats;
                var controls, clock = new THREE.Clock();


                camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 15000 );
                camera.position.z = 1000;

                controls = new THREE.FlyControls( camera );
                controls.movementSpeed = 1000;
                controls.rollSpeed = Math.PI / 10;

                scene = new THREE.Scene();
                scene.fog = new THREE.Fog( 0x000000, 1, 15000 );
                scene.autoUpdate = false;

                var light = new THREE.PointLight( 0xff2200 );
                light.position.set( 0, 0, 0 );
                scene.add( light );

                var light = new THREE.DirectionalLight( 0xffffff );
                light.position.set( 0, 0, 1 ).normalize();
                scene.add( light );


                renderer = new THREE.WebGLRenderer();
                renderer.setPixelRatio( window.devicePixelRatio );
                renderer.setSize( window.innerWidth, window.innerHeight );
                renderer.sortObjects = false;

                element.append(renderer.domElement);


                stats = new Stats();
                stats.domElement.style.position = 'absolute';
                stats.domElement.style.top = '0px';
                element.append( stats.domElement );

                window.addEventListener( 'resize', onWindowResize, false );

                animate();

                function onWindowResize() {

                    camera.aspect = element.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();

                    renderer.setSize( element.innerWidth, window.innerHeight );

                }
                function render() {
                    controls.update( clock.getDelta() );

                    scene.updateMatrixWorld();
                    scene.traverse( function ( object ) {

                        if ( object instanceof THREE.LOD ) {

                            object.update( camera );
                        }
                    });

                    renderer.render( scene, camera );
                }



                function animate() {
                    $timeout( animate, 40 );

                    render();
                    stats.update();
                }

                wmoThreejsLoader("World/wmo/Dungeon/LD_DragonIsles/DragonIsles_D.wmo").then(
                    function success(object){
                        scene.add(object)
                    },
                    function error(){

                    }
                )

            }
        }
    }]);
})(window, jQuery);