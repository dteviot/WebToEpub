/*
  Makes HTML calls using Fetch API
*/
"use strict";

class FetchErrorHandler {
    constructor() {
    }

    makeFailMessage(url, error) {
        return UIText.Error.htmlFetchFailed(url, error);
    }

    makeFailCanRetryMessage(url, error) {
        return this.makeFailMessage(url, error) + " " +
            UIText.Warning.httpFetchCanRetry;
    }

    getCancelButtonText() {
        return UIText.Common.cancel;
    }

    static cancelButtonText() {
        return UIText.Common.cancel;
    }

    onFetchError(url, error) {
        return Promise.reject(new Error(this.makeFailMessage(url, error.message)));
    }

    onResponseError(url, wrapOptions, response, errorMessage) {
        let failError;
        if (errorMessage) {
            failError = new Error(errorMessage);
        } else {
            failError = new Error(this.makeFailMessage(response.url, response.status));
        }

        // If this is a proxy attempt and NOT the final one, or if we want to skip retries,
        // then just reject so the loop can move on.
        if (wrapOptions.isProxyAttempt && !wrapOptions.isFinalProxyAttempt) {
            return Promise.reject(failError);
        }

        let retry = FetchErrorHandler.getAutomaticRetryBehaviourForStatus(response);
        if (retry.retryDelay.length === 0) {
            return Promise.reject(failError);
        }

        if (wrapOptions.retry === undefined) {
            wrapOptions.retry = retry;
            return this.retryFetch(url, wrapOptions);
        }

        if (0 < wrapOptions.retry.retryDelay.length) {
            return this.retryFetch(url, wrapOptions);
        }

        if (wrapOptions.retry.promptUser) {
            return this.promptUserForRetry(url, wrapOptions, response, failError);
        } else {
            return Promise.reject(failError);
        }
    }

    promptUserForRetry(url, wrapOptions, response, failError) {
        let msg;
        if (wrapOptions.retry.HTTP === 403) {
            msg = new Error(UIText.Warning.warning403ErrorResponse(new URL(response.url).hostname) + this.makeFailCanRetryMessage(url, response.status));
        } else {
            msg = new Error(new Error(this.makeFailCanRetryMessage(url, response.status)));
        }
        let cancelLabel = this.getCancelButtonText();
        return new Promise((resolve, reject) => {
            if (wrapOptions.retry.HTTP === 403) {
                // If the error URL is a proxy URL, then we should block the proxy, not the target site
                let errorUrl = response.url;
                if (HttpClient.isProxyUrl(errorUrl)) {
                    msg.blockurl = errorUrl;
                } else {
                    msg.blockurl = url;
                }
                msg.openurl = errorUrl;
            }
            msg.retryAction = () => resolve(HttpClient.wrapFetchImpl(url, wrapOptions));
            msg.cancelAction = () => {
                failError.isUserCancel = true;
                reject(failError);
            };
            msg.cancelLabel = cancelLabel;
            ErrorLog.showErrorMessage(msg);
        });
    }

    async retryFetch(url, wrapOptions) {
        let delayBeforeRetry = wrapOptions.retry.retryDelay.pop() * 1000;
        await util.sleep(delayBeforeRetry);
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static getAutomaticRetryBehaviourForStatus(response) {
        // seconds to wait before each retry (note: order is reversed)
        let retryDelay = [120, 60, 30, 15];
        switch (response.status) {
            case 403:
                return { retryDelay: [1], promptUser: true, HTTP: 403 };
            case 429:
                FetchErrorHandler.show429Error(response);
                return { retryDelay: retryDelay, promptUser: true };
            case 445:
                //Random Unique exception thrown on Webnovel/Qidian. Not part of w3 spec.
                return { retryDelay: retryDelay, promptUser: false };
            case 509:
                // server asked for rate limiting
                return { retryDelay: retryDelay, promptUser: true };
            case 500:
                // is fault at server, retry might clear
                return { retryDelay: retryDelay, promptUser: false };
            case 502:
            case 503:
            case 504:
            case 520:
            case 522:
                // intermittant fault
                return { retryDelay: retryDelay, promptUser: true };
            case 524:
                // claudflare random error
                return { retryDelay: [1], promptUser: true };
            case 999:
                // custom WebToEpub error (some api's fail and a few seconds later it is a success)
                return { retryDelay: response.retryDelay, promptUser: false };
            default:
                // it's dead Jim
                return { retryDelay: [], promptUser: false };
        }
    }

    static show429Error(response) {
        let host = new URL(response.url).hostname;
        if (!FetchErrorHandler.rateLimitedHosts.has(host)) {
            FetchErrorHandler.rateLimitedHosts.add(host);
            alert(UIText.Warning.warning429ErrorResponse(host));
        }
    }
}
FetchErrorHandler.rateLimitedHosts = new Set();

class FetchImageErrorHandler extends FetchErrorHandler { // eslint-disable-line no-unused-vars
    constructor(parentPageUrl) {
        super();
        this.parentPageUrl = parentPageUrl;
    }

