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


    module: {
        loaders: [{
            test: /\.js?$/,
            loader: 'babel',
            exclude: [/node_modules/ ],
            query: {
                presets: ['es2015']
            }
        }
        ]
    },
    plugins: [
        new BowerWebpackPlugin({
            modulesDirectories: [__dirname+"/js/lib/bower"],
            manifestFiles:      "bower.json",
            searchResolveModulesDirectories: true
        }),
        new webpack.ProvidePlugin({
            $: 'jquery'
        })
    ]
};

