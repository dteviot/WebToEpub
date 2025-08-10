"use strict";

parserFactory.register("www.rebirth.online", function() { return new RebirthOnlineParser(); });

class RebirthOnlineParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.table_of_content");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title a");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title");
    }

    customRawDomToContentStep(webPage, content) {
        const styles = Array.from(webPage.rawDom.querySelectorAll("head style")).filter(s => s.textContent.trim());
        const classes = [];
        styles.forEach(s => {
            const re = /(\.[a-zA-Z0-9]+)/g;
            const t = s.textContent;
            if (!~t.indexOf("-999")) return;
            let c;
            while ((c = re.exec(t)) != null) {
                classes.push(...c);
            }
        });
        classes.filter((v,i,a) => a.indexOf(v)===i).forEach(c => {
            content.querySelectorAll(c).forEach(n => n.remove());
        });
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-title, div.entry-content p")];
    }
}
