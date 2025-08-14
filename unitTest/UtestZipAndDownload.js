
"use strict";

module("ZipAndDownload");

function syncLoadTestFile() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/C1.html", false);
    xhr.send(null);
    return xhr.responseText;
}

// tests that we can build a ZIP file that's > 10 Megs in size and then download it.
QUnit.test("CanDownloadMoreThan10Megs", function (assert) {
    assert.expect(0);
    let testData = syncLoadTestFile();

    let ZipWriter = new zip.BlobWriter("application/epub+zip");
    let zipFile = new zip.ZipWriter(ZipWriter,{useWebWorkers: false,compressionMethod: 8});
    for (let i = 0; i < 50; ++i) {
        zipFile.add("test" + i + ".txt", new zip.TextReader(testData));
    };
    let blob = zipFile.close();

    // saveAs(blob, "web.epub");

    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "web.epub";
    a.click();
});
