module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('bower.json'),
        bower: {
            update: {
                options:{
                    copy: false,
                    cleanTargetDir: true,
                    verbose: true
                }
            }
        },
        bower_concat: {
            all: {
                dest: 'js/bower_deps.js',
                dependencies: {
                },
                mainFiles:{
                    'angular':'angular.min.js',
                    'stats.js': 'build/stats.min.js'
                }
            }
        },
        uglify: {
            options:{
                sourceMap : true
            },
            libs: {
                files: {
                    "js/bower_deps.min.js" :
                        [
                            'js/bower_deps.js'
                        ],
                    "js/application.min.js" :
                        [
                            'js/shaders.js',
                            'js/application/**/*.js'
                        ]
                }
            }
        },
        ngtemplates:    {
            'main.glsl.cache': {
                cwd:        '',
                src:        ['glsl/**.glsl'],
                dest:       'js/shaders.js',
                options:    {
                    bootstrap:  function(module, script) {
                        return "angular.module(\""+module+"\", []).run(['$templateCache', function($templateCache) {\n"+
                                script+
                                "\n"+
                                "}]);";
                    }
                }
            }
        },
        watch: {
            files: ['glsl/**.glsl', 'js/application/**/*.js'],
            tasks: ['ngtemplates','uglify']
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-bower-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-ngmin');
    grunt.loadNpmTasks('grunt-angular-templates');

    grunt.registerTask('minification-pipe-line', [ 'bower', 'bower_concat', 'ngtemplates', 'uglify', 'watch']);

};