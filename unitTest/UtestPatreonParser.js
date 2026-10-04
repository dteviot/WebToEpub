"use strict";

module("UtestPatreonParser");

function makePatreonFlightDom(chunks) {
    let scripts = chunks.map(c => "<script>self.__next_f.push(" + JSON.stringify([1, c]) + ")</script>").join("");
    return TestUtils.makeDomWithBody(scripts);
}

QUnit.test("findPostAttributes_flightData", function (assert) {
    let contentJson = JSON.stringify({type: "doc", content: [{type: "paragraph", content: [{type: "text", text: "Oracle’s pit {}"}]}]});
    let byteCount = new TextEncoder().encode(contentJson).length.toString(16);
    let envelope = {bootstrapEnvelope: {pageBootstrap: {post: {data: {attributes: {
        title: "Chapter 6", content: null, content_json_string: "$6e"
    }}}}}};
    let dom = makePatreonFlightDom([
        "1:\"$Sreact.fragment\"\n6e:T" + byteCount + ",",
        contentJson + "16:[\"$\",\"$L6d\",null," + JSON.stringify(envelope) + "]\n"
    ]);
    let actual = PatreonParser.findPostAttributes(dom);
    assert.equal(actual.title, "Chapter 6");
    assert.equal(actual.content, null);
    assert.equal(actual.content_json_string, contentJson);
});

QUnit.test("resolveFlightReference", function (assert) {
    assert.equal(PatreonParser.resolveFlightReference("", "plain"), "plain");
    assert.equal(PatreonParser.resolveFlightReference("", "$$escaped"), "$escaped");
    assert.equal(PatreonParser.resolveFlightReference("a:T5,x😀yz", "$a"), "x😀");
    assert.equal(PatreonParser.resolveFlightReference("0:x\nb:T3,’z", "$b"), "’");
});
