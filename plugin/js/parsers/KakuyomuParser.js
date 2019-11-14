"use strict";

parserFactory.register("kakuyomu.jp", () => new KakuyomuParser());

class KakuyomuParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("a.widget-toc-episode-episodeTitle")]
            .map(link => ({
                sourceUrl: link.href,
                title: link.querySelector(".widget-toc-episode-titleLabel").textContent.trim()
            }));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("div.widget-episode");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#workTitle");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#workAuthor-activityName");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        let title = "";
        let chapterTitle = dom.querySelector("p.chapterTitle");
        if (chapterTitle !== null) {
            title = chapterTitle.textContent.trim();
        }
        let episode = dom.querySelector("p.widget-episodeTitle");
        if (episode !== null) {
            title += " " + episode.textContent.trim();
        }
        return util.isNullOrEmpty(title) ? null : title;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p#introduction")];
    }
}
