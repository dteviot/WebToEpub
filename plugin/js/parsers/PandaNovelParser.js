"use strict";

parserFactory.register("panda-novel.com", () => new PandaNovelParser());

class PandaNovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = []
        let urlsOfTocPages = PandaNovelParser.getUrlsOfTocPages(dom);
        let baseUrl = new URL(dom.baseURI).origin;
        for (let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let jsonContent = (await HttpClient.fetchJson(url)).json;
            let partialList = PandaNovelParser.extractPartialChapterList(jsonContent.data.list, baseUrl);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    static getUrlsOfTocPages(dom) {
        let pageIds = [...dom.querySelectorAll("ul.pagination li a")]
            .filter(a => a.text)
            .map(a => parseInt(a.text.trim()));
        pageIds.concat(1)
        let maxPage = Math.max(...pageIds);
        let baseUrl = new URL(dom.baseURI).origin;
        let bookId = parseInt(dom.baseURI.split("-").pop())
        let urls = [];
        for (let i = 1; i <= maxPage; ++i) {
            urls.push(baseUrl + "/api/book/chapters/" + bookId + "/" + i);
        }
        return urls;
    }

    static extractPartialChapterList(jsonContent, baseUrl) {
        return jsonContent.map(data => ({
            sourceUrl: baseUrl + data.chapterUrl,
            title: data.name.trim()
        }));
    }

    findContent(dom) {
        return dom.querySelector("#novelArticle2");
    }

    customRawDomToContentStep(webPage, content) {
        let html = "\n<p>" + content.innerHTML.replaceAll(/<br><br>|<\/p><p>/g, "</p>\n<p>").replaceAll(/(?<!\n)<p>/g, "\n<p>") + "</p>";
        util.parseHtmlAndInsertIntoContent(html, content)
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel-desc h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".novel-content h2");
    }

    extractAuthor(dom) {
        //Note: In "a[href*='/author']" forward slash is required
        let authorLabel = [...dom.querySelectorAll(".novel-desc a[href*='/author']")].map(x => x.textContent.trim())
        return (authorLabel.length === 0) ? super.extractAuthor(dom) : authorLabel.join(", ");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".novel-ins, sub");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".novel-cover [style*=background-image]").dataset.src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector(".details-section dd")];
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".details-tags li")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
}
