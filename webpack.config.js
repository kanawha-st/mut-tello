const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './public/main.js', // Entry point of your application
    output: {
        filename: 'bundle.js', // Output bundle file
        path: path.resolve(__dirname, 'dist'), // Output directory
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html', // Path to your template file
            filename: 'index.html', // Output file name
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'node_modules/blockly/media', to: 'blockly/media' }, // Copy media files
            ],
        }),
    ],
    resolve: {
        fallback: {
            "dgram": false,
            "fs": false,
            "net": false,
            "tls": false,
            "child_process": false
        }
    },
    mode: 'development', // Set the mode to development
};;