    makeFailMessage(url, error) {
        return UIText.Error.imageFetchFailed(url, this.parentPageUrl, error);
    }

    getCancelButtonText() {
        return UIText.Common.skip;
    }
}

class HttpClient {
    constructor() {
    }

    static makeOptions() {
        return { credentials: "include" };
    }

    /**
     * Optional session cookies for wtr-lab.com (paste Netscape export or "Cookie:" header in Advanced options).
     * Sent on requests to wtr-lab.com and *.wtr-lab.com. Public CORS proxies may still strip headers.
     */
    static setWtrLabCookiesFromUserInput(raw) {
        HttpClient.wtrLabCookieHeader = HttpClient.parseNetscapeOrCookieHeader(raw || "");
    }

    static parseNetscapeOrCookieHeader(text) {
        text = (text || "").trim();
        if (!text) {
            return "";
        }
        if (text.includes("\t")) {
            let parts = [];
            for (let rawLine of text.split(/\r?\n/)) {
                let line = rawLine.trim();
                if (!line) {
                    continue;
                }
                if (line.startsWith("#HttpOnly_")) {
                    line = line.replace(/^#HttpOnly_/, "");
                } else if (line.startsWith("#")) {
                    continue;
                }
                let cols = line.split("\t");
                if (cols.length >= 7) {
                    let name = cols[5];
                    let value = cols.slice(6).join("\t");
                    if (name) {
                        parts.push(name + "=" + value);
                    }
                }
            }
            if (parts.length > 0) {
                return parts.join("; ");
            }
        }
        if (/^cookie\s*:/i.test(text)) {
            text = text.replace(/^cookie\s*:/i, "").trim();
        }
        return text.replace(/\s*;\s*/g, "; ").trim();
    }

    static applyWtrLabCookieHeaderIfNeeded(fetchOptions, targetUrl) {
        let cookie = HttpClient.wtrLabCookieHeader;
        if (!cookie || !String(cookie).trim()) {
            return;
        }
        let host = "";
        try {
            host = new URL(targetUrl).hostname;
        } catch (e) {
            return;
        }
        if (host !== "wtr-lab.com" && !host.endsWith(".wtr-lab.com")) {
            return;
        }
        if (!fetchOptions.headers) {
            fetchOptions.headers = { Cookie: cookie };
            return;
        }
        if (typeof fetchOptions.headers.set === "function") {
            fetchOptions.headers.set("Cookie", cookie);
            return;
        }
        fetchOptions.headers = Object.assign({}, fetchOptions.headers, { Cookie: cookie });
    }

    static wrapFetch(url, wrapOptions) {
        if (wrapOptions == null) {
            wrapOptions = {
                errorHandler: new FetchErrorHandler()
            };
        }
        if (wrapOptions.errorHandler == null) {
            wrapOptions.errorHandler = new FetchErrorHandler();
        }
        wrapOptions.responseHandler = new FetchResponseHandler();
        if (wrapOptions.makeTextDecoder != null) {
            wrapOptions.responseHandler.makeTextDecoder = wrapOptions.makeTextDecoder;
        }
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static fetchHtml(url) {
        let wrapOptions = {
            responseHandler: new FetchHtmlResponseHandler()
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static fetchJson(url, fetchOptions) {
        let parser = fetchOptions?.parser;
        let bypassProxy = fetchOptions?.bypassProxy;
        delete fetchOptions?.parser;
        delete fetchOptions?.bypassProxy;
        let wrapOptions = {
            responseHandler: new FetchJsonResponseHandler(),
            fetchOptions: fetchOptions,
            parser: parser,
            bypassProxy: bypassProxy
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static fetchText(url) {
        let wrapOptions = {
            responseHandler: new FetchTextResponseHandler(),
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static async wrapFetchImpl(url, wrapOptions) {
        if (url == null) {
            throw new Error("URL is null or undefined");
        }
        url = String(url).trim();

        if (BlockedHostNames.has(new URL(url).hostname)) {
            let skipurlerror = new Error("!Blocked! URL skipped because the user blocked the site");
            return wrapOptions.errorHandler.onFetchError(url, skipurlerror);
        }

        await HttpClient.setPartitionCookies(url);

        if (wrapOptions.fetchOptions == null) {
            wrapOptions.fetchOptions = HttpClient.makeOptions();
        }
        HttpClient.applyWtrLabCookieHeaderIfNeeded(wrapOptions.fetchOptions, url);

        if (wrapOptions.errorHandler == null) {
            wrapOptions.errorHandler = new FetchErrorHandler();
        }

        let useProxy = (HttpClient.enableCorsProxy && !wrapOptions.bypassProxy);

        if (useProxy) {
            let activeProxyUrl = HttpClient.corsProxyUrl;
            const targetHostname = new URL(url).hostname;

            // Try active proxy first
            if (activeProxyUrl && 
                !BlockedHostNames.has(new URL(activeProxyUrl).hostname) && 
                !HttpClient.BLACKLISTED_PROXIES.has(activeProxyUrl) &&
                !(targetHostname === "ko-fi.com" && activeProxyUrl.includes("corsproxy.io"))) {
                
                try {
                    const fetchUrl = activeProxyUrl + encodeURIComponent(url.trim());
                    const ctrl = new AbortController();
                    const tid = setTimeout(() => ctrl.abort(), 6000); // Snappy 6s timeout for active proxy
                    const fetchOpts = Object.assign({}, wrapOptions.fetchOptions, {
                        credentials: "omit",
                        signal: ctrl.signal
                    });
                    
                    let response = await fetch(fetchUrl, fetchOpts);
                    clearTimeout(tid);
                    
                    if (response.ok) {
                        let proxyWrapOptions = Object.assign({}, wrapOptions, {
                            isProxyAttempt: true,
                            isFinalProxyAttempt: true
                        });
                        
                        let ret = await HttpClient.checkResponseAndGetData(url, proxyWrapOptions, response);
                        
                        try { ctrl.abort(); } catch (_) {}
                        
                        if (!proxyWrapOptions.parser?.isCustomError(ret)) {
                            return ret;
                        }
                    } else {
                        throw new Error(`status: ${response.status}`);
                    }
                } catch (err) {
                    console.warn(`[WebToEpub] Active proxy ${activeProxyUrl} failed or timed out: ${err.message}. Fallback to discovery race.`);
                    if (HttpClient.shouldBlacklistProxy(err)) {
                        HttpClient.BLACKLISTED_PROXIES.add(activeProxyUrl);
                    }
                }
            }

            // Fallback: run the discovery race with the remaining proxies
            let proxiesToTry = [];
            for (let p of HttpClient.CORS_PROXIES) {
                proxiesToTry.push(p.url);
            }

            // Filter out blacklisted proxies for this attempt
            proxiesToTry = proxiesToTry.filter(u => {
                if (HttpClient.BLACKLISTED_PROXIES.has(u)) return false;
                // Specific Ko-fi blacklist for corsproxy.io
                if (targetHostname === "ko-fi.com" && u.includes("corsproxy.io")) return false;
                return true;
            });

            // If everything is blacklisted, clear and try again
            if (proxiesToTry.length === 0) {
                HttpClient.BLACKLISTED_PROXIES.clear();
                proxiesToTry = HttpClient.CORS_PROXIES.map(p => p.url);
            }

            // ── Race all proxies simultaneously ─────────────────────────────
            // Launch all proxies at once and use whichever responds first.
            // Reduces worst-case wait from (N × timeout) to just one timeout.
            const PROXY_TIMEOUT_MS = 8000;

            // Map proxyUrl → AbortController so we can abort ONLY the losers.
            // CRITICAL: never abort the winner's controller — doing so cancels the
            // response body stream and causes arrayBuffer() to throw an AbortError.
            const controllerMap = new Map();

            const racePromises = proxiesToTry.map((proxyUrl) => {
                if (BlockedHostNames.has(new URL(proxyUrl).hostname)) {
                    return Promise.reject(new Error(`blocked: ${proxyUrl}`));
                }
                const ctrl = new AbortController();
                controllerMap.set(proxyUrl, ctrl);
                const tid = setTimeout(() => ctrl.abort(), PROXY_TIMEOUT_MS);
                const fetchUrl = proxyUrl + encodeURIComponent(url.trim());
                const fetchOpts = Object.assign({}, wrapOptions.fetchOptions, {
                    credentials: "omit",
                    signal: ctrl.signal
                });
                return fetch(fetchUrl, fetchOpts)
                    .then(response => {
                        clearTimeout(tid);
                        if (!response.ok) throw new Error(`${response.status}`);
                        return { response, proxyUrl };
                    })
                    .catch(err => { clearTimeout(tid); throw err; });
            });

            let winnerUrl = null;
            try {
                const { response, proxyUrl } = await Promise.any(racePromises);
                winnerUrl = proxyUrl;

                // Abort LOSING requests only — the winner's controller must stay alive
                // until we finish reading the response body below.
                for (const [pUrl, ctrl] of controllerMap) {
                    if (pUrl !== winnerUrl) {
                        try { ctrl.abort(); } catch (_) { /* ignore */ }
                    }
                }

                let proxyWrapOptions = Object.assign({}, wrapOptions, {
                    isProxyAttempt: true,
                    isFinalProxyAttempt: true
                });

                let ret = await HttpClient.checkResponseAndGetData(url, proxyWrapOptions, response);

                // Response body fully read — safe to abort winner's controller now
                try { controllerMap.get(winnerUrl)?.abort(); } catch (_) { /* ignore */ }

                if (proxyWrapOptions.parser?.isCustomError(ret)) {
                    let CustomErrorResponse = proxyWrapOptions.parser.setCustomErrorResponse(url, proxyWrapOptions, ret);
                    return proxyWrapOptions.errorHandler.onResponseError(
                        CustomErrorResponse.url,
                        CustomErrorResponse.wrapOptions,
                        CustomErrorResponse.response,
                        CustomErrorResponse.errorMessage
                    );
                }

                // Stick to the winning proxy for future requests
                if (HttpClient.corsProxyUrl !== winnerUrl) {
                    console.log(`[WebToEpub] Switching to winning proxy: ${winnerUrl}`);
                    HttpClient.corsProxyUrl = winnerUrl;
                    HttpClient.updateCorsProxyUi();
                }

                return ret;

            } catch (aggErr) {
                if (winnerUrl && HttpClient.shouldBlacklistProxy(aggErr)) {
                    console.warn(`[WebToEpub] Winning proxy ${winnerUrl} failed during data retrieval, blacklisting it.`);
                    HttpClient.BLACKLISTED_PROXIES.add(winnerUrl);
                }
                if (wrapOptions.bypassDirectFetchFallback) {
                    let errMsgs = [];
                    if (aggErr && aggErr.errors) {
                        errMsgs = aggErr.errors.map(e => e.message || String(e));
                    } else {
                        errMsgs = [aggErr.message || String(aggErr)];
                    }
                    const uniqueErrors = Array.from(new Set(errMsgs));
                    return Promise.reject(new Error(`Proxy error: ${uniqueErrors.join(", ")}`));
                }
                // AggregateError — every proxy failed or timed out
                console.warn("[WebToEpub] All proxies failed. Falling back to direct fetch:", url);
                let newOptions = Object.assign({}, wrapOptions, { bypassProxy: true });
                return HttpClient.wrapFetchImpl(url, newOptions);
            }
        }

        try {

            let response = await fetch(url, wrapOptions.fetchOptions);

            let ret = await HttpClient.checkResponseAndGetData(url, wrapOptions, response);

            if (wrapOptions.parser?.isCustomError(ret)) {

                let CustomErrorResponse = wrapOptions.parser.setCustomErrorResponse(url, wrapOptions, ret);

                return wrapOptions.errorHandler.onResponseError(
                    CustomErrorResponse.url,
                    CustomErrorResponse.wrapOptions,
                    CustomErrorResponse.response,
                    CustomErrorResponse.errorMessage
                );
            }

            return ret;

        } catch (error) {

            if (!HttpClient.enableCorsProxy && error instanceof TypeError) {

                console.warn("[WebToEpub] Direct fetch failed (CORS). Switching to proxy:", url);

                HttpClient.enableCorsProxy = true;

                HttpClient.updateCorsProxyUi();

                return HttpClient.wrapFetchImpl(url, wrapOptions);
            }

            return wrapOptions.errorHandler.onFetchError(url, error);
        }
    }

    /** Update CORS proxy UI controls to reflect current state */
    static updateCorsProxyUi() {
        try {
            let checkbox = document.getElementById("enableCorsProxyCheckbox");
            if (checkbox) checkbox.checked = HttpClient.enableCorsProxy;

            let input = document.getElementById("corsProxyInput");
            if (input) input.value = HttpClient.corsProxyUrl;

            let select = document.getElementById("corsProxySelect");
            if (select) {
                let matching = HttpClient.CORS_PROXIES.find(p => p.url === HttpClient.corsProxyUrl);
                select.value = matching ? matching.url : "custom";
                if (input) input.style.display = matching ? "none" : "block";
            }
        } catch (e) { /* ignore if DOM not available */ }
    }

    static checkResponseAndGetData(url, wrapOptions, response) {
        if (!response.ok) {
            return wrapOptions.errorHandler.onResponseError(url, wrapOptions, response);
        } else {
            let handler = wrapOptions.responseHandler;
            handler.setResponse(response, url);
            return handler.extractContentFromResponse(response);
        }
    }

    /**
     * Extracts the original URL from a potentially proxied URL
     * @param {string} url The URL to unproxy
     * @returns {string} The original URL
     */
    static unproxyUrl(url) {
        let proxies = HttpClient.CORS_PROXIES.map(p => p.url).concat([HttpClient.corsProxyUrl]);
        for (let proxyUrl of proxies) {
            if (url.startsWith(proxyUrl)) {
                let encodedUrl = url.substring(proxyUrl.length);
                try {
                    return decodeURIComponent(encodedUrl);
                } catch (e) {
                    return encodedUrl;
                }
            }
        }
        // Fallback: check if the URL origin matches any proxy origin
        // This handles cases where the proxy redirects or changes paths
        try {
            let parsedUrl = new URL(url);
            for (let proxyUrl of proxies) {
                let parsedProxy = new URL(proxyUrl);
                if (parsedUrl.origin === parsedProxy.origin) {
                    // Try to find target URL in search params
                    let target = parsedUrl.searchParams.get("url") || parsedUrl.searchParams.get("quest");
                    if (target) return target;
                    
                    // Handle proxies where URL is just the query string (e.g., corsproxy.io/?https://...)
                    let searchStr = parsedUrl.search.substring(1);
                    if (searchStr.startsWith("http")) {
                        try {
                            return decodeURIComponent(searchStr);
                        } catch (e) {
                            return searchStr;
                        }
                    }
                }
            }
        } catch (e) { }
        return url;
    }

    /**
     * Checks if a URL is a proxy URL based on origin matching
     * @param {string} url The URL to check
     * @returns {boolean} True if the URL is a proxy URL
     */
    static isProxyUrl(url) {
        try {
            let parsedUrl = new URL(url);
            let proxies = HttpClient.CORS_PROXIES.map(p => p.url).concat([HttpClient.corsProxyUrl]);
            for (let proxyUrl of proxies) {
                if (parsedUrl.origin === new URL(proxyUrl).origin) {
                    return true;
                }
            }
        } catch (e) { }
        return false;
    }

    static async setDeclarativeNetRequestRules(RulesArray) {
        // No-op in website mode (declarativeNetRequest is extension-only)
        // In extension mode, gracefully skip if chrome.declarativeNetRequest is unavailable
        try {
            if (typeof chrome === "undefined" || !chrome.declarativeNetRequest?.updateSessionRules) return;
            let url = chrome.runtime.getURL("").split("/").filter(a => a != "");
            let id = url[url.length - 1];
            for (let i = 0; i < RulesArray.length; i++) {
                RulesArray[i].condition.initiatorDomains = [id];
            }
            let oldRules = await chrome.declarativeNetRequest.getSessionRules();
            if (oldRules == null) { oldRules = []; }
            let oldRuleIds = oldRules.map(rule => rule.id);
            await chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: oldRuleIds,
                addRules: RulesArray
            });
        } catch (e) {
            console.log("setDeclarativeNetRequestRules skipped:", e.message);
        }
    }

    static async setPartitionCookies(url) {
        // In website mode (CORS proxy active) cookie injection is not possible or needed.
        if (HttpClient.enableCorsProxy) return;
        // Extension mode: attempt partitioned cookie injection
        try {
            let parsedUrl = new URL(url);
            let urlparts = parsedUrl.hostname.split(".");
            let domain = urlparts[urlparts.length - 2] + "." + urlparts[urlparts.length - 1];
            let cookieApi = (typeof browser !== "undefined" && util.isFirefox()) ? browser.cookies : chrome.cookies;
            let cookies = await cookieApi.getAll({ domain: domain, partitionKey: {} });
            cookies = (cookies || []).filter(item => item.partitionKey != undefined);
            cookies.forEach(element => chrome.cookies.set({
                domain: element.domain,
                url: "https://" + element.domain.substring(1),
                name: element.name,
                value: element.value
            }));
        } catch {
            // Browsers without partitionKey support (e.g. Kiwi, website mode)
            // silently skip
        }
    }

    static getProxiedUrl(url) {
        if (!url) return "";
        if (!HttpClient.enableCorsProxy || !HttpClient.corsProxyUrl) return url;
        return HttpClient.corsProxyUrl + encodeURIComponent(url.trim());
    }

    /**
     * Determines if a proxy error indicates the proxy itself is down (vs target site issue)
     * @param {Error|any} err The error to analyze
     * @returns {boolean} True if the proxy should be blacklisted
     */
    static shouldBlacklistProxy(err) {
        if (!err) return false;
        // Network failures, CORS or DNS resolution failures on the proxy domain itself
        if (err instanceof TypeError || err.name === "TypeError") return true;
        // Timeout or Abort errors on the proxy request itself
        const msg = String(err.message || err).toLowerCase();
        if (msg.includes("timeout") || msg.includes("abort") || err.name === "AbortError") return true;
        // Specific HTTP status codes that represent proxy/service failure
        const statusMatch = msg.match(/status:\s*(\d+)/);
        if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            // 429: Rate limited, 502/503/504: Proxy/Gateway issues, 520+: Cloudflare server errors
            if (status === 429 || status === 502 || status === 503 || status === 504 || status >= 520) {
                return true;
            }
        }
        return false;
    }
}

let BlockedHostNames = new Set();

// CORS proxy settings (website mode)
// These can be updated via the UI CORS proxy controls in popup.html
HttpClient.CORS_PROXIES = [
    { name: "Tufive Workers Proxy", url: "https://fragrant-frost-f292.tufive.workers.dev/?url=" },
    { name: "Workers Proxy", url: "https://nexuspage-extractor.prasadghanwat123.workers.dev/?url=" },
    { name: "Nexuspage Proxy", url: "https://nexuspage-extractor.vercel.app/?url=" },
    { name: "AllOrigins (Raw)", url: "https://api.allorigins.win/raw?url=" },
    { name: "CodeTabs Proxy", url: "https://api.codetabs.com/v1/proxy/?quest=" }
];
HttpClient.BLACKLISTED_PROXIES = new Set();
HttpClient.corsProxyUrl = HttpClient.CORS_PROXIES[0].url;
HttpClient.enableCorsProxy = true;
HttpClient.wtrLabCookieHeader = "";

class FetchResponseHandler {
    isHtml() {
        // Guard against null — response.headers.get("content-type") returns null
        // when the CORS proxy doesn't forward the header.
        if (!this.contentType) return true; // default to HTML (all fetches here are web pages)
        let type = this.contentType.split(";")[0].trim().toLowerCase();
        // Some CORS proxies (corsproxy.io, CORS.lol) return text/plain for HTML content
        return type === "text/html" || type === "text/plain";
    }

    setResponse(response, originalUrl = null) {
        this.response = response;
        this.contentType = response.headers.get("content-type");
        // Store the TRUE target URL so responseToHtml never has to reverse-engineer
        // the proxy prefix from response.url (which changes when proxies redirect).
        this.originalUrl = originalUrl || HttpClient.unproxyUrl(response.url);
    }

    extractContentFromResponse(response) {
        // Default to HTML when content-type is absent or looks like text —
        // this tool almost exclusively fetches web pages.
        if (this.isHtml()) {
            return this.responseToHtml(response);
        } else {
            return this.responseToBinary(response);
        }
    }

    responseToHtml(response) {
        return response.arrayBuffer().then(function(rawBytes) {
            let data = this.makeTextDecoder(response).decode(rawBytes);
            // Strip speculative preload tags to prevent relative asset fetches through proxies
            data = data.replace(/<link\s+[^>]*?rel=["']preload["'][^>]*?>/gi, "");
            let html = new DOMParser().parseFromString(data, "text/html");
            // Redefine baseURI to return the original unproxied target URL (crucial for custom parsers in client mode)
            try {
                Object.defineProperty(html, "baseURI", {
                    get: () => this.originalUrl,
                    configurable: true
                });
            } catch (err) {
                console.warn("baseURI redefinition failed: ", err);
            }
            // Use the original target URL stored in setResponse — this is reliable
            // even when a proxy performs a server-side redirect that mutates response.url.
            util.setBaseTag(this.originalUrl, html);
            this.responseXML = html;
            this.responseText = data;
            return this;
        }.bind(this));
    }

    responseToBinary(response) {
        return response.arrayBuffer().then(function(data) {
            this.arrayBuffer = data;
            return this;
        }.bind(this));
    }

    responseToText(response) {
        return response.arrayBuffer().then(function(rawBytes) {
            return this.makeTextDecoder(response).decode(rawBytes);
        }.bind(this));
    }

    responseToJson(response) {
        return response.text().then(function(data) {
            this.json = JSON.parse(data);
            return this;
        }.bind(this));
    }

    makeTextDecoder(response) {
        let utflabel = this.charsetFromHeaders(response.headers);
        return new TextDecoder(utflabel);
    }

    charsetFromHeaders(headers) {
        let contentType = headers.get("Content-Type");
        if (!util.isNullOrEmpty(contentType)) {
            let pieces = contentType.toLowerCase().split("charset=");
            if (2 <= pieces.length) {
                return pieces[1].split(";")[0].replace(/"/g, "").trim();
            }
        }
        return FetchResponseHandler.DEFAULT_CHARSET;
    }
}
FetchResponseHandler.DEFAULT_CHARSET = "utf-8";

class FetchJsonResponseHandler extends FetchResponseHandler {
    constructor() {
        super();
    }

    extractContentFromResponse(response) {
        return super.responseToJson(response);
    }
}

class FetchTextResponseHandler extends FetchResponseHandler {
    constructor() {
        super();
    }

    extractContentFromResponse(response) {
        return super.responseToText(response);
    }
}

class FetchHtmlResponseHandler extends FetchResponseHandler {
    constructor() {
        super();
    }

    extractContentFromResponse(response) {
        return super.responseToHtml(response);
    }
}
