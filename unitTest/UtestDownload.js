
"use strict";

module("Download");

QUnit.test("isFileNameIllegalOnWindows", function (assert) {
    assert.notOk(Download.isFileNameIllegalOnWindows("ValidName.epub"));
    assert.ok(Download.isFileNameIllegalOnWindows("InvalidName<>.epub"));
    assert.ok(Download.isFileNameIllegalOnWindows("InvalidName\".epub"));
});
