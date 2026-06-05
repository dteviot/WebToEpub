"use strict";

//dead url/ parser
parserFactory.register("kakuyomu.jp", () => new KakuyomuParser());

class KakuyomuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return this.buildToc(dom);
    }

    buildToc(dom) {
        let script = dom.querySelector("script#__NEXT_DATA__").innerHTML;
        let json = JSON.parse(script).props.pageProps.__APOLLO_STATE__;
        let work = json["Work:" + this.extractWorkId(dom)];
        let chapters = [];
        for (let tocc of work.tableOfContents) {
            this.buildSubToc(chapters, json[tocc.__ref], json, dom.baseURI);
        }
        return chapters;
    }

    extractWorkId(dom) {
        let url = dom.baseURI;
        let index = url.lastIndexOf("/");
        return url.substring(index + 1);
    }

    buildSubToc(chapters, tocc, json, baseURI) {
        let arcStartIndex = chapters.length;
        for (let episoderef of tocc.episodeUnions) {
            let episode = this.buildEpisode(json[episoderef.__ref], baseURI);
            chapters.push(episode);
        }
        this.addArcTitleToEpisode(chapters[arcStartIndex], tocc, json);
    }

    buildEpisode(episode, baseURI) {
        return ({
            sourceUrl: baseURI + "/episodes/" + episode.id,
            title: episode.title,
        });   
    }

    addArcTitleToEpisode(episode, tocc, json) {
        let id = tocc?.chapter?.__ref;
        if (id && episode) {
            episode.newArc = json[id].title;
        }
    }

    findContent(dom) {
        return dom.querySelector("div.widget-episode");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("a[title]");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".partialGiftWidgetActivityName a");
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
        let info = [...dom.querySelectorAll("div")]
            .filter(i => i.className.startsWith("CollapseTextWith"));
        return (0 < info.length) ? [info[0]] : [];
    }
}
