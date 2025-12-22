/*
  Parses web novels from jadescrolls.com

  JadeScrolls is a Next.js/React SPA where content is rendered client-side.
  This parser uses the JadeScrolls API endpoints instead of HTML parsing.

  API Endpoints:
  - Novel data: https://api.jadescrolls.com/api/public/get-novel-by-slug
  - Chapter data: https://api.jadescrolls.com/api/user/get-chapter-by-slug

  URL structure: /novel/{novel-slug}/{chapter-slug}
*/
"use strict";

parserFactory.register("jadescrolls.com", () => new JadeScrollsParser());

class JadeScrollsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1500;
    }

    async loadEpubMetaInfo(dom) {
        await this.fetchNovelMetadata(dom);
        super.loadEpubMetaInfo(dom);
    }

    async fetchNovelMetadata(dom) {
        let novelSlug = this.extractNovelSlug(dom.baseURI);
        if (!novelSlug || this.novelData) {
            return;
        }

        try {
            let apiUrl = "https://api.jadescrolls.com/api/public/get-novel-by-slug?slug=" + novelSlug + "&chapterSort=ASC";
            let novelData = (await HttpClient.fetchJson(apiUrl)).json;
            this.novelData = novelData.data;
        } catch (error) {
            ErrorLog.log(error);
        }
    }

    async getChapterUrls(dom) {
        await this.fetchNovelMetadata(dom);
        let novelSlug = this.extractNovelSlug(dom.baseURI);
        let chapters = [];

        if (this.novelData?.chapter) {
            chapters = this.novelData.chapter.map(chapter => ({
                sourceUrl: "https://jadescrolls.com/novel/" + novelSlug + "/" + chapter.slug,
                title: JadeScrollsParser.makeTitle(chapter)
            }));
        }
        return chapters;
    }

    static makeTitle(chapter) {
        return chapter.title
            ? chapter.chapterNo + ": " + chapter.title
            : ("Episode " + chapter.chapterNo);
    }

    extractNovelSlug(url) {
        let match = url.match(/\/novel\/([^/]+)/);
        return match ? match[1] : null;
    }

    extractEpisodeNumber(url) {
        let match = url.match(/episode-(\d+)/) || url.match(/chapter-(\d+)/) || url.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl() {
        return this.novelData?.title;
    }

    extractAuthor() {
        return this.novelData?.OriginalNovelAuthor || this.novelData?.TranslateNovelAuthor;
    }

    async fetchChapter(url) {
        let match = url.match(/\/novel\/([^/]+)\/([^/?#]+)/);
        if (!match) {
            throw new Error("Invalid JadeScrolls chapter URL format: " + url);
        }

        let novelSlug = match[1];
        let chapterSlug = match[2];
        let apiUrl = "https://api.jadescrolls.com/api/user/get-chapter-by-slug?novelSlug=" + novelSlug + "&chapterSlug=" + chapterSlug;

        let chapterData = (await HttpClient.fetchJson(apiUrl)).json;
        return this.buildDomFromChapterData(chapterData, url);
    }

    buildDomFromChapterData(chapterData, sourceUrl) {
        let newDoc = Parser.makeEmptyDocForContent(sourceUrl);
        let data = chapterData.data || chapterData;

        if (data.title) {
            let titleElement = newDoc.dom.createElement("h1");
            titleElement.textContent = JadeScrollsParser.makeTitle(data);
            newDoc.content.appendChild(titleElement);
        }

        let rawHtml = data.content || data.body || "";
        if (rawHtml) {
            let sanitized = util.sanitize(rawHtml);
            util.moveChildElements(sanitized.body, newDoc.content);
        }
        return newDoc.dom;
    }

    findCoverImageUrl(dom) {
        return this.novelData?.coverImg || util.getFirstImgSrc(dom, ".novel-detils-wrapper");
    }

    extractDescription() {
        return this.novelData?.description || this.novelData?.synopsis || "";
    }

    extractSubject() {
        let genre = this.novelData?.genre;
        if (Array.isArray(genre)) {
            return genre.join(", ");
        }
        return genre || "";
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".novel-detils-wrapper")];
    }
}
