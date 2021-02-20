
"use strict";

module("LightNovelWorldParser");

test("filterHeaders", function (assert) {
    let parser = new LightNovelWorldParser();
    assert.ok(parser.isWatermark("Visit lightnovelworld[.]com for"));
    assert.ok(parser.isWatermark("Visit //lightnovelworld[.]c/om"));
    assert.ok(parser.isWatermark(" is lightnov/elworl/d[.]com"));
    assert.notOk(parser.isWatermark("Translator:"))
});
