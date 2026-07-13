"use strict";

module("MV2Compat");

test("filterHeaders", (assert) => {
    const inData = [
        { name: "Host", value: "gravitytales.com" },
        { name: "origin", value: "moz-extension://580713a4-7df3-4412-8732-17dfef5a47bd" },
        { name: "origin", value: "http://gravitytales.com" }
    ];
    const actual = MV2Compat.filterHeaders({ requestHeaders: inData });
    assert.deepEqual(actual.requestHeaders, [inData[0], inData[2]]);
});
