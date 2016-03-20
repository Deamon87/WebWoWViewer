var BowerWebpackPlugin = require("bower-webpack-plugin");
var webpack = require("webpack");
var path = require('path');


module.exports = {
    debug: true,
    devtool: 'source-map',

    context: __dirname,

    entry: ["./js/application/angular/app_wowjs.js"],


    output: {
        path: 'build',
        filename: "[name].js",
        library: "[name]"
    },
    resolve: {
        extensions: ['', '.js', '.jsx','.glsl'],
        root: [
            path.resolve('./js/application/angular'),
            path.resolve('./glsl/'),
            path.resolve('./js/lib/bower')
        ]

    },

    module: {
        loaders: [
            {
                test: /\.js?$/,
                loader: 'babel',
                exclude: [/node_modules/, /zip.js/ ],
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.glsl?$/,
                loader: 'webpack-glsl'
            }
        ]
    },

    plugins: [
        new webpack.ResolverPlugin(
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin(".bower.json", ["main"])
        )
    ]
};

