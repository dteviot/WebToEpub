"use strict";

parserFactory.register("forum.questionablequesting.com", () => new QuestionableQuestingParser());
parserFactory.register("questionablequesting.com", () => new QuestionableQuestingParser());

class QuestionableQuestingParser extends Parser{
    constructor() {
        super();
        this.cache = new FetchCache();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.threadmarkList a.PreviewTooltip")]
            .map(a => this.linkToChapter(a));
        this.addAnchorToFirstChapter(chapters, dom);
        return chapters;
    };

    addAnchorToFirstChapter(chapters, dom) {
        if (chapters.length == 0) {
            return;
        }
        let first = chapters[0];
        let url = new URL(first.sourceUrl);
        if (url.hash == "") {
            let message = dom.querySelector("li.message");
            if (message != null) {
                url.hash = "#" + message.id;
                first.sourceUrl = url.href;
            }
        }
    }

    linkToChapter(link) {
        let cleanUrl = new URL(link.href);
        let path = cleanUrl.pathname.split("/").slice(1, 3).join("/") + "/";
        cleanUrl.pathname = path;
        return {
            sourceUrl:  cleanUrl.href,
            title: link.innerText.trim(),
            newArc: null
        };
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.titleBar h1");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.username");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    async fetchChapter(url) {
        let fetchedDom = await this.cache.fetch(url);
        let newDoc = Parser.makeEmptyDocForContent();
        let id = (new URL(url)).hash.substring(1);
        let post = fetchedDom.getElementById(id);
        let content = post.querySelector("article");
        this.addTitleToChapter(newDoc, post);
        newDoc.content.appendChild(content);
        return newDoc.dom;
    }

    addTitleToChapter(newDoc, post) {
        let titleElement = post.querySelector("span.label");
        let strong = titleElement.querySelector("strong");
        if (strong !== null) {
            strong.remove();
        }
        let title = newDoc.dom.createElement("h1");
        title.textContent = titleElement.textContent.trim();
        newDoc.content.appendChild(title);
    }
}
