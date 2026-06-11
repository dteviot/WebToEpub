/*
  Parses files on fanfiction.mugglenet.com
*/
"use strict";

//dead url/ parser
parserFactory.register("fanfiction.mugglenet.com", () => new MuggleNetParser());

class MuggleNetParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let baseUrl = this.getBaseUrl(dom);
        let options = [...dom.querySelectorAll("select[name='chapter'] option")];
        if (options.length === 0) {
            // no list of chapters found, assume it's a single chapter story
            return Promise.resolve(this.singleChapterStory(baseUrl, dom));
        } else {
            return Promise.resolve(options.map(option => this.optionToChapterInfo(baseUrl, option)));
        }
    }

    optionToChapterInfo(baseUrl, optionElement) {
        // constructing the URL is a bit complicated as the value is not final part of URL.
        let chapterId = optionElement.getAttribute("value");
        let searchString = "chapter=";
        let index = baseUrl.indexOf(searchString) + searchString.length;
        let url = baseUrl.slice(0, index) + chapterId;
        return {
            sourceUrl:  url,
            title: optionElement.innerText
        };
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div#story");
    }

    extractTextFromPageTitle(dom, index) {
        let text = "<unknown>";
        let links = [...dom.querySelectorAll("div#pagetitle a")];
        if (index < links.length) {
            text = links[index].textContent.trim();
        }
        return text;
    }

    extractTitleImpl(dom) {
        return this.extractTextFromPageTitle(dom, 0);
    }

    extractAuthor(dom) {
        return this.extractTextFromPageTitle(dom, 1);
    }
}
