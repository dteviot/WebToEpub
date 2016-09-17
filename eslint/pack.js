// simple node.js script to pack the files making up WebToEpub into single file
"use strict";

var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;

var extractFileListFromHtml = function(htmlAsString) {
    let dom = new DOMParser().parseFromString(htmlAsString, "text/html");
    if (dom != null) {
        return Array.prototype.slice.apply(dom.getElementsByTagName("script"))
            .map(e => "../plugin/" + e.getAttribute("src"));
    }
    return [];
}

var getFileList = function(fileName) {
    return readFilePromise(fileName).then(function(data) {
        return extractFileListFromHtml(data.toString());
    });
}

var adjustedFileListForEslint = function(fileList) {
    return [ "polyfillEslint.js" ].concat(fileList.filter(e => e !== "../plugin/jszip/dist/jszip.min.js"));
}

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

getFileList("../plugin/popup.html").then(function(fileList) {
        fileList =  adjustedFileListForEslint(fileList);
        console.log(fileList);
        return readAllFiles(fileList, loadedFiles);
    }).then(function (data) {
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
