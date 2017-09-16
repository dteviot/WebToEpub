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
        let options = [...dom.querySelectorAll("select#chap_select option")];
        if (options.length ===0) {
            // no list of chapters found, assume it's a single chapter story
            return Promise.resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            let foundUrls = new Set();
            let isUnique = function(chapterInfo) {
                let unique = !foundUrls.has(chapterInfo.sourceUrl);
                if (unique) {
                    foundUrls.add(chapterInfo.sourceUrl);
                }
                return unique;
            }

            return Promise.resolve(
                options.map(option => that.optionToChapterInfo(baseUrl, option))
                .filter(isUnique)
            );
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
        return dom.querySelector("div.storytext");
    }

    extractTextFromProfile(dom, tag) {
        return dom.querySelector("div#profile_top " + tag).textContent.trim();
    }

    extractTitle(dom) {
        return this.extractTextFromProfile(dom, "b");
    }

    extractAuthor(dom) {
        return this.extractTextFromProfile(dom, "a");
    }
}
