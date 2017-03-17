/*
   parser for *.wixsite.com
*/
"use strict";

parserFactory.registerRule(
    function(url, dom) {
        return util.extractHostName(url).endsWith(".wixsite.com"); 
    }, 
    function() { return new WixParser() }
);

class WixParser extends Parser{
    constructor() {
        super();
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    getChapterUrls(dom) {
        this.findRestUrls(dom);
        let chapters = util.hyperlinksToChapterList(dom.body);
        return Promise.resolve(chapters);
    };

    findRestUrls(dom) {
        for(let script of util.getElements(dom, "script")) {
            let text = script.innerHTML;
            let index = text.indexOf("var publicModel = {")
            if (0 <= index) {
                index = text.indexOf("{", index);
                let end = util.findIndexOfClosingBracket(text, index);
                let json = JSON.parse(text.substring(index, end + 1));
                this.findPageRestUrls(json);
                return;
            }
        };
    }    

    findPageRestUrls(json, url) {
        let topology = json.pageList.topology[0];
        this.restUrls = new Map();
        for(let page of json.pageList.pages) {
            this.restUrls.set(
                json.externalBaseUrl + "/" + page.pageUriSEO, 
                topology.baseUrl + topology.parts.replace("{filename}",  page.pageJsonFileName)
            )
        }
    }

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return util.getElement(dom, "div");
    };

    fetchChapter(url) {
        let that = this;
        let restUrl = this.restUrls.get(url);
        return HttpClient.fetchJson(restUrl).then(function (handler) {
            let content = that.findContextInJson(handler.json);
            return Promise.resolve(that.constructDoc(content, url));
        });
    }
    
    findContextInJson(json) {
        let wantedComponentName = json.structure.components[0].dataQuery.substring(1);
        return json.data.document_data[wantedComponentName].text;
    }

    constructDoc(content, url) {
        let html = "<html><head><title></title><body><div>" + content + "</div></body></html>";
        let doc = new DOMParser().parseFromString(html, "text/html");
        doc.baseUrl = url;
        return doc;
    }
}
