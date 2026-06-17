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
            msg = new Error(this.makeFailCanRetryMessage(url, response.status));
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
        return {};
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
        const normalized = util.normalizeHttpUrl(url);
        if (!normalized) {
            const raw = String(url).trim();
            throw new Error(raw
                ? `Invalid URL: ${raw}`
                : "Please enter a web page URL.");
        }
        url = normalized;

        if (BlockedHostNames.has(new URL(url).hostname)) {
            let skipurlerror = new Error("!Blocked! URL skipped because the user blocked the site");
            return wrapOptions.errorHandler.onFetchError(url, skipurlerror);
        }

        await HttpClient.setPartitionCookies(url);

        if (wrapOptions.fetchOptions == null) {
            wrapOptions.fetchOptions = HttpClient.makeOptions();
        }
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
                !(targetHostname === "ko-fi.com" && activeProxyUrl.includes("corsproxy.io"))) {
                
                try {
                    let fetchUrl = activeProxyUrl + encodeURIComponent(url.trim());
                    if (activeProxyUrl.includes("lovable.app") && wrapOptions.fetchOptions && wrapOptions.fetchOptions.headers) {
                        try {
                            fetchUrl += "&headers=" + encodeURIComponent(JSON.stringify(wrapOptions.fetchOptions.headers));
                        } catch (e) {}
                    }
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
                }
            }

            if (wrapOptions._waitedForRace) {
                console.warn("[WebToEpub] Waited for proxy race but new proxy still failed. Falling back to direct fetch:", url);
                let newOptions = Object.assign({}, wrapOptions, { bypassProxy: true });
                return HttpClient.wrapFetchImpl(url, newOptions);
            }

            if (HttpClient.proxyRacePromise) {
                try { await HttpClient.proxyRacePromise; } catch (_) {}
                let newOptions = Object.assign({}, wrapOptions, { _waitedForRace: true });
                return HttpClient.wrapFetchImpl(url, newOptions);
            }

            let raceResolvers = {};
            HttpClient.proxyRacePromise = new Promise((resolve, reject) => {
                raceResolvers.resolve = resolve;
                raceResolvers.reject = reject;
            });
            // Suppress Uncaught in promise errors if the promise is rejected when nobody is awaiting it
            HttpClient.proxyRacePromise.catch(() => {});

            // Fallback: run the discovery race with the remaining proxies
            let proxiesToTry = [];
            for (let p of HttpClient.CORS_PROXIES) {
                proxiesToTry.push(p.url);
            }

            proxiesToTry = proxiesToTry.filter(u => {
                // Specific Ko-fi blacklist for corsproxy.io
                if (targetHostname === "ko-fi.com" && u.includes("corsproxy.io")) return false;
                if (BlockedHostNames.has(new URL(u).hostname)) return false;
                return true;
            });

            const PROXY_TIMEOUT_MS = 8000;
            let controllerMap = new Map();
            let racePromises = [];

            let renderProxyUrl = proxiesToTry.find(u => u.includes("render-proxy-1-hjm6.onrender.com"));
            let raceProxies = proxiesToTry.filter(u => u !== renderProxyUrl);

            for (let proxyUrl of raceProxies) {
                const ctrl = new AbortController();
                controllerMap.set(proxyUrl, ctrl);
                let fetchUrl = proxyUrl + encodeURIComponent(url.trim());
                if (proxyUrl.includes("lovable.app") && wrapOptions.fetchOptions && wrapOptions.fetchOptions.headers) {
                    try {
                        fetchUrl += "&headers=" + encodeURIComponent(JSON.stringify(wrapOptions.fetchOptions.headers));
                    } catch (e) {}
                }
                const fetchOpts = Object.assign({}, wrapOptions.fetchOptions, {
                    credentials: "omit",
                    signal: ctrl.signal
                });

                let p = new Promise(async (resolve, reject) => {
                    const tid = setTimeout(() => {
                        ctrl.abort();
                        reject(new Error("Timeout"));
                    }, PROXY_TIMEOUT_MS);

                    try {
                        let response = await fetch(fetchUrl, fetchOpts);
                        clearTimeout(tid);
                        if (!response.ok) throw new Error(`${response.status}`);
                        let text = await response.clone().text();
                        if (HttpClient.isCloudflareBlock(text)) throw new Error("Cloudflare block page");
                        
                        resolve({ response, proxyUrl });
                    } catch (err) {
                        clearTimeout(tid);
                        reject(err);
                    }
                });
                racePromises.push(p);
            }

            try {
                if (racePromises.length === 0) throw new Error("No race proxies available");
                const { response, proxyUrl: winnerUrl } = await Promise.any(racePromises);

                // Abort losing requests
                for (const [pUrl, ctrl] of controllerMap) {
                    if (pUrl !== winnerUrl) {
                        try { ctrl.abort(); } catch (_) {}
                    }
                }

                let proxyWrapOptions = Object.assign({}, wrapOptions, {
                    isProxyAttempt: true,
                    isFinalProxyAttempt: true
                });

                let ret = await HttpClient.checkResponseAndGetData(url, proxyWrapOptions, response);

                // Body read, abort winner
                try { controllerMap.get(winnerUrl)?.abort(); } catch (_) {}

                if (proxyWrapOptions.parser?.isCustomError(ret)) {
                    let CustomErrorResponse = proxyWrapOptions.parser.setCustomErrorResponse(url, proxyWrapOptions, ret);
                    return proxyWrapOptions.errorHandler.onResponseError(
                        CustomErrorResponse.url,
                        CustomErrorResponse.wrapOptions,
                        CustomErrorResponse.response,
                        CustomErrorResponse.errorMessage
                    );
                }

                if (HttpClient.corsProxyUrl !== winnerUrl) {
                    console.log(`[WebToEpub] Switching to winning proxy: ${winnerUrl}`);
                    HttpClient.corsProxyUrl = winnerUrl;
                    HttpClient.updateCorsProxyUi();
                }

                raceResolvers.resolve();
                HttpClient.proxyRacePromise = null;

                return ret;
            } catch (aggregateErr) {
                // Main proxies failed, try Render proxy as fallback
                if (renderProxyUrl) {
                    console.warn(`[WebToEpub] All main proxies failed. Trying fallback Render proxy: ${renderProxyUrl}`);
                    try {
                        const fetchUrl = renderProxyUrl + encodeURIComponent(url.trim());
                        const fetchOpts = Object.assign({}, wrapOptions.fetchOptions, {
                            credentials: "omit"
                        });
                        let response = await fetch(fetchUrl, fetchOpts);
                        if (!response.ok) throw new Error(`${response.status}`);
                        let text = await response.clone().text();
                        if (HttpClient.isCloudflareBlock(text)) throw new Error("Cloudflare block page");

                        let proxyWrapOptions = Object.assign({}, wrapOptions, {
                            isProxyAttempt: true,
                            isFinalProxyAttempt: true
                        });
                        let ret = await HttpClient.checkResponseAndGetData(url, proxyWrapOptions, response);
                        
                        if (proxyWrapOptions.parser?.isCustomError(ret)) {
                            let CustomErrorResponse = proxyWrapOptions.parser.setCustomErrorResponse(url, proxyWrapOptions, ret);
                            return proxyWrapOptions.errorHandler.onResponseError(
                                CustomErrorResponse.url,
                                CustomErrorResponse.wrapOptions,
                                CustomErrorResponse.response,
                                CustomErrorResponse.errorMessage
                            );
                        }

                        if (HttpClient.corsProxyUrl !== renderProxyUrl) {
                            console.log(`[WebToEpub] Switching to winning proxy: ${renderProxyUrl}`);
                            HttpClient.corsProxyUrl = renderProxyUrl;
                            HttpClient.updateCorsProxyUi();
                        }
                        raceResolvers.resolve();
                        HttpClient.proxyRacePromise = null;
                        return ret;
                    } catch (renderErr) {
                        console.warn(`[WebToEpub] Fallback Render proxy also failed: ${renderErr.message}`);
                    }
                }

                raceResolvers.reject(aggregateErr);
                HttpClient.proxyRacePromise = null;

                if (wrapOptions.bypassDirectFetchFallback) {
                    return Promise.reject(new Error("Proxy error: All proxies failed."));
                }
                // AggregateError — every proxy failed or timed out
                console.warn("[WebToEpub] All proxies failed. Falling back to direct fetch:", url);
                let newOptions = Object.assign({}, wrapOptions, { bypassProxy: true });
                try {
                    return await HttpClient.wrapFetchImpl(url, newOptions);
                } catch (fallbackErr) {
                    let host = url;
                    try { host = new URL(url).hostname; } catch(e){}
                    let customMsg = `Failed to fetch from ${host}. All CORS proxies were blocked (likely by Cloudflare or Anti-Bot protection) and direct fetch failed due to CORS. Please use the WebToEpub Chrome Extension, which can bypass Cloudflare using your browser session.`;
                    return Promise.reject(new Error(customMsg));
                }
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
            if (error.message === "Cloudflare block page") {
                delete wrapOptions.bypassProxy;
                delete wrapOptions._waitedForRace;
                let fakeResponse = { url: url, status: 524 };
                return wrapOptions.errorHandler.onResponseError(url, wrapOptions, fakeResponse, error.message);
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
        let currentUrl = url;
        let changed = true;
        let iterations = 0;
        
        while (changed && iterations < 5) {
            changed = false;
            iterations++;
            
            for (let proxyUrl of proxies) {
                if (currentUrl.startsWith(proxyUrl)) {
                    let encodedUrl = currentUrl.substring(proxyUrl.length);
                    try {
                        currentUrl = decodeURIComponent(encodedUrl);
                        changed = true;
                        break;
                    } catch (e) {
                        currentUrl = encodedUrl;
                        changed = true;
                        break;
                    }
                }
            }
            
            if (changed) continue;
            
            try {
                let parsedUrl = new URL(currentUrl);
                for (let proxyUrl of proxies) {
                    let parsedProxy = new URL(proxyUrl);
                    if (parsedUrl.origin === parsedProxy.origin) {
                        let target = parsedUrl.searchParams.get("url") || parsedUrl.searchParams.get("quest");
                        if (target) {
                            currentUrl = target;
                            changed = true;
                            break;
                        }
                        
                        let searchStr = parsedUrl.search.substring(1);
                        if (searchStr.startsWith("http")) {
                            try {
                                currentUrl = decodeURIComponent(searchStr);
                                changed = true;
                                break;
                            } catch (e) {
                                currentUrl = searchStr;
                                changed = true;
                                break;
                            }
                        }
                    }
                }
            } catch (e) { }
        }
        
        // Also clean up any nested HTTP proxy inside currentUrl if it's there
        if (currentUrl.includes("93.115.101.178:11214")) {
            try {
                let parsed = new URL(currentUrl);
                let target = parsed.searchParams.get("url");
                if (target) {
                    currentUrl = target;
                }
            } catch (e) {}
        }
        
        return currentUrl;
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
                // If it's a nested/double proxy url (e.g. Vercel wrapping another url), check if origin matches either
                let parsedProxy = new URL(proxyUrl);
                if (parsedUrl.origin === parsedProxy.origin) {
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
    static isCloudflareBlock(text) {
        if (!text || text.length < 200) return false;
        let lower = text.toLowerCase();
        return lower.includes("window._cf_chl_opt") ||
            lower.includes("cf-challenge-") ||
            lower.includes("cf-browser-verification") ||
            lower.includes("id=\"cf-wrapper\"") ||
            lower.includes("error code: 522") ||
            lower.includes("error code: 1020") ||
            lower.includes("522: connection timed out") ||
            (lower.includes("cloudflare") && (
                lower.includes("<title>just a moment...</title>") ||
                lower.includes("<title>attention required") ||
                lower.includes("please complete the security check") ||
                lower.includes("checking your browser before accessing") ||
                lower.includes("enable javascript and cookies") ||
                lower.includes("connection timed out") ||
                (lower.includes("access denied") && (lower.includes("ray id") || lower.includes("error 10") || lower.includes("error 403")))
            ));
    }

    static shouldBlacklistProxy(err) {
        if (!err) return false;
        // Network failures, CORS or DNS resolution failures on the proxy domain itself
        if (err instanceof TypeError || err.name === "TypeError") return true;

        const msg = String(err.message || err).toLowerCase();
        // Do NOT blacklist on timeout, abort, or 522. 
        // A timeout or Cloudflare 522 means the TARGET site blocked the proxy or is slow.
        // It does NOT mean the proxy is dead for all other sites.
        
        // Specific HTTP status codes that represent proxy/service failure
        const statusMatch = msg.match(/status:\s*(\d+)/);
        if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            // 429: Rate limited, 502/503/504: Proxy/Gateway issues
            if (status === 429 || status === 502 || status === 503 || status === 504) {
                // DO NOT blacklist on 502/504/520+ since Cloudflare uses these for target site blocks.
                // We only blacklist if we are SURE the proxy itself is broken.
                // Actually, let's just not blacklist on any 5xx since it's almost always the target site's fault.
                if (status === 429) return true; // Proxy is rate limited globally
            }
        }
        return false;
    }
}

let BlockedHostNames = new Set();

// CORS proxy settings (website mode)
// These can be updated via the UI CORS proxy controls in popup.html
HttpClient.CORS_PROXIES = [
    { name: "allOrigins (raw)", url: "https://api.allorigins.win/raw?url=" },
    { name: "CORS.SH", url: "https://proxy.cors.sh/" },
    { name: "CodeTabs", url: "https://api.codetabs.com/v1/proxy?quest=" },
    { name: "ThingProxy", url: "https://thingproxy.freeboard.io/fetch/" },
    { name: "cors.lol", url: "https://api.cors.lol/?url=" },
    { name: "corsproxy.io (with key)", url: "https://corsproxy.io/?key=ab3170e1&url=" },
    { name: "Render Proxy", url: "https://render-proxy-1-hjm6.onrender.com/proxy?url=" },
    { name: "Alwaysdata Proxy", url: "https://prasadghanwat.alwaysdata.net/proxy?url=" },
    { name: "Lovable Proxy", url: "https://loveable-proxy-forwebtoepub.lovable.app/api/proxy?url=" }
];
HttpClient.corsProxyUrl = HttpClient.CORS_PROXIES[0].url;
HttpClient.enableCorsProxy = true;

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
            if (HttpClient.isCloudflareBlock(data)) {
                throw new Error("Cloudflare block page");
            }
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
            
            // Unproxy all absolute links returned by proxies to ensure parsers see original URLs
            for (let a of html.querySelectorAll("a")) {
                if (a.href) {
                    try {
                        a.href = HttpClient.unproxyUrl(a.href);
                    } catch (e) {
                        // ignore invalid urls
                    }
                }
            }
            for (let img of html.querySelectorAll("img")) {
                if (img.src) {
                    try {
                        img.src = HttpClient.unproxyUrl(img.src);
                    } catch (e) {
                        // ignore invalid urls
                    }
                }
            }

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
            let data = this.makeTextDecoder(response).decode(rawBytes);
            if (HttpClient.isCloudflareBlock(data)) {
                throw new Error("Cloudflare block page");
            }
            return data;
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

class FetchBinaryResponseHandler extends FetchResponseHandler {
    isHtml() {
        return false;
    }
}

class SilentFetchErrorHandler extends FetchErrorHandler {
    onFetchError(url, error) {
        return Promise.reject(error);
    }

    onResponseError(url, wrapOptions, response, errorMessage) {
        return Promise.reject(new Error(errorMessage || `HTTP ${response.status}`));
    }
}
