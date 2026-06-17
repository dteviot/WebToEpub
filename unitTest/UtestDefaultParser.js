
"use strict";

module("DefaultParser");

test("removeUnwantedElementsFromContentElement", function(assert) {
    let dom = new DOMParser().parseFromString(DefaultSample1, "text/html");
    let parser = new DefaultParser();
    let body = parser.findContent(dom);
    assert.equal(body.innerHTML, dom.body.innerHTML);
    parser.removeUnwantedElementsFromContentElement(dom.body);
    assert.equal(dom.body.innerHTML.trim(), "<p>hello </p><p>world</p>");
});

test("getChapterUrls without pagination", function(assert) {
    let html = `<html>
    <head><title>TOC</title><base href="https://dummy.com/test.html" /></head>
    <body>
        <a href="https://dummy.com/chap1.html">Chapter 1</a>
        <a href="https://dummy.com/chap2.html">Chapter 2</a>
    </body>
    </html>`;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new DefaultParser();
    let done = assert.async();
    parser.getChapterUrls(dom).then(function(chapters) {
        assert.equal(chapters.length, 2);
        assert.equal(chapters[0].sourceUrl, "https://dummy.com/chap1.html");
        assert.equal(chapters[1].sourceUrl, "https://dummy.com/chap2.html");
        done();
    }).catch(function(err) {
        assert.ok(false, err);
        done();
    });
});

test("getChapterUrls with pagination and common link filtering", function(assert) {
    let originalWrapFetch = HttpClient.wrapFetch;
    let done = assert.async();
    
    let page1Html = `
    <html>
    <head><title>TOC Page 1</title><base href="https://dummy.com/toc1.html" /></head>
    <body>
        <div class="nav-header"><a href="https://dummy.com/home.html">Home</a></div>
        <div class="chapters">
            <a href="https://dummy.com/chap1.html">Chapter 1</a>
            <a href="https://dummy.com/chap2.html">Chapter 2</a>
        </div>
        <a class="next-page" href="https://dummy.com/toc2.html">Next</a>
    </body>
    </html>
    `;

    let page2Html = `
    <html>
    <head><title>TOC Page 2</title><base href="https://dummy.com/toc2.html" /></head>
    <body>
        <div class="nav-header"><a href="https://dummy.com/home.html">Home</a></div>
        <div class="chapters">
            <a href="https://dummy.com/chap3.html">Chapter 3</a>
            <a href="https://dummy.com/chap4.html">Chapter 4</a>
        </div>
        <a class="next-page" href="https://dummy.com/toc3.html">Next</a>
    </body>
    </html>
    `;

    let page3Html = `
    <html>
    <head><title>TOC Page 3</title><base href="https://dummy.com/toc3.html" /></head>
    <body>
        <div class="nav-header"><a href="https://dummy.com/home.html">Home</a></div>
        <div class="chapters">
            <a href="https://dummy.com/chap5.html">Chapter 5</a>
        </div>
    </body>
    </html>
    `;

    HttpClient.wrapFetch = function(url) {
        let html;
        if (url === "https://dummy.com/toc2.html" || url === "/toc2.html") {
            html = page2Html;
        } else if (url === "https://dummy.com/toc3.html" || url === "/toc3.html") {
            html = page3Html;
        } else {
            return Promise.reject("Invalid URL requested in test: " + url);
        }
        let responseDom = new DOMParser().parseFromString(html, "text/html");
        return Promise.resolve({
            responseXML: responseDom,
            responseText: html
        });
    };

    let parser = new DefaultParser();
    parser.siteConfigs.saveSiteConfig("dummy.com", "body", "h1", "", "", ".next-page");

    let dom1 = new DOMParser().parseFromString(page1Html, "text/html");
    parser.getChapterUrls(dom1).then(function(chapters) {
        HttpClient.wrapFetch = originalWrapFetch; // Restore

        let urls = chapters.map(c => c.sourceUrl);
        assert.ok(urls.includes("https://dummy.com/chap1.html"), "Should include chap 1");
        assert.ok(urls.includes("https://dummy.com/chap2.html"), "Should include chap 2");
        assert.ok(urls.includes("https://dummy.com/chap3.html"), "Should include chap 3");
        assert.ok(urls.includes("https://dummy.com/chap4.html"), "Should include chap 4");
        assert.ok(urls.includes("https://dummy.com/chap5.html"), "Should include chap 5");
        assert.notOk(urls.includes("https://dummy.com/home.html"), "Common link 'Home' should be filtered out");
        done();
    }).catch(function(err) {
        HttpClient.wrapFetch = originalWrapFetch;
        assert.ok(false, "Error: " + err);
        done();
    });
});

let DefaultSample1 =
`<html>
<head><title></title><base href="https://dummy.com/test.html" /></head>
<body><p>hello </p><o:p></o:p><p>world</p></body>
</html>
`;
