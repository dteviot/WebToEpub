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
        let path = cleanUrl.pathname.split("/").slice(3, 6).join("/");
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
        let newDoc = Parser.makeEmptyDocForContent(url);
        let id = (new URL(url)).hash.substring(1);
        let post = fetchedDom.getElementById(id);
        let content = post.querySelector("article");
        this.addTitleToChapter(newDoc, post);
        this.removeBlockquotes(content);
        this.fixupImageUrls(content);
        newDoc.content.appendChild(content);
        return newDoc.dom;
    }

    fixupImageUrls(content) {
        for(let i of content.querySelectorAll("img")) {
            let dataUrl = i.getAttribute("data-url");
            if (dataUrl && (i.src !== dataUrl)) {
                i.src = dataUrl;
                i.removeAttribute("data-url");
                i.removeAttribute("data-src");
            }
            this.cleanupMangledImageSrc(i);
        }
    }

    cleanupMangledImageSrc(img) {
        let url = new URL(img.src);
        let hostname = url.hostname;
        if (hostname.includes("questionablequesting")) {
            let path = url.pathname;
            let index = path.indexOf("/proxy.php");
            if (0 < index) {
                url.pathname = path.substring(index);
            }
            img.src = url;
        }
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

    removeBlockquotes(content) {
        let blocks = [...content.querySelectorAll("blockquote")];
        for(let block of blocks) {
            block.replaceWith(...block.childNodes);
        }
    }
}
