/*
  Parses files on www.fanfiction.net
*/
"use strict";

parserFactory.register("www.fanfiction.net", function() { return new FanFictionParser() });

// fictionpress.com has same format as fanfiction.net
parserFactory.register("www.fictionpress.com", function() { return new FanFictionParser() });

class FanFictionParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let baseUrl = that.getBaseUrl(dom);
        let chaptersElement = util.getElement(dom, "select", e => (e.id === "chap_select") );
        if (chaptersElement === null) {
            // no list of chapters found, assume it's a single chapter story
            return Promise.resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            return Promise.resolve(util.getElements(chaptersElement, "option").map(option => that.optionToChapterInfo(baseUrl, option)));
        }
    }

    optionToChapterInfo(baseUrl, optionElement) {
        // constructing the URL is a bit complicated as the value is not final part of URL.
        let relativeUrl = "../" + optionElement.getAttribute("value");
        let pathNodes = baseUrl.split("/");
        relativeUrl = relativeUrl + "/" + pathNodes[pathNodes.length - 1];
        let url = util.resolveRelativeUrl(baseUrl, relativeUrl);
        return {
            sourceUrl:  url,
            title: optionElement.innerText
        };
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", e => (e.className === "storytext xcontrast_txt nocopy") );
    }

    extractTextFromProfile(dom, tag) {
        let profile = util.getElement(dom, "div", e => (e.id === "profile_top") );
        return util.getElement(profile, tag).innerText.trim();
    }

    extractTitle(dom) {
        return this.extractTextFromProfile(dom, "b");
    }

    extractAuthor(dom) {
        return this.extractTextFromProfile(dom, "a");
    }
}
