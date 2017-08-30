"use strict";

parserFactory.register("forums.nrvnqsr.com", function() { return new NrvnqsrParser() });

class NrvnqsrParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.postlist");
        return Promise.resolve(util.hyperlinksToChapterList(menu));        
    };

    findContent(dom) {
        let postId = util.getParamFromUrl(dom.baseURI, "p");
        let selector = (postId === null) ? "div.postbody div.content" : "div#post_message_" + postId;
        return dom.querySelector(selector);
    };

    extractTitle(dom) {
        return dom.querySelector("span.threadtitle").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.userinfo a.username");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent.trim();
    };
}
