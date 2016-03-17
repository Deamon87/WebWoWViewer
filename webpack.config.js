var BowerWebpackPlugin = require("bower-webpack-plugin");
var webpack = require("webpack");

module.exports = {
    debug: true,
    devtool: 'source-map',

    context: __dirname + '/js/application/angular',

    entry: ["./app_wowjs.js"],


    output: {
        path: 'build',
        filename: "[name].js",
        library: "[name]"
    },
    resolve: {
        extensions: ['', '.js', '.jsx'],
        alias: {}
    },

    module: {
        loaders: [
            {
                test: /\.js?$/,
                loader: 'babel',
                exclude: [/node_modules/ ],
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.glsl$/,
                loader: 'webpack-glsl'
            }
        ]
    },
    plugins: [

    ]
};

