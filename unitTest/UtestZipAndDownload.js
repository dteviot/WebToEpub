
"use strict";

module("ZipAndDownload");

function syncLoadTestFile() {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/C1.html", false);
    xhr.send(null);
    return xhr.responseText;
}

// tests that we can build a ZIP file that's > 10 Megs in size and then download it.
QUnit.test("CanDownloadMoreThan10Megs", function (assert) {
    assert.expect(0);
    let testData = syncLoadTestFile();

    let zipFile = new JSZip();
    for (let i = 0; i < 50; ++i) {
        zipFile.file("test" + i + ".txt", testData);
    };
    let blob = zipFile.generate({ type: "blob" });

    // saveAs(blob, "web.epub");

    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "web.epub";
    a.click();
});
