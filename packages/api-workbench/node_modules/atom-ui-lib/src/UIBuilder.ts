///// <reference path="../typings/main.d.ts" />
//var webpack = require("webpack");
//
//import path =require("path");
//import http = require('http');
//import url = require('url');
//import fs = require('fs');
//
//var StringReplacePlugin = require("string-replace-webpack-plugin");
//var wrench = require('wrench');
//
//var showStats = true;
//
//webFs.setRequestHandler(requestedPath => {
//    if(showStats) {
//        console.log("path added to bundle: " + requestedPath);
//    }
//
//    var filePath = null;
//
//    if(requestedPath.indexOf('/examples') === 0) {
//        filePath = path.resolve(__dirname, '../../..' + requestedPath);
//    } else {
//        filePath = path.resolve(__dirname, '../..' + requestedPath);
//    }
//
//    var exist = fs.existsSync(filePath);
//    var directory = exist ? fs.statSync(filePath).isDirectory() : false;
//    var content = exist && !directory ? fs.readFileSync(filePath).toString() : null;
//
//    var names = directory ? fs.readdirSync(filePath) : [];
//
//    var result = {
//        exist: exist,
//        content: content,
//        directory: directory,
//        names: names
//    };
//
//    return JSON.stringify(result);
//})
//
//var exec = require('child_process').exec;
//
//var httpServer: http.Server = null;
//
//var contentServer: http.Server = null;
//
//var port = 9595;
//
//export function doBuild(destination?: any, needServer: boolean = true, runSite: boolean = true, showStats: boolean = true, openMicrosite: boolean = false, done = null) {
//    var fullPath = path.resolve(__dirname, './bundledUI.js');
//
//    var currentDirectory = path.dirname(fullPath);
//
//    var outputPath = destination ? destination : (currentDirectory + "/bundled");
//
//    if(!fs.existsSync(outputPath)) {
//        fs.mkdirSync(outputPath);
//    }
//
//    fs.writeFileSync(currentDirectory + "/bundled" + "/webFsPort.js", 'exports.value = ' + port + ';exports.mode=' + (needServer ? '"withServer"' : '"standAlone"') + ';');
//
//    var config = {
//        context: currentDirectory,
//
//        entry: fullPath,
//
//        output: {
//            path: outputPath,
//
//            filename: "bundle.js"
//        },
//
//        resolve: {
//            alias: {
//                atom: path.resolve(__dirname, './UI.js'),
//                pathwatcher: path.resolve(__dirname, './pathwatcherWeb.js'),
//                fs: path.resolve(__dirname, './webFs.js'),
//                'atom-space-pen-views': path.resolve(__dirname, './spacePenViewsWeb.js'),
//                'webFsPort': currentDirectory + "/bundled/webFsPort.js",
//                dummyContentLoader: path.resolve(__dirname, needServer ? './dummyContentLoader.js' : './embedContentLoader.js')
//            }
//        },
//
//        externals: [
//            {
//                child_process: true,
//                xmlhttprequest: true,
//                pluralize: true,
//                webpack: true,
//                remote: true,
//                "./dummyContentLoader": "contentLoader",
//                "./resourceRegistry": "resourceRegistry",
//                "./TSDeclModel": "TS",
//                "./JavaClientSerializer": "JavaSerializer",
//                "../../automation/executorDeploy": "executorDeploy",
//                './atomWrapper': 'atom',
//                '../raml1/atomWrapper': 'atom',
//                '../../ramlscript/platformExecution': 'platformExecution',
//                './tooltipManager': 'tooltipManagerReq'
//            }
//        ],
//
//        plugins: [
//            //new webpack.optimize.UglifyJsPlugin({
//            //    minimize: false,
//            //    output: {comments: false},
//            //    sourceMap: false
//            //}),
//
//            new StringReplacePlugin(),
//
//            new webpack.DefinePlugin({
//                'process.platform': {
//                    match: function(arg) {
//
//                    }
//                },
//                'process.env': {
//                    'HOME': '"/virtual"'
//                },
//                'global.WeakMap': null
//            })
//        ],
//
//        module: {
//            loaders: [
//                {
//                    test: /\.json$/,
//                    loader: "json"
//                },
//
//                {
//                    test: /\.js$/, loader: StringReplacePlugin.replace({
//                    replacements: [
//                        {
//                            pattern: /# sourceMappingURL/ig,
//
//                            replacement: function (match, p1, offset, string) {
//                                return 'sourceMappingURL';
//                            }
//                        }
//                    ]
//                })
//                }
//            ]
//        },
//
//        target: "web",
//
//        node: {
//            console: false,
//            global: true,
//            process: true,
//            Buffer: true,
//            __filename: true,
//            __dirname: true,
//            setImmediate: true
//        }
//    };
//
//    webpack(config, function (err, stats) {
//        if (err) {
//            console.log(err.message);
//            return;
//        }
//
//        if(showStats) {
//            console.log(stats.toString({ reasons: true, errorDetails: true }));
//        }
//
//
//        if(needServer) {
//            startServer();
//
//            console.log("Server started");
//        }
//
//        if(runSite) {
//            console.log("Opening browser");
//
//            exec('open http://localhost:' + port + '/atom/ramlscript/bundled/index.html');
//        }
//
//        if(openMicrosite) {
//            exec('open ' + path.resolve(__dirname, '../../../microsite/dist/index.html'));
//        }
//
//        if(done) {
//            done();
//        }
//    });
//}
//
//export function startServer() {
//    if(!httpServer) {
//        httpServer = http.createServer(doStuff);
//
//        httpServer.listen(port);
//    }
//}
//
//function doStuff(request: http.ServerRequest, response: http.ServerResponse) {
//    var parsedUrl = url.parse(request.url, true);
//
//    var uri : string = parsedUrl.pathname;
//
//    response.setHeader("Access-Control-Allow-Origin", "*");
//
//    if(uri.length > 2) {
//        var opt = 'utf8'
//
//        if(path.basename(uri).indexOf('.woff') > 0) {
//            opt = 'binary'
//
//            response.setHeader('Content-Type', 'application/x-font-woff');
//        } else if(path.basename(uri).indexOf('.png') > 0) {
//            opt = 'binary'
//
//            response.setHeader('Content-Type', 'image/png');
//        }
//
//        var content = doContentStuff(uri, opt);
//
//        response.end(content, opt);
//
//        return;
//    }
//
//    request.on('data', function (chunk) {
//        console.log("requested path: " + chunk);
//
//        var filePath = path.resolve(__dirname, '../..' + chunk);
//
//        var exist = fs.existsSync(filePath);
//        var directory = exist ? fs.statSync(filePath).isDirectory() : false;
//        var content = exist && !directory ? fs.readFileSync(filePath).toString() : null;
//
//        var names = directory ? fs.readdirSync(filePath) : [];
//
//        var result = {
//            exist: exist,
//            content: content,
//            directory: directory,
//            names: names
//        };
//
//        response.end(JSON.stringify(result));
//    });
//}
//
//function doContentStuff(uri, opt) {
//    var filePath = path.resolve(__dirname, '../..' + uri);
//
//    try {
//        return fs.readFileSync(filePath, opt).toString()
//    } catch(exception) {
//        return '';
//    }
//}
//
//export function showRaml(version: string) {
//    startServer();
//
//    exec('open http://localhost:' + port + '/raml1/artifacts/output/raml' + version + '.html');
//}
//
//export function buildMicrosite(projects, _showStats: boolean, open: boolean = false, customDist = null, done = null) {
//    var src = path.resolve(__dirname, "./bundled");
//    var dist = customDist ? customDist : path.resolve(__dirname, '../../../microsite/dist/bundled');
//
//    showStats = _showStats;
//
//    fileList.forEach(filePath => {
//        webFs.readFileSync(filePath);
//    });
//
//    projects.forEach(project => {
//        if(!project.files) {
//            return;
//        }
//
//        project.files.forEach(filePath => {
//            webFs.readFileSync(project.url + '/' + filePath);
//        });
//    });
//
//    fs.writeFileSync(path.resolve(__dirname, './temp/initialWebFs.json'), JSON.stringify((<any>webFs).memory));
//    fs.writeFileSync(path.resolve(__dirname, './temp/projectDescriptors.json'), JSON.stringify(projects));
//
//    if(fs.existsSync(dist)) {
//        wrench.rmdirSyncRecursive(dist, true);
//    }
//
//    wrench.copyDirSyncRecursive(src , dist);
//
//    doBuild(dist, false, false, showStats, open, done);
//}