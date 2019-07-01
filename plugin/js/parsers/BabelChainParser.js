"use strict";

parserFactory.register("novel.babelchain.org", () => new BabelChainParser());
parserFactory.register("babelnovel.com", () => new BabelChainParser());

class BabelChainParser extends Parser{
    constructor() {
        super();
    }

    disabled() {
        return chrome.i18n.getMessage("warningParserDisabledBabelnovel");
    }

    getChapterUrls(dom) {
        let chapters = [];
        let lastChapterLink = this.findLastChapterUrl(dom);
        if (lastChapterLink != null) {
            let href = lastChapterLink.href;
            // assume URL looks like https://novel.babelchain.org/books/the-rebirth-of-the-malicious/chapters/c14
            let index = href.lastIndexOf("c");
            let base = href.substring(0, index);
            let max = parseInt(href.substring(index + 1));
            for(let i = 1; i <= max; ++i) {
                chapters.push({
                    sourceUrl: `${base}c${i}`,
                    title: `C${i}`
                })
            };
        }
        return Promise.resolve(chapters);
    };

    findLastChapterUrl(dom) {
        let lastChapterLink = dom.querySelector("a.chapter-content__3MoDI.last-chapter__4B8tJ");
        if (lastChapterLink != null) {
            return lastChapterLink;
        }
        return dom.querySelector("a.chapter__VWBWj.item__1oJbc");
    }

    customRawDomToContentStep(chapter, content) {
        util.convertPreTagToPTags(chapter.rawDom, content);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-info-wrapper__26NST div.name__8GUv7");
    };

    findContent(dom) {
        let pre = dom.querySelector("div.content-container__eld5P pre");
        let blockquote = pre.querySelector("blockquote");
        return blockquote === null ? pre : blockquote;
    };

    findChapterTitle(dom) {
        return dom.querySelector("div.content-container__eld5P div.title__3StRr");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover__265y8");
    }

    getInformationEpubItemChildNodes(dom) {
        let synopsis = dom.querySelector("div.section-content__1fSI8.section-body__3WqX5");
        return synopsis == null ? [] : [synopsis];
    }
}
