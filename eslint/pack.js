// simple node.js script to pack the files making up WebToEpub into single file
"use strict";

var fs = require('fs')

var fileList = [
    "../plugin/js/UserPreferences.js",
    "../plugin/js/EpubMetaInfo.js",
    "../plugin/js/Util.js",
    "../plugin/js/HttpClient.js",
    "../plugin/js/EpubItem.js",
    "../plugin/js/ParserFactory.js",
    "../plugin/js/ImageCollector.js",
    "../plugin/js/parsers/Parser.js",
    "../plugin/js/parsers/ArchiveOfOurOwnParser.js",
    "../plugin/js/parsers/BakaTsukiParser.js",
    "../plugin/js/parsers/BlogspotParser.js",
    "../plugin/js/parsers/FanFictionParser.js",
    "../plugin/js/parsers/GravityTalesParser.js",
    "../plugin/js/parsers/HellpingParser.js",
    "../plugin/js/parsers/JaptemParser.js",
    "../plugin/js/parsers/KrytykalParser.js",
    "../plugin/js/parsers/MuggleNetParser.js",
    "../plugin/js/parsers/ReadLightNovelParser.js",
    "../plugin/js/parsers/RoyalRoadParser.js",
    "../plugin/js/parsers/ShikkakutranslationsParser.js",
    "../plugin/js/parsers/UltimaguilParser.js",
    "../plugin/js/parsers/WordpressBaseParser.js",
    "../plugin/js/parsers/WuxiaworldParser.js",
    "../plugin/js/parsers/ZirusMusingsParser.js",
    "../plugin/js/EpubItemSupplier.js",
    "../plugin/js/CoverImageUI.js",
    "../plugin/js/parsers/SonakoParser.js",
    "../plugin/js/EpubPacker.js",
    "../plugin/js/testFunctions.js",
    "../plugin/js/main.js"
];

// wrap readFile in a promise
var readFilePromise = function(fileName) {
    return new Promise(function(resolve, reject) {
        console.log("reading file: " + fileName);
        fs.readFile(fileName, function (err, data) {
            if (err) { 
                reject(err); 
            } else {
                resolve(data);
            }
        });
    });
}

// package geting all the files
var readAllFiles = function(fileList, loadedFiles) {
    return fileList.reduce(function(sequence, fileName) {
        return sequence.then(function () {
            return readFilePromise(fileName);
        }).then(function(data) {
            console.log("saving file:  " + fileName);
            loadedFiles.push({
                fileName: fileName, 
                text:     data.toString()
            });
        });
    }, Promise.resolve());
}

var countLines = function(fileText) {
    return fileText.split("\n").filter(s => s != "").length;
}

var makeIndexLine = function(fileName, startIndex, count) {
    return '"' + fileName + '", ' + (startIndex + 1) + ', ' + (startIndex + count) + '\r\n';
}

// do the work
var loadedFiles = [];
readAllFiles(fileList, loadedFiles)
    .then(function (data) {
        let temp = "";
        let lineCount = 0;
        let index = "";
        for(let f of loadedFiles) {
            temp += f.text;
            let count = countLines(f.text);
            index +=  makeIndexLine(f.fileName, lineCount, count);
            lineCount += count;
        }
        fs.writeFile("packed.js", temp);
        fs.writeFile("index.csv", index);
    }).catch(function (err) {
        console.log(err);
    });
