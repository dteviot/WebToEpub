"use strict";

module("LightNovelWorldParser");

test("filterHeaders", function (assert) {
    let parser = new LightNovelWorldParser();
    let dom = new DOMParser().parseFromString(
        "<p id='watermark' class='waffle'>aa</p><p id='none'>bb</p>", "text/html");
    assert.ok(parser.isWatermark(dom.querySelector("#watermark")));
    assert.notOk(parser.isWatermark(dom.querySelector("#none")));
});
