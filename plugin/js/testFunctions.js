/*
  test stuff
*/
"use strict";
var testFunctions = (function () {

    var textToDom = function (textString) {
        return new DOMParser().parseFromString(textString, "text/html");
    }

    var testFindContent = function (html) {
        let dom = textToDom(html);
        let parser = new FimFictionParser(dom);

        let div = document.createElement("div");
        div.className = "scrollingtable";
        div.appendChild(parser.findContent(dom));
        document.getElementById("testSection").appendChild(div);
    }

    var processLoadedHtml = function(rawHtml, baseUrl, callback) {
        let dom = textToDom(rawHtml);
        util.setBaseTag(baseUrl, dom);
        callback(dom);
    }

    var simulateHtmlFetch = function (callback) {
        fileOperations.loadStartDocument("DredC1.html", function (html) { processLoadedHtml(html, "http://archiveofourown.org/works/685590/chapters/1258295", callback) });
        // fileOperations.loadStartDocument("C1.html", function (html) { processLoadedHtml(html, "http://www.fimfiction.net/story/931/1/fallout-equestria-pink-eyes/chapter-1-weatherproof", callback) });
    }

    var createFakeArchiveOfOurOwnFile = function () {
        let xhtml = util.createEmptyXhtmlDoc();
        let div = document.createElement("div");
        div.className = "chapter";
        xhtml.getElementsByTagName("body")[0].appendChild(div);
        let mainContent = document.createElement("div");
        mainContent.className = "userstuff module";
        div.appendChild(mainContent);
        return xhtml;
    }

    var fakeArchiveOfOurOwnXmlHttpResponse = function () {
        // create fake response 
        let response = {
            responseXML: createFakeArchiveOfOurOwnFile(),
            readyState: 4,
            status: 200
        };
        return response;
    }

    var dumpChapters = function(chapters) {
        console.debug("Dumping Chapters");
        chapters.forEach(function (chapter) {
            console.debug(chapter.title);
            console.debug("    " + chapter.sourceUrl);
            console.debug("    " + chapter.rawDom.children[0].outerHTML);
        });
    }

    return {
        dumpChapters: dumpChapters,
        fakeArchiveOfOurOwnXmlHttpResponse: fakeArchiveOfOurOwnXmlHttpResponse,
        simulateHtmlFetch: simulateHtmlFetch,
        testFindContent: testFindContent
    };
})();

