// simple node.js script to pack the files making up WebToEpub into single file
"use strict";

var fs = require("fs");
var zipjs = require("../node_modules/@zip.js/zip.js/index.cjs");
var DOMParser = require("@xmldom/xmldom").DOMParser;

var extractFileListFromHtml = function(htmlAsString) {
    let dom = new DOMParser().parseFromString(htmlAsString, "text/html");
    if (dom != null) {
        return Array.from(dom.getElementsByTagName("script"))
            .map(e => e.getAttribute("src"));
    }
    return [];
};

var getFileList = async function(fileName) {
    let data = await readFilePromise(fileName);
    return extractFileListFromHtml(data.toString());
};

var adjustedFileListForEslint = function(fileList) {
    return fileList
        .filter(e => e !== "@zip.js/zip.js/dist/zip-no-worker.min.js")
        .filter(e => e !== "dompurify/dist/purify.min.js")
        .map(f => "../plugin/" + f);
};

// wrap readFile in a promise
var readFilePromise = function(fileName) {
    return new Promise(function(resolve, reject) {
        console.log("reading file: " + fileName);
        fs.readFile(fileName, function(err, data) {
            if (err) { 
                reject(err); 
            } else {
                resolve(data);
            }
        });
    });
};

var writeFilePromise = function(fileName, buffer) {
    return new Promise(function(resolve, reject) {
        console.log("writing file: " + fileName);
        fs.writeFile(fileName, Buffer.from(buffer), function(err) {    
            if (err) { 
                reject(err); 
            } else {
                resolve();
            }
        });
    });
};

// package geting all the files
var readAllFiles = async function(fileList, loadedFiles) {
    return await fileList.forEach(async function(fileName) {
        let data = await readFilePromise(fileName);
        console.log("saving file:  " + fileName);
        loadedFiles.push({
            fileName: fileName, 
            text:     data.toString()
        });
    });
};

var countLines = function(fileText) {
    return fileText.split("\n").filter(s => s != "").length;
};

var makeIndexLine = function(fileName, startIndex, count) {
    return "\"" + fileName + "\", " + (startIndex + 1) + ", " + (startIndex + count) + "\r\n";
};

//=================================================================
// This is bit where we pack the extension into a zip & xpi files.

var addToZipFile = async function(zip, nameInZip, filePath) {
    let data = await readFilePromise(filePath);
    zip.add(nameInZip, new zipjs.Uint8ArrayReader(data));
};

var writeZipToDisk = async function(zip, filePath) {
    console.log("writeZipToDisk " + filePath);
    let buffer = await zip.close();
    let arraybuffer = await buffer.arrayBuffer();
    await writeFilePromise(filePath, arraybuffer);
};

var addFilesToZip = async function(zip, fileList) {
    return await fileList.forEach(async function(fileName) {
        return await addToZipFile(zip, fileName, "../plugin/" + fileName);
    });
};

var getLocaleFilesNames = function() {
    return new Promise(function(resolve, reject) {
        fs.readdir("../plugin/_locales", function(err, files) {
            if (err) { 
                reject(err); 
            } else {
                resolve(files.map(f => "_locales/" + f + "/messages.json"));
            }
        });
    });
};

var addPopupHtmlToZip = async function(zip) {
    let data = await readFilePromise("../plugin/popup.html");
    let htmlAsString = data.toString()
        .split("\r")
        .filter(s => !s.includes("/experimental/"))
        .join("\r");
    zip.add("popup.html", new zipjs.TextReader(htmlAsString));
};

var addBinaryFileToZip = async function(zip, fileName, nameInZip) {
    let data = await readFilePromise(fileName);
    zip.add(nameInZip, new zipjs.Uint8ArrayReader(data));
};

var addImageFileToZip = function(zip, fileName) {
    let dest = "images/" + fileName;
    return addBinaryFileToZip(zip, "../plugin/" + dest, dest);
};

