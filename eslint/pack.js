// simple node.js script to pack the files making up WebToEpub into single file
"use strict";

var fs = require('fs');
var JSZip = require('../plugin/jszip/dist/jszip.min.js');
var DOMParser = require('xmldom').DOMParser;

var extractFileListFromHtml = function(htmlAsString) {
    let dom = new DOMParser().parseFromString(htmlAsString, "text/html");
    if (dom != null) {
        return Array.from(dom.getElementsByTagName("script"))
            .map(e => e.getAttribute("src"));
    }
    return [];
}

var getFileList = function(fileName) {
    return readFilePromise(fileName).then(function(data) {
        return extractFileListFromHtml(data.toString());
    });
}

var adjustedFileListForEslint = function(fileList) {
    return [ "polyfillEslint.js" ]
        .concat(fileList
            .filter(e => e !== "jszip/dist/jszip.min.js")
            .map(f => "../plugin/" + f)
        );
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

var writeFilePromise = function(fileName, buffer) {
    return new Promise(function(resolve, reject) {
        console.log("writing file: " + fileName);
        fs.writeFile(fileName, new Buffer(buffer), function (err) {    
            if (err) { 
                reject(err); 
            } else {
                resolve();
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


//=================================================================
// pack source into packed.js  So its easy to be examined with eslint
// just run eslint against packed.js

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
        fs.writeFileSync("packed.js", temp);
        fs.writeFileSync("index.csv", index);
    }).catch(function (err) {
        console.log(err);
    });

//=================================================================
// This is bit where we pack the extension into a zip & xpi files.

var addToZipFile = function(zip, nameInZip, filePath) {
    return readFilePromise(filePath).then(function (data) {
        zip.file(nameInZip, data.toString());
    });
}

var writeZipToDisk = function(zip, filePath) {
    console.log("writeZipToDisk");
    return zip.generateAsync({type:"uint8array", compression: "DEFLATE"}).then(function (arraybuffer) {
        return writeFilePromise(filePath, arraybuffer);
    });
}

var addFilesToZip = function(zip, fileList) {
    return fileList.reduce(function(sequence, fileName) {
        return sequence.then(function () {
            return addToZipFile(zip, fileName, "../plugin/" + fileName);
        });
    }, Promise.resolve());
}

var getLocaleFilesNames = function() {
    return new Promise(function(resolve, reject) {
        fs.readdir("../plugin/_locales", function (err, files) {
            if (err) { 
                reject(err); 
            } else {
                resolve(files.map(f => "_locales/" + f + "/messages.json"));
            }
        });
    });
}

var addPopupHtmlToZip = function(zip) {
    return readFilePromise("../plugin/popup.html")
    .then(function (data) {
        let htmlAsString = data.toString()
            .split("\r")
            .filter(s => !s.includes("/experimental/"))
            .join("\r");
        zip.file("popup.html", htmlAsString);
    })
}

var addBinaryFileToZip = function(zip, fileName, nameInZip) {
    return readFilePromise(fileName)
    .then(function(data) {
        zip.file(nameInZip, data);
    });
}

var addImageFileToZip = function(zip, fileName) {
    let dest = "images/" + fileName;
    return addBinaryFileToZip(zip, "../plugin/" + dest, dest);
}

var packNonManifestExtensionFiles = function(zip, packedFileName) {
    return addBinaryFileToZip(zip, "../plugin/book128.png", "book128.png")
    .then(function () {
        return addImageFileToZip(zip, "ChapterStateDownloading.svg");
    }).then(function () {
        return addImageFileToZip(zip, "ChapterStateLoaded.svg");
    }).then(function () {
        return addImageFileToZip(zip, "ChapterStateNone.svg");
    }).then(function () {
        return getFileList("../plugin/popup.html");
    }).then(function(fileList) {
        return getLocaleFilesNames().then(function(localeNames) {
            return ["js/ContentScript.js"].concat(localeNames)
            .concat(fileList.filter(n => !n.includes("/experimental/")));
        });
    }).then(function (fileList) {
        return addFilesToZip(zip, fileList);
    }).then(function () {
        return addPopupHtmlToZip(zip);
    }).then(function() {
        return writeZipToDisk(zip, packedFileName);
    }).then(function() {
        console.log("Wrote Zip to disk");
    }).catch(function (err) {
        console.log(err);    
    });
}

var makeManifestForFirefox = function(data) {
    let manifest = JSON.parse(data.toString());
    delete(manifest.incognito);
    return manifest;    
}

var makeManifestForChrome = function(data) {
    let manifest = JSON.parse(data.toString());
    delete(manifest.applications);
    delete(manifest.browser_action.browser_style);
    manifest.permissions = manifest.permissions
        .filter(p => !p.startsWith("webRequest"));
    return manifest;    
}

var packExtension = function(manifest, fileExtension) {
    let zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest));
    return packNonManifestExtensionFiles(zip, "WebToEpub" + manifest.version + fileExtension);
}

// pack the extensions for Chrome and firefox
readFilePromise("../plugin/manifest.json")
.then(function (data) {
    packExtension(makeManifestForFirefox(data), ".xpi");
    packExtension(makeManifestForChrome(data), ".zip");
}).catch(function (err) {
    console.log(err);
});
