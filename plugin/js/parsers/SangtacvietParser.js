"use strict";

parserFactory.register("sangtacviet.com", () => new SangtacvietParser());
parserFactory.register("sangtacviet.vip", () => new SangtacvietParser());

class SangtacvietParser extends Parser{
    constructor() {
        super();
        this.minimumThrottle = 9000;
    }

    async getChapterUrls(dom) {
        let hostname = new URL(dom.baseURI).hostname;
        let rule = 
        [{
            "id": 1,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [{ "header": "referer", "operation": "set", "value": "https://"+hostname}]
            },
            "condition": { "urlFilter" : hostname}
        }]
        await HttpClient.setDeclarativeNetRequestRules(rule);
        let leaves = dom.baseURI.split("/").filter(a => a != "");
        let id = leaves[leaves.length - 1];
        let provider = leaves[leaves.length - 3];

        let fetchUrl = "https://"+hostname+"/index.php?ngmar=chapterlist&h="+provider+"&bookid="+id+"&sajax=getchapterlist";
        
        let chaptersjson = (await HttpClient.fetchJson(fetchUrl)).json;

        let temp = chaptersjson.data.split("-//-");
        let onechaptdata = temp.map(a => a.split("-/-"));
        let chapters = onechaptdata.map(a => ({
            sourceUrl: "https://"+hostname+"/truyen/"+provider+"/1/"+id+"/"+a[1], 
            title: a[2].trim(),
            isIncludeable: (a[3] == null)
        }));
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1#book_name2").textContent;
    }

    extractAuthor(dom) {
        return dom.querySelector(".cap h2").textContent;
    }

    extractDescription(dom) {
        return dom.querySelector("#book-sumary").textContent.trim();
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("center img")?.src ?? null;
    }

    async fetchChapter(url) {
        let header = {"Content-Type": "application/x-www-form-urlencoded"};
        let options = {
            headers: header
        };
        let restUrl = this.toRestUrl(url);
        let json = (await SangtacvietParserHttpClient.fetchJson(restUrl, options)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let leaves = url.split("/").filter(a => a != "");
        let chapter = leaves[leaves.length - 1];
        let id = leaves[leaves.length - 2];
        let provider = leaves[leaves.length - 4];
        let hostname = new URL(url).hostname;
        let ret = "https://"+hostname+"/index.php?bookid="+id+"&h="+provider+"&c="+chapter+"&ngmar=readc&sajax=readchapter&sty=1&exts=";
        return ret;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.chaptername;
        newDoc.content.appendChild(title);
        let content = new DOMParser().parseFromString(json.data, "text/html");
        for(let n of [...content.body.childNodes]) {
            newDoc.content.appendChild(n);
        }
        return newDoc.dom;
    }
}

class SangtacvietParserHttpClient extends HttpClient {
    constructor() {
        super();
    }

    static fetchJson(url, fetchOptions) {
        let wrapOptions = {
            responseHandler: new FetchJsonResponseHandler(),
            fetchOptions: fetchOptions
        };
        return SangtacvietParserHttpClient.wrapFetchImpl(url, wrapOptions);
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
            wrapOptions.errorHandler = new SangtacvietParserFetchErrorHandler();
        }
        try
        {
            let response = await fetch(url, wrapOptions.fetchOptions);
            let ret = await HttpClient.checkResponseAndGetData(url, wrapOptions, response);
            if (SangtacvietParserHttpClient.is429error(ret)) {
                let newresp = {};
                newresp.status = 403;
                let params = new URL(response.url).searchParams;
                let chapter = params.get("c");
                let id = params.get("bookid");
                let provider = params.get("h");
                let hostname = new URL(response.url).hostname;
                newresp.url = "https://"+hostname+"/truyen/"+provider+"/1/"+id+"/"+chapter+"/";
                return wrapOptions.errorHandler.onResponseError(url, wrapOptions, newresp);
            }
            return ret;
        }
        catch (error)
        {
            return wrapOptions.errorHandler.onFetchError(url, error);
        }
    }

    static is429error(json){
        if (json.json.code == "21") {
            return true;
        }
        return false;
    }
}


class SangtacvietParserFetchErrorHandler extends FetchErrorHandler {
    constructor() {
        super();
    }

    async retryFetch(url, wrapOptions) {
        let delayBeforeRetry = wrapOptions.retry.retryDelay.pop() * 1000;
        await util.sleep(delayBeforeRetry);
        return SangtacvietParserHttpClient.wrapFetchImpl(url, wrapOptions);
    }

    onResponseError(url, wrapOptions, response) {
        let failError = new Error(this.makeFailMessage(url, response.status));
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
        return new Promise(function(resolve, reject) {
            if (wrapOptions.retry.HTTP === 403) {
                msg.openurl = response.url;
                msg.blockurl = url;
            }
            msg.retryAction = () => resolve(SangtacvietParserHttpClient.wrapFetchImpl(url, wrapOptions));
            msg.cancelAction = () => reject(failError);
            msg.cancelLabel = cancelLabel;
            ErrorLog.showErrorMessage(msg);
        });
    }
}