
"use strict";

module("HttpClient");

QUnit.test("404GivesError", function (assert) {
    assert.ok(true);
    let client = new HttpClient();

    // for testing, uncomment the following lines
    client.sendRequest = function (xhr) { xhr.onload.call() };
    client.oldOnLoadHtml = client.onLoadHtml;
    client.onLoadHtml = function (url, xhr, event, onHtlmReceived) {
        xhr = testFunctions.fakeArchiveOfOurOwnXmlHttpResponse()
        xhr.status = 404;
        xhr.statusText = "File not Found";
        client.oldOnLoadHtml(url, xhr, event, onHtlmReceived);
    };

    let onErrorCalled = false;
    client.onError = function (url, statusText, event) {
        assert.equal(url, "http://loalhost/dummy.html");
        assert.equal(statusText, "File not Found");
        onErrorCalled = true;
    };

    let onChaptersLoadedCalled = false;
    client.fetchHtml(
        "http://loalhost/dummy.html", 
        function () { onChaptersLoadedCalled = true; }
    );

    assert.notOk(onChaptersLoadedCalled, "onChaptersLoaded() was called");
    assert.ok(onErrorCalled, "onError() was not called");
});
