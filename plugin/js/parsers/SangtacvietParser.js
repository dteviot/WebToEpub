"use strict";

parserFactory.register("sangtacviet.com", () => new SangtacvietParser());
parserFactory.register("sangtacviet.vip", () => new SangtacvietParser());

class SangtacvietParser extends Parser {
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
        }];
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
            headers: header,
            parser: this
        };
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl, options)).json;
        return this.buildChapter(json, url);
    }
    
    isCustomError(response) {
        if (response.json.code != "0") {
            return true;
        }
        return false;
    }

    setCustomErrorResponse(url, wrapOptions, checkedresponse) {
        let newresp = {};
        newresp.url = url;
        newresp.wrapOptions = wrapOptions;
        newresp.response = {};
        newresp.response.url = this.RestToUrl(checkedresponse.response.url);
        newresp.response.status = 403;
        return newresp;
    }

    RestToUrl(url) {
        let params = new URL(url).searchParams;
        let chapter = params.get("c");
        let id = params.get("bookid");
        let provider = params.get("h");
        let hostname = new URL(url).hostname;
        return "https://"+hostname+"/truyen/"+provider+"/1/"+id+"/"+chapter+"/";
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
        let content = util.sanitize(json.data);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}