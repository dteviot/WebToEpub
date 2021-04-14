
"use strict";

module("LightNovelWorldParser");

test("filterHeaders", function (assert) {
    let parser = new LightNovelWorldParser();
    assert.ok(parser.isWatermark("Visit /lightn/ovelpub[.]com for"));
    assert.ok(parser.isWatermark("Visit li//gh/tnovelpub[.]c/om"));
    assert.ok(parser.isWatermark(" is lightnov/elpu/b[.]com"));
    assert.notOk(parser.isWatermark("Translator:"))
});
