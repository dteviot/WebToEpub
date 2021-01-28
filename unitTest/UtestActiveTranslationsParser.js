
"use strict";

module("ActiveTranslationsParser");

QUnit.test("parseStyle", function (assert) {
  let dom = new DOMParser().parseFromString(ActiveTranslationsParserSamplePage, "text/html");
  let content = dom.querySelector("div.entry-content");
  let parser = new ActiveTranslationsParser()
  let rules = parser.parseStyle(content);
  assert.equal(rules.get("wf4214c10952dc478f1fb93d23f43555a").before, "“Oh, well, you really");
  assert.equal(rules.get("z164e488f661f2e907e2d1cd362e204aa").after, "out.");
});

QUnit.test("unscrambleText", function (assert) {
    let dom = new DOMParser().parseFromString(ActiveTranslationsParserSamplePage, "text/html");
    let parser = new ActiveTranslationsParser()
    let content = dom.querySelector("div.entry-content");
    parser.unscrambleText(dom, content);
    let paragraphs = [...dom.querySelectorAll("p")];
    assert.equal(paragraphs[0].textContent, "“Oh, well, you really came out.”");
    assert.equal(paragraphs[1].textContent, "There was Min Ha-Yul, who freaked him out.");
});

let ActiveTranslationsParserSamplePage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
<title>Everyone Else Is A Returnee Chapter 359</title>
<base href="https://activetranslations.xyz/eer/everyone-else-is-a-returnee-chapter-359" />
</head>
<body>
<div class="entry-content">
<p class=""><span class=" wf4214c10952dc478f1fb93d23f43555a"> came </span></p>
<p><span class=" z164e488f661f2e907e2d1cd362e204aa"> him </span></p>
<style>
.wf4214c10952dc478f1fb93d23f43555a::before {
  content: '“Oh, well, you really';
}
.wf4214c10952dc478f1fb93d23f43555a::after {
  content: 'out.”';
}
.z164e488f661f2e907e2d1cd362e204aa::before {
  content: 'There was Min Ha-Yul, who freaked';
}
.z164e488f661f2e907e2d1cd362e204aa::after {
  content: 'out.';
}
</style>
</div>
</body>
</html>
`
