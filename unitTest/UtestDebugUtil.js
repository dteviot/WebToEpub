
"use strict";

module("DebugUtil");

QUnit.test("byteToHex", function (assert) {
    let actual = DebugUtil.byteToHex(0);
    assert.equal(actual, "00");
    actual = DebugUtil.byteToHex(1);
    assert.equal(actual, "01");
    actual = DebugUtil.byteToHex(15);
    assert.equal(actual, "0f");
    actual = DebugUtil.byteToHex(16);
    assert.equal(actual, "10");
    actual = DebugUtil.byteToHex(255);
    assert.equal(actual, "ff");
});

QUnit.test("bufToHex", function (assert) {
    let bytes = [13,10,13,10,60,33];
    let buf = new Uint8Array(bytes);
    let actual = DebugUtil.bufToHex(buf.buffer);
    assert.equal(actual, "0d0a0d0a3c21");
});
