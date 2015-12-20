
"use strict";

module("UtestEpubItem");

QUnit.test("tagNameToTocDepth", function (assert) {
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H1"), 0);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H2"), 1);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H3"), 2);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H4"), 3);
});
