
"use strict";

module("NovelfullParser");

QUnit.test("findWatermark", function (assert) {
    let dom = new DOMParser().parseFromString(NovelfullSample, "text/html");
    let parser = new NovelfullParser();
    let watermark = parser.findWatermark(dom);
    assert.equal(watermark, "n/ô/vel/b//jn dot c//om");
});

QUnit.test("tagWatermark", function (assert) {
    let dom = new DOMParser().parseFromString(NovelfullSample, "text/html");
    let parser = new NovelfullParser();
    parser.tagWatermark(dom);
    let paragraph = dom.querySelector("#watermarked");
    let span = paragraph.querySelector("span");
    assert.equal(span.innerHTML, "n/ô/vel/b//jn dot c//om");
    assert.equal(paragraph.childNodes[0].nodeValue, " Yuan found their wording quite weird, but who was he to judge their world? ");
});

let NovelfullSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Cultivation Online #Chapter 1596  Primal Expanse - Read Cultivation Online Chapter 1596  Primal Expanse Online - All Page - Novel Bin</title>
</head>

<body>

                        <div id="chr-content">
                            <div id="pf-10311-1">
                            <script>window.pubfuturetag = window.pubfuturetag || [];window.pubfuturetag.push({unit: "66b4e3c40939a022784366eb", id: "pf-10311-1"})</script></div>
                            <div></div>

                            <h3>Chapter 1596 &nbsp;Primal Expanse</h3>  <p> </p><p> After taking a moment to digest the possibility that they had been transported to another world outside the Nine Heavens, Yuan turned to look at the mysterious naked little girl and asked, "Do you mind telling us a little about the Primal Expanse?" </p><div id="pf-10364-1">
                            <script>window.pubfuturetag = window.pubfuturetag || [];window.pubfuturetag.push({unit: "66b9b2575d6f5a59dab6ff6d", id: "pf-10364-1"})</script></div><p id="watermarked"> Yuan found their wording quite weird, but who was he to judge their world? n/ô/vel/b//jn dot c//om</p><p> "Primal and Predators, right? I will remember that." </p>
                            <div id="pf-10366-1">
                            <script>window.pubfuturetag = window.pubfuturetag || [];window.pubfuturetag.push({unit: "66b9b27899ef0d23774745cd", id: "pf-10366-1"})</script></div>
                        </div>

                                <script>
                                setTimeout(function () {

                                    const paragraphss = $("p");

                                    paragraphss.each(function () {
                                        const original11Content = $(this).html();
                                        const updated11Content = original11Content.replace("n/ô/vel/b//jn dot c//om", \`<span id="span">n/ô/vel/b//jn dot c//om</span>\`);
                                        $(this).html(updated11Content);
                                    });
                                }, 600000);

                                </script>                        
</body>
</html>`
