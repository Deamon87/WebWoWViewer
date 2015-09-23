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
                dest: 'js/temp/bower_deps.js',
                dependencies: {
                },
                mainFiles:{
                    'angular':'angular.min.js',
                    'stats.js': 'build/stats.min.js',
                    'zip.js' : 'WebContent/zip.js'
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
                            'js/temp/bower_deps.js',
                            'js/temp/worker-inflater.js'
                        ],
                    "js/application.min.js" :
                        [
                            'js/temp/shaders.js',
                            'js/application/**/*.js'
                        ]
                }
            }
        },
        concat: {
            dist: {
                options: {
                    // Replace all 'use strict' statements in the code with a single one at the top
                    stripBanners : true,
                    banner: 'var deflateWorker = "',
                    separator : '',
                    process: function(src, filepath) {
                        var concatedStr = src
                            .replace(/"/g, '\\"')
                            .replace(/'/g, '\\\'')
                            .replace(/\r/g, '')
                            .replace(/\n/g, '\\n"+\n"');

                        //console.log(concatedStr[concatedStr.length-1] + "_" + concatedStr[concatedStr.length-2]);
                        //if (concatedStr[concatedStr.length-1] == '"'){
                        //    concatedStr = concatedStr.substr(0, concatedStr.length - 1);
                        //}

                        return concatedStr;
                    },
                    footer : '";' +
                        'var blob = new Blob([deflateWorker]);' +
                        'var blobURL = window.URL.createObjectURL(blob);' +
                        'window["zip"].workerScripts = { '+
                        '   inflater: [blobURL]'+
                        '};'
                },
                files: {
                    'js/temp/worker-inflater.js': ['js/lib/bower/zip.js/WebContent/z-worker.js', 'js/lib/bower/zip.js/WebContent/inflate.js']
                }
            }
        },
        cssmin: {
            options: {
                sourceMap : false
            },
            target: {
                files: [{
                    'css/application.min.css' : ["js/lib/bower/bootstrap/dist/css/bootstrap.css"]
                }]
            }
        },
        ngtemplates:    {
            'main.glsl.cache': {
                cwd:        '',
                src:        ['glsl/**.glsl'],
                dest:       'js/temp/shaders.js',
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
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-ngmin');
    grunt.loadNpmTasks('grunt-angular-templates');

    grunt.registerTask('minification-pipe-line', [ 'bower', 'bower_concat', 'cssmin', 'concat', 'ngtemplates', 'uglify', 'watch']);

};