var addCssFileToZip = function(zip, fileName) {
    let dest = "css/" + fileName;
    return addBinaryFileToZip(zip, "../plugin/" + dest, dest);
};

var packNonManifestExtensionFiles = async function(zip, packedFileName) {
    try {
        await addBinaryFileToZip(zip, "../plugin/book128.png", "book128.png");
        await addImageFileToZip(zip, "ChapterStateDownloading.svg");
        await addImageFileToZip(zip, "ChapterStateLoaded.svg");
        await addImageFileToZip(zip, "ChapterStateNone.svg");
        await addImageFileToZip(zip, "ChapterStateSleeping.svg");
        await addImageFileToZip(zip, "FileEarmarkCheck.svg");
        await addImageFileToZip(zip, "FileEarmarkCheckFill.svg");
        await addCssFileToZip(zip, "default.css");
        await addCssFileToZip(zip, "alwaysDark.css");
        await addCssFileToZip(zip, "autoDark.css");
        let fileList = await getFileList("../plugin/popup.html");
        let localeNames = await getLocaleFilesNames();
        ["js/ContentScript.js"].concat(localeNames).concat(fileList.filter(n => !n.includes("/experimental/")));
        await addFilesToZip(zip, fileList);
        await addPopupHtmlToZip(zip);
        await writeZipToDisk(zip, packedFileName);
        console.log("Wrote Zip to disk");
    }
    catch (err) {
        console.log(err);    
    }
};

var makeManifestForFirefox = function(data) {
    let manifest = JSON.parse(data.toString());
    delete(manifest.incognito);
    manifest.manifest_version = 2;

    // fix permissions/host_permissions
    let permissions = manifest.permissions;
    permissions = permissions.filter(p => p != "scripting");
    // Add webRequestBlocking for Firefox
    if (permissions.includes("webRequest") && !permissions.includes("webRequestBlocking")) {
        permissions.push("webRequestBlocking");
    }
    manifest.permissions = permissions.concat(manifest.host_permissions);
    delete manifest.host_permissions;
    
    // rename action => browser_action
    manifest.browser_action = manifest.action;
    delete manifest.action;
    return manifest;    
};

var makeManifestForChrome = function(data) {
    let manifest = JSON.parse(data.toString());
    delete(manifest.browser_specific_settings);
    delete(manifest.action.browser_style);
    manifest.permissions = manifest.permissions
        .filter(p => !p.startsWith("webRequest"));
    return manifest;    
};

var packExtension = async function(manifest, fileExtension) {
    let zipFileWriter = new zipjs.BlobWriter("application/epub+zip");
    let zipWriter = new zipjs.ZipWriter(zipFileWriter, {useWebWorkers: false,compressionMethod: 8, extendedTimestamp: false});
    zipWriter.add("manifest.json", new zipjs.TextReader(JSON.stringify(manifest)));
    return await packNonManifestExtensionFiles(zipWriter, "WebToEpub" + manifest.version + fileExtension);
};


(async () => {
    //=================================================================
    // pack source into packed.js  So its easy to be examined with eslint
    // just run eslint against packed.js
    try {
        var loadedFiles = [];
        let fileList = await getFileList("../plugin/popup.html");
        fileList = adjustedFileListForEslint(fileList);
        console.log(fileList);

        await readAllFiles(fileList, loadedFiles);
        let temp = "";
        let lineCount = 0;
        let index = "";
        for (let f of loadedFiles) {
            temp += f.text;
            let count = countLines(f.text);
            index +=  makeIndexLine(f.fileName, lineCount, count);
            lineCount += count;
        }
        fs.writeFileSync("packed.js", temp);
        fs.writeFileSync("index.csv", index);

        // pack the extensions for Chrome and firefox
        let data = await readFilePromise("../plugin/manifest.json");
        await packExtension(makeManifestForFirefox(data), ".xpi");
        await packExtension(makeManifestForChrome(data), ".zip");
    } catch (err) {
        console.log(err);
    }
})();
