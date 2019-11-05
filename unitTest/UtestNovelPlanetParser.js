
"use strict";

module("NovelPlanetParser");

test("extractUrlFromGoogleUserContent", function (assert) {
    // all good
    let dom = TestUtils.makeDomWithBody(
        "<img class=\"alignnone size-full wp-image-3515\" "+
        "src=\"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&no_expand=1&resize_h=0&rewriteMime=image%2F*&url=https%3a%2f%2fi0.wp.com%2f2slow2latemtl.icu%2fwp-content%2fuploads%2f2019%2f10%2fi-0002-0003_01.jpg%3fresize%3d825%252C595%26ssl%3d1\" " +
        "alt=\"i-0002-0003_01\" width=\"825\" height=\"595\" " + 
        "srcset=\"https://i0.wp.com/2slow2latemtl.icu/wp-content/uploads/2019/10/i-0002-0003_01.jpg?w=1600&amp;ssl=1 1600w, " + 
        "https://i0.wp.com/2slow2latemtl.icu/wp-content/uploads/2019/10/i-0002-0003_01.jpg?resize=300%2C216&amp;ssl=1 300w, " + 
        "https://i0.wp.com/2slow2latemtl.icu/wp-content/uploads/2019/10/i-0002-0003_01.jpg?resize=768%2C554&amp;ssl=1 768w, " + 
        "https://i0.wp.com/2slow2latemtl.icu/wp-content/uploads/2019/10/i-0002-0003_01.jpg?resize=1024%2C739&amp;ssl=1 1024w\"" +
        "sizes=\"(max-width: 825px) 100vw, 825px\" data-recalc-dims=\"1\">",
        "</div>"
    );
    let img = dom.querySelector("img");
    let actual = NovelPlanetImageCollector.extractUrlFromGoogleUserContent(img)
    assert.equal(actual, 
        "https://i0.wp.com/2slow2latemtl.icu/wp-content/uploads/2019/10/i-0002-0003_01.jpg?resize=825%2C595&ssl=1"
    );

    // wrong hostname returns null
    dom = TestUtils.makeDomWithBody("<img src=\"http://dummy.com/\">",
        "</div>"
    );    
    img = dom.querySelector("img");
    actual = NovelPlanetImageCollector.extractUrlFromGoogleUserContent(img)
    assert.equal(actual, null);

    // no url returns null
    dom = TestUtils.makeDomWithBody("<img src=\"https://images2-focus-opensocial.googleusercontent.com/gadgets/\">",
        "</div>"
    );    
    img = dom.querySelector("img");
    actual = NovelPlanetImageCollector.extractUrlFromGoogleUserContent(img)
    assert.equal(actual, null);
});

