const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
    const isProduction = argv.mode === "production";

    return {
        entry: "./index.ts",
        output: {
            filename: "bundle.min.[contenthash].js",
            path: path.resolve(__dirname, "dist"),
            publicPath: isProduction ? "/globular-element/" : "/", // Set only in production
        },
        mode: isProduction ? "production" : "development",
        devtool: isProduction ? "source-map" : "eval-source-map",
        resolve: {
            extensions: [".ts", ".js"],
            alias: {
                "@polymer": path.resolve(__dirname, "node_modules/@polymer"),
                "crypto": path.resolve(__dirname, 'node_modules/crypto-browserify'),
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
                    test: /\.(png|jpe?g|gif|svg|webp)$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: {
                                name: "assets/[name].[hash].[ext]",
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
                publicPath: isProduction ? "/globular-element/" : "/", // Set only in production
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: "assets",
                        to: "assets",
                    },
                ],
            }),
        ],
        devServer: {
            static: {
                directory: path.join(__dirname, "dist"),
            },
            compress: true,
            port: 9000,
            historyApiFallback: true,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            },
            allowedHosts: 'all', // Ensures the dev server allows all hosts
            client: {
                webSocketURL: 'auto://0.0.0.0:0/ws', // Prevents CORS issues with WebSocket
            },
        },
    };
};
