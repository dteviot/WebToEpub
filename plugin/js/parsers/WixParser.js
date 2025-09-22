/*
   parser for *.wixsite.com
   This site unusual as it does not put the content directly in the HTML for each "chapter/page".
   Instead the javascript in the chapter/page makes an AJAX/REST call to get the content.
   So, this parser needs to obtain the URL for the AJAX/REST calls for the content and use them.
*/
"use strict";

parserFactory.registerUrlRule(
    url => util.extractHostName(url).endsWith(".wixsite.com"), 
    () => new WixParser()
);

class WixParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        this.mapPageUrltoRestUrl = this.buildMapOfPageUrltoRestUrlWithContent(dom);
        let chapters = util.hyperlinksToChapterList(dom.body);
        this.mapPageUrlToPageTitle = this.buildMapOfPageUrlsToPageTitles(chapters);
        return Promise.resolve(chapters);
    }

    buildMapOfPageUrltoRestUrlWithContent(dom) {
        let json = this.findJsonWithRestUrls(dom);
        return this.extractRestUrlsFromJson(json);
    }

    findJsonWithRestUrls(dom) {
        for (let script of dom.querySelectorAll("script")) {
            let text = script.textContent;
            let json = util.locateAndExtractJson(text, "var publicModel =");
            if (json != null) {
                return json;
            }
        }
    }    

    extractRestUrlsFromJson(json) {
        let topology = json.pageList.topology[0];
        let urlsFromPage = function(page) {
            return { 
                pageUrl: json.externalBaseUrl + "/" + page.pageUriSEO,
                restUrl: topology.baseUrl + 
                    topology.parts.replace("{filename}",  page.pageJsonFileName)
            };
        };
        return json.pageList.pages
            .map(page => urlsFromPage(page))
            .reduce((acc, urls) => acc.set(urls.pageUrl, urls.restUrl), new Map());
    }

    buildMapOfPageUrlsToPageTitles(chapters) {
        return chapters.reduce((acc, c) => acc.set(c.sourceUrl, c.title), new Map());
    }

    findContent(dom) {
        return dom.querySelector("div");
    }

    async fetchChapter(url) {
        let restUrl = this.mapPageUrltoRestUrl.get(url);
        let handler = await HttpClient.fetchJson(restUrl);
        let content = this.findContentInJson(handler.json);
        return this.constructDoc(content, url);
    }
    
    findContentInJson(json) {
        // find names of the document_data fields holding content
        let contentFieldNames = json.structure.components
            .filter(c => c.styleId === "txtNew")
            .map(f => f.dataQuery.substring(1));
 
        // get content   
        let content = contentFieldNames.map(f => json.data.document_data[f].text);
       
        // assume longest content is the story
        return content.reduce((a, b) => (a.length > b.length) ? a : b );        
    }

    constructDoc(content, url) {
        let html = "<html><head><title></title><body><div>" +
            "<h1>" + this.mapPageUrlToPageTitle.get(url) + "</h1>" +
            content + 
            "</div></body></html>";
        let doc = util.sanitize(html);
        doc.baseUrl = url;
        return doc;
    }
}
