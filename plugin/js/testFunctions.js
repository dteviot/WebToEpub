/*
  test stuff
*/
"use strict";
var testFunctions = (function () {

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

    return {
        fakeArchiveOfOurOwnXmlHttpResponse: fakeArchiveOfOurOwnXmlHttpResponse
    };
})();

