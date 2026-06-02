
"use strict";

module("HttpClient");

QUnit.test("charsetFromHeaders", function (assert) {
    let evaluate = (val) => {
        let mockHeader = { get: () => val };
        return new FetchResponseHandler().charsetFromHeaders(mockHeader);
    };

    assert.equal(evaluate(null), "utf-8");
    assert.equal(evaluate("text/html"), "utf-8");
    assert.equal(evaluate("text/html; charset=utf-16"), "utf-16");
    assert.equal(evaluate("text/html; Charset=utf-17"), "utf-17");
    assert.equal(evaluate("text/html; Charset=\"utf-18\""), "utf-18");
    assert.equal(evaluate("text/html;Charset=\"utf-19\";something="), "utf-19");
    assert.equal(evaluate("text/html; Charset=utf-20 ;something="), "utf-20");
});

function createDummyFetchErrorHandler(response) {
    let handler = new FetchErrorHandler();
    handler.count = 0;
    handler.prompted = false;
    handler.retryFetch = function (url, wrapOptions) {
        ++handler.count;
        wrapOptions.retry.retryDelay.pop();
        return handler.onResponseError(url, wrapOptions, response);
    }
    handler.promptUserForRetry = function (url, wrapOptions, response, failError) {
        handler.prompted = true;
        return Promise.reject();
    }
    return { errorHandler: handler };
}

function testOnResponseError(assert, status, retries, prompted) {
    let done = assert.async();
    let response = { status: status }
    let wrapOptions = createDummyFetchErrorHandler(response);
    let handler = wrapOptions.errorHandler;
    return handler.onResponseError(null, wrapOptions, response)
        .catch(function () {
            assert.equal(handler.count, retries)
            assert.equal(handler.prompted, prompted)
            done();
        });
}

QUnit.test("onResponseError_404_error_fails_immediately", function (assert) {
    testOnResponseError(assert, 404, 0, false);
});

QUnit.test("onResponseError_500_error_retries_4_times", function (assert) {
    testOnResponseError(assert, 500, 4, false);
});

QUnit.test("onResponseError_504_error_retries_4_times", function (assert) {
    testOnResponseError(assert, 504, 4, true);
});

QUnit.test("unproxyUrl", function (assert) {
    let proxy = HttpClient.corsProxyUrl;
    let target = "https://www.novelhall.com/bizarre-realm-41105/";
    let proxied = proxy + encodeURIComponent(target);

    assert.equal(HttpClient.unproxyUrl(proxied), target, "unproxifies standard proxy URL");
    assert.equal(HttpClient.unproxyUrl(target), target, "returns original URL if not proxied");

    let altProxy = "https://corsproxy.io/?";
    let altProxied = altProxy + encodeURIComponent(target);
    assert.equal(HttpClient.unproxyUrl(altProxied), target, "unproxifies alternative proxy URL");

    let mixedProxied = "https://corsproxy.io/?url=" + encodeURIComponent(target);
    assert.equal(HttpClient.unproxyUrl(mixedProxied), target, "unproxifies mixed proxy URL");
});

QUnit.test("bypassProxy", function (assert) {
    let done = assert.async();
    let originalEnable = HttpClient.enableCorsProxy;
    HttpClient.enableCorsProxy = true;
    
    // Mock fetch to check if proxy is bypassed
    let oldFetch = window.fetch;
    window.fetch = (url) => {
        assert.notOk(url.startsWith(HttpClient.corsProxyUrl), "URL should not be proxied when bypassProxy is true");
        return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
            headers: { get: () => "image/jpeg" }
        });
    };
    
    HttpClient.wrapFetch("https://example.com/test.jpg", { bypassProxy: true })
        .then(() => {
            assert.ok(true, "Fetch completed successfully");
        })
        .catch((e) => {
            assert.ok(false, "Fetch failed: " + e.message);
        })
        .finally(() => {
            window.fetch = oldFetch;
            HttpClient.enableCorsProxy = originalEnable;
            done();
        });
});

QUnit.test("proxyFallback", function (assert) {
    let done = assert.async();
    let originalEnable = HttpClient.enableCorsProxy;
    let originalProxies = HttpClient.CORS_PROXIES;
    
    HttpClient.enableCorsProxy = true;
    HttpClient.CORS_PROXIES = [{ name: "Mock Proxy", url: "https://mockproxy.com/?url=" }];
    HttpClient.corsProxyUrl = HttpClient.CORS_PROXIES[0].url;
    
    let fetchCount = 0;
    
    let oldFetch = window.fetch;
    let oldGlobalFetch = typeof globalThis !== "undefined" ? globalThis.fetch : null;
    
    let mockFetch = (url) => {
        fetchCount++;
        if (url !== "https://example.com/image.jpg") {
            // Fail the proxied fetch
            return Promise.reject(new TypeError("Proxy down"));
        }
        // Succeed the direct fetch
        return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
            headers: { get: () => "image/jpeg" }
        });
    };
    
    window.fetch = mockFetch;
    if (typeof globalThis !== "undefined") globalThis.fetch = mockFetch;
    
    HttpClient.wrapFetch("https://example.com/image.jpg")
        .then((result) => {
            assert.equal(fetchCount, 2, "Called fetch twice (proxy then direct)");
            assert.ok(result.arrayBuffer instanceof ArrayBuffer, "Returned data from direct fetch");
        })
        .catch((e) => {
            assert.ok(false, "Fetch failed: " + e.message);
        })
        .finally(() => {
            window.fetch = oldFetch;
            if (typeof globalThis !== "undefined" && oldGlobalFetch) globalThis.fetch = oldGlobalFetch;
            HttpClient.enableCorsProxy = originalEnable;
            HttpClient.CORS_PROXIES = originalProxies;
            HttpClient.corsProxyUrl = HttpClient.CORS_PROXIES[0].url;
            done();
        });
});
