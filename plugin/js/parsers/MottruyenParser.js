"use strict";

parserFactory.register("mottruyen.com.vn", () => new MottruyenParser());
parserFactory.register("mottruyen.vn", () => new MottruyenParser());

class MottruyenParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let leaves = dom.baseURI.split("/").filter(a => a != "");
        let id = leaves[leaves.length - 1];
        let bookinfo = (await HttpClient.fetchJson("https://api.mottruyen.vn/api/v1/story/"+id)).json;
        let chapter_count = bookinfo.countChapter;
        let slug = bookinfo.slug;
        let chapters = (await HttpClient.fetchJson("https://api.mottruyen.vn/api/v1/story/"+id+"/chapter?size="+chapter_count+"&page=0&sort=asc")).json;
        return chapters.data.map(a => ({
            sourceUrl: "https://mottruyen.com.vn/"+slug+"/"+id+"/chuong/"+a.chapter, 
            title: a.chapterTitle?"Chương "+a.chapter + " :"+ a.chapterTitle:"Chương "+a.chapter,
            isIncludeable: (a.price == 0)
        }));
    }
    
    async loadEpubMetaInfo(dom) {
        let leaves = dom.baseURI.split("/").filter(a => a != "");
        let id = leaves[leaves.length - 1];
        let bookinfo = (await HttpClient.fetchJson("https://api.mottruyen.vn/api/v1/story/"+id)).json;
        this.title = bookinfo.name;
        this.author = bookinfo.author.name;
        this.description = bookinfo.introduce?.trim();
        this.password = bookinfo.password;
        this.img = "https://api.mottruyen.vn/api/v1/storage"+bookinfo.image;
        return;
    }

    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractDescription() {
        return this.description;
    }

    findCoverImageUrl() {
        return this.img;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }


    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let options = {
            parser: this
        };
        let json = (await HttpClient.fetchJson(restUrl, options)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let leaves = url.split("/").filter(a => a != "");
        let id = leaves[leaves.length - 3];
        let chapternumber = leaves[leaves.length - 1];
        return "https://api.mottruyen.vn/api/v1/story/"+id+"/chapter/"+chapternumber+"?password="+this.password;
    }
    
    isCustomError(response) {
        if (response?.json?.lock) {
            return true;
        }
        if (response?.json?.statusCode != 200) {
            return true;
        }
        return false;
    }

    setCustomErrorResponse(url, wrapOptions, checkedresponse) {
        if (checkedresponse?.json?.lock) {
            //Is only viewable in the app
            let newresp = {};
            newresp.url = url;
            newresp.wrapOptions = wrapOptions;
            newresp.response = {};
            newresp.response.url = this.PostToUrl(checkedresponse.response.url, checkedresponse);
            newresp.response.status = 999;
            newresp.response.retryDelay = [1];
            newresp.errorMessage = "This Chapter '"+newresp.response.url+"' could not be downloaded\nMessage: "+checkedresponse?.json.content;
            return newresp;
        }
        if (checkedresponse?.json?.statusCode != 200) {
            //to catch an error response
            //not tested
            let newresp = {};
            newresp.url = url;
            newresp.wrapOptions = wrapOptions;
            newresp.response = {};
            newresp.response.url = checkedresponse.response.url;
            newresp.response.status = checkedresponse?.json?.statusCode;
            return newresp;
        }
    }

    PostToUrl(url, checkedresponse) {
        let leaves = url.split("/").filter(a => a != "");
        let id = leaves[leaves.length - 3];
        let chapternumber = leaves[leaves.length - 1];
        return "https://mottruyen.com.vn/"+checkedresponse?.json?.nameIndex+"/"+id+"/chuong/"+chapternumber;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.chapterTitle?"Chương "+json.chapter + " :"+ json.chapterTitle:"Chương "+json.chapter;
        newDoc.content.appendChild(title);
        let content = util.sanitize(json.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
