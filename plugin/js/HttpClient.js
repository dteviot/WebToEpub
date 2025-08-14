/*
  Makes HTML calls using Fetch API
*/
"use strict";

class FetchErrorHandler {
    constructor() {
    }

    makeFailMessage(url, error) {
        return chrome.i18n.getMessage("htmlFetchFailed", [url, error]);
    }

    makeFailCanRetryMessage(url, error) {
        return this.makeFailMessage(url, error) + " " +
            chrome.i18n.getMessage("httpFetchCanRetry");
    }

    getCancelButtonText() {
        return chrome.i18n.getMessage("__MSG_button_error_Cancel__");
    }

    static cancelButtonText() {
        return chrome.i18n.getMessage("__MSG_button_error_Cancel__");
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
            msg = new Error(chrome.i18n.getMessage("warning403ErrorResponse", new URL(response.url).hostname) + this.makeFailCanRetryMessage(url, response.status));
        } else {
            msg = new Error(new Error(this.makeFailCanRetryMessage(url, response.status)));
        }
        let cancelLabel = this.getCancelButtonText();
        return new Promise((resolve, reject) => {
            if (wrapOptions.retry.HTTP === 403) {
                msg.openurl = response.url;
                msg.blockurl = url;
            }
            msg.retryAction = () => resolve(HttpClient.wrapFetchImpl(url, wrapOptions));
            msg.cancelAction = () => reject(failError);
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
                return {retryDelay: [1], promptUser: true, HTTP: 403};
            case 429:
                FetchErrorHandler.show429Error(response);
                return {retryDelay: retryDelay, promptUser: true};
            case 445:
            //Random Unique exception thrown on Webnovel/Qidian. Not part of w3 spec.
                return {retryDelay: retryDelay, promptUser: false};
            case 509:
            // server asked for rate limiting
                return {retryDelay: retryDelay, promptUser: true};
            case 500:
            // is fault at server, retry might clear
                return {retryDelay: retryDelay, promptUser: false};
            case 502: 
            case 503: 
            case 504:
            case 520:
            case 522:
            // intermittant fault
                return {retryDelay: retryDelay, promptUser: true};
            case 524:
            // claudflare random error
                return {retryDelay: [1], promptUser: true};
            case 999:
            // custom WebToEpub error (some api's fail and a few seconds later it is a success)
                return {retryDelay: response.retryDelay, promptUser: false};
            default:
            // it's dead Jim
                return {retryDelay: [], promptUser: false};
        }
    }

    static show429Error(response) {
        let host = new URL(response.url).hostname;
        if (!FetchErrorHandler.rateLimitedHosts.has(host)) {
            FetchErrorHandler.rateLimitedHosts.add(host);
            alert(chrome.i18n.getMessage("warning429ErrorResponse", host));
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
        return chrome.i18n.getMessage("imageFetchFailed", [url, this.parentPageUrl, error]);
    }

    getCancelButtonText() {
        return chrome.i18n.getMessage("__MSG_button_error_Skip__");
    }
}

class HttpClient {
    constructor() {
    }

    static makeOptions() {
        return { credentials: "include" };
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
        delete fetchOptions?.parser;
        let wrapOptions = {
            responseHandler: new FetchJsonResponseHandler(),
            fetchOptions: fetchOptions,
            parser: parser
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
        try
        {
            let response = await fetch(url, wrapOptions.fetchOptions);
            let ret = await HttpClient.checkResponseAndGetData(url, wrapOptions, response);
            if (wrapOptions.parser?.isCustomError(ret)) {
                let CustomErrorResponse = wrapOptions.parser.setCustomErrorResponse(url, wrapOptions, ret);
                return wrapOptions.errorHandler.onResponseError(CustomErrorResponse.url, CustomErrorResponse.wrapOptions, CustomErrorResponse.response, CustomErrorResponse.errorMessage);
            }
            return ret;
        }
        catch (error)
        {
            return wrapOptions.errorHandler.onFetchError(url, error);
        }
    }

    static checkResponseAndGetData(url, wrapOptions, response) {
        if (!response.ok) {
            return wrapOptions.errorHandler.onResponseError(url, wrapOptions, response);
        } else {
            let handler = wrapOptions.responseHandler;
            handler.setResponse(response);
            return handler.extractContentFromResponse(response);
        }
    }

    static async setDeclarativeNetRequestRules(RulesArray) {
        let url = chrome.runtime.getURL("").split("/").filter(a => a != "");
        let id = url[url.length - 1];
        for (let i = 0; i < RulesArray.length; i++) {
            //limit rule to only webtoepub domain to prevent potiential security problems
            RulesArray[i].condition.initiatorDomains = [id];
        }
        let oldRules = await chrome.declarativeNetRequest.getSessionRules();
        //In firefox i had declarativeNetRequest.getSessionRules() fail with undefined
        if (oldRules == null) {
            oldRules = [];
        }
        let oldRuleIds = oldRules.map(rule => rule.id);
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: oldRuleIds,
            addRules: RulesArray
        });
    }

    static async setPartitionCookies(url) {
        // get partitionKey in the form of https://<site name>.<tld>
        let parsedUrl = new URL(url);
        //keep old code for reference in case it changes again
        //let topLevelSite = parsedUrl.protocol + "//" + parsedUrl.hostname;

        try {
            //  get all cookie from the site which use the partitionKey (e.g. cloudflare)
            //keep old code for reference in case it changes again
            //let cookies = await chrome.cookies.getAll({partitionKey: {topLevelSite: topLevelSite}});
            
            //set domain to the highest level from the website as all subdomains are included #1447 #1445
            let urlparts = parsedUrl.hostname.split(".");
            let cookies = "";
            if (!util.isFirefox()) {
                cookies = await chrome.cookies.getAll({domain: urlparts[urlparts.length-2]+"."+urlparts[urlparts.length-1],partitionKey: {}});
            } else {
                cookies = await browser.cookies.getAll({domain: urlparts[urlparts.length-2]+"."+urlparts[urlparts.length-1],partitionKey: {}});
            }
            cookies = cookies.filter(item => item.partitionKey != undefined);
            //create new cookies for the site without the partitionKey
            //cookies without the partitionKey get sent with fetch
            cookies.forEach(element => chrome.cookies.set({
                domain: element.domain,
                url: "https://"+element.domain.substring(1),
                name: element.name, 
                value: element.value
            }));
        } catch {
            // Probably running browser that doesn't support partitionKey, e.g. Kiwi
            console.log("failed to set cookie");
        } 
    }
}

let BlockedHostNames = new Set();

class FetchResponseHandler {
    isHtml() {
        return this.contentType.startsWith("text/html");
    }

    setResponse(response) {
        this.response = response;
        this.contentType = response.headers.get("content-type");
    }

    extractContentFromResponse(response) {
        if (this.isHtml()) {
            return this.responseToHtml(response);
        } else {
            return this.responseToBinary(response);
        }
    }

    responseToHtml(response) {
        return response.arrayBuffer().then(function(rawBytes) {
            let data = this.makeTextDecoder(response).decode(rawBytes);
            let html = new DOMParser().parseFromString(data, "text/html");
            util.setBaseTag(this.response.url, html);
            this.responseXML = html;
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
            this.json =  JSON.parse(data);
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
