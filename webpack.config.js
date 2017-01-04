var BowerWebpackPlugin = require("bower-webpack-plugin");
var webpack = require("webpack");
var path = require('path');


module.exports = {
    debug: true,
    devtool: 'sourcemap',

    context: __dirname,

    entry: ['bootstrap-loader', "./js/application/angular/app_wowjs.js"],


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
                exclude: [/node_modules/, /zip.js/, /text-encoding/ ],
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.glsl?$/,
                loader: 'raw'
            },
            {
                test: /\.glsl?$/,
                loader: 'glslify'
            },
            { test: /\.css$/, loader: "style-loader!css-loader" },
            {
                test: /\.scss$/,
                loaders: ["style", "css", "sass"]
            },
            { test: /\.woff$/,   loader: "url-loader?limit=10000&minetype=application/font-woff" },
            { test: /\.woff2$/,  loader: "url-loader?limit=10000&minetype=application/font-woff" },
            { test: /\.ttf$/,    loader: "file-loader" },
            { test: /\.eot$/,    loader: "file-loader" },
            { test: /\.svg$/,    loader: "file-loader" },
            { test: /\.json$/,   loader: 'json' }
        ]
    },

    plugins: [
        new webpack.ResolverPlugin(
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin(".bower.json", ["main"])
        )
    ],
    devServer: {
        contentBase: '.',
        stats: 'minimal'
    }
};

