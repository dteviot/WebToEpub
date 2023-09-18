"use strict";

module("ChickengegeParser");

test("extractFootnotes", function (assert) {
    let dom = new DOMParser().parseFromString(ChickengegeChapterSample, "text/html");
    let parser = new ChickengegeParser();
    let actual = parser.extractFootnotes(dom);
    assert.equal(actual.length, 2);
    assert.equal(actual[0].textContent, "Iuppiter = old English form of Jupiter; raws used an ancient term for Jupiter");
    assert.equal(actual[1].textContent, "10-15 minutes");
});

let ChickengegeChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
<title>The Beginning After The End - Chapter 1 - The Light at the End of the Tunnel - WebNovelOnline</title>
<base href="https://webnovelonline.com/chapter/the_beginning_after_the_end/chapter-1" />
</head>
<body>
<p style="text-align: justify">“Don’t worry.” Chen Xing explained, “<span class="tooltipsall tooltip_post_id_custom_1444bf0d1c43826214fbd5a251167080 classtoolTipsCustomShortCodeOnlyForMultiTooltips">Iuppiter</span><script type="b7f1d86dd5bddd712eb9cb17-text/javascript">jQuery("document").ready(function(){ toolTips('.tooltip_post_id_custom_1444bf0d1c43826214fbd5a251167080',"Iuppiter = old English form of Jupiter; raws used an ancient term for Jupiter",'0'); });</script> is part of my fate. Up until now, no matter what I encounter, I’m able to avert disaster.” He then went out to search for a horse.</p>
<p style="text-align: justify">Chen Xing hung himself for approximately the time taken to drink a cup of <span class="tooltipsall tooltip_post_id_custom_8444618342de8febdd65e67c9055cc15 classtoolTipsCustomShortCodeOnlyForMultiTooltips">tea</span><script type="b7f1d86dd5bddd712eb9cb17-text/javascript">jQuery("document").ready(function(){ toolTips('.tooltip_post_id_custom_8444618342de8febdd65e67c9055cc15',"10-15 minutes",'0'); });</script>, confirmed that no one else was coming again, then quickly untied the knot and came down. He carried Xiang Shu on his shoulder and ran towards the backyard as he gasped for breath.</p>
</body>
</html>
`
