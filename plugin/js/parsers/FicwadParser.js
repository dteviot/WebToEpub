/*
  Parses files on ficwad.com
*/
"use strict";

parserFactory.register("ficwad.com", function() { return new FicwadParser(); });

class FicwadParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        if (this.isStoryIndexPage(dom)) {
            return Promise.resolve(this.getChaptersFromStoryIndex(dom));
        }

        let baseUrl = this.getBaseUrl(dom);
        let options = [...dom.querySelectorAll("form[name='chapterlist'] option")];
        if (options.length ===0) {
            // no list of chapters found, assume it's a single chapter story
            return Promise.resolve(this.singleChapterStory(baseUrl, dom));
        } else {
            return Promise.resolve(
                options.map(option => this.optionToChapterInfo(baseUrl, option))
            );
        }
    }

    isStoryIndexPage(dom) {
        return this.findContent(dom) === null;
    }
    
    getChaptersFromStoryIndex(dom) {
        return [...dom.querySelectorAll("div#chapters h4 a")]
            .map(a => util.hyperLinkToChapter(a));
    }
    
    optionToChapterInfo(baseUrl, optionElement) {
        let relativeUrl = optionElement.getAttribute("value");
        let url = util.resolveRelativeUrl(baseUrl, relativeUrl);
        return {
            sourceUrl:  url,
            title: optionElement.innerText
        };
    }

    findContent(dom) {
        return dom.querySelector("div#storytext");
    }

    extractTitleImpl(dom) {
        if (this.isStoryIndexPage(dom)) {
            return dom.querySelector("div.storylist h4");
        }

        // assume dom is first chapter of story
        let titles = [...dom.querySelectorAll("div#story h2 a")];
        if (0 < titles.length) {
            return titles.pop();
        }
    }

    extractAuthor(dom) {
        return dom.querySelector("span.author a").textContent.trim();
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("div.storylist h4");
        if (title !== null) {
            let s = title.textContent;
            for (let link of title.querySelectorAll("a")) {
                link.remove();
            }
            title.textContent = s;
        }
        return title;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.storylist")];
    }
}
