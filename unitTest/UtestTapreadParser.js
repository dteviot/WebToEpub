
"use strict";

module("TapreadParser");

QUnit.test("jsonToHtml", function (assert) {
    let dom = TapreadParser.jsonToHtml(TapreadSampleChapterJson);
    let content = Parser.findConstrutedContent(dom);
    assert.equal(content.innerHTML, "<h1>Chapter 1-Marry Me</h1><p>\"Dear, marry me!\"  </p><p>Fastening his buttons, </p>");
});

let TapreadSampleChapterJson =
{
    "code":200,
    "msg":"success",
    "message":"success",
    "result":{
        "chapterNo":1,
        "price_unit":0,
        "level":0,
        "chapterId":770,
        "chapterName":"Chapter 1-Marry Me",
        "nextChapterId":790,
        "type":0,
        "content":"<p>&quot;Dear, marry me!&quot;  </p><p>Fastening his buttons, </p>",
        "bookId":76,
        "preChapterId":0
    }
}
