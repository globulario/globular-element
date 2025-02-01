const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: "./index.ts",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/",
    },
    mode: "development",
    devtool: "source-map",
    devServer: {
        static: "./dist",
        hot: true,
        open: true,
        watchFiles: ["src/**/*", "dist/**/*"], // Watch files in dist and src for changes
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "@polymer": path.resolve(__dirname, "node_modules/@polymer"),
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/, // Handling images
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: "assets/[name].[hash].[ext]", // Output to dist/assets
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({ filename: "./style.css" }),
        new HtmlWebpackPlugin({
            template: "./index.html",
            inject: "body",
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "assets", // Path to your assets folder
                    to: "assets",   // Where the assets should go in dist/
                },
            ],
        }),
    ],
};
