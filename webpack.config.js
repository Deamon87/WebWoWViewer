module.exports = {
    debug: true,
    devtool: 'source-map',

    context: __dirname + '/app/js',

    entry: "./app",


    output: {
        path: 'build',
        filename: "[name].js",
        library: "[name]"
    },


    module: {
        loaders: [{
            test: /\.js?$/,
            loader: 'babel-loader',
            exclude: [/node_modules/, /js\/lib/],
            query: {
                presets: ['es2015']
            }
        }]
    }
};

