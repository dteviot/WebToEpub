
"use strict";

module("Firefox");

QUnit.test("Manifest 3 injects into the source tab using scripting API", async function(assert) {
    let originalRuntime = chrome.runtime;
    let originalScripting = chrome.scripting;
    chrome.runtime = {getManifest: () => ({manifest_version: 3})};
    chrome.scripting = {executeScript: async options => {
        assert.deepEqual(options, {target: {tabId: 42}, files: ["js/ContentScript.js"]});
        return [{result: "injected"}];
    }};
    try {
        assert.deepEqual(await Firefox.injectContentScript(42), [{result: "injected"}]);
    } finally {
        chrome.runtime = originalRuntime;
        chrome.scripting = originalScripting;
    }
});

QUnit.test("Manifest 2 keeps legacy injection and reports failure", async function(assert) {
    let originalRuntime = chrome.runtime;
    let originalTabs = chrome.tabs;
    chrome.runtime = {getManifest: () => ({manifest_version: 2})};
    chrome.tabs = {executeScript: (tabId, options, callback) => {
        assert.equal(tabId, 42);
        assert.deepEqual(options, {file: "js/ContentScript.js", runAt: "document_end"});
        callback(["injected"]);
    }};
    try {
        assert.deepEqual(await Firefox.injectContentScript(42), ["injected"]);
        chrome.tabs.executeScript = (tabId, options, callback) => {
            chrome.runtime.lastError = {message: "Cannot access this page"};
            callback();
        };
        try {
            await Firefox.injectContentScript(42);
            assert.ok(false, "Injection failure must reject");
        } catch (error) {
            assert.equal(error.message, "Cannot access this page");
        }
    } finally {
        chrome.runtime = originalRuntime;
        chrome.tabs = originalTabs;
    }
});

QUnit.test("Manifest 3 propagates scripting permission errors", async function(assert) {
    let originalRuntime = chrome.runtime;
    let originalScripting = chrome.scripting;
    chrome.runtime = {getManifest: () => ({manifest_version: 3})};
    chrome.scripting = {executeScript: async () => { throw new Error("Missing host permission"); }};
    try {
        try {
            await Firefox.injectContentScript(42);
            assert.ok(false, "Injection failure must reject");
        } catch (error) {
            assert.equal(error.message, "Missing host permission");
        }
    } finally {
        chrome.runtime = originalRuntime;
        chrome.scripting = originalScripting;
    }
});


test("filterHeaders", function (assert) {
    let inData = [
        {name: "Host", value: "gravitytales.com" },
        {name: "origin", value: "moz-extension://580713a4-7df3-4412-8732-17dfef5a47bd" },
        {name: "origin", value: "http://gravitytales.com" }
    ];
    let actual = Firefox.filterHeaders({requestHeaders: inData});
    assert.deepEqual(actual.requestHeaders, [inData[0], inData[2]]);
});
