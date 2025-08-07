"use strict";

parserFactory.register("taffygirl13.wordpress.com", () => new Taffygirl13Parser());

class Taffygirl13Parser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tables = [...dom.querySelectorAll("div.entry-content figure table")]
            .map(table => [...table.querySelectorAll("tr")]
                .map(row => [...row.querySelectorAll("td a")])
            );
        if (tables.length == 0) {
            return super.getChapterUrls(dom);
        }

        let chapters = [];
        for (let table of tables) {
            let rhs = [];
            for (let row of table) {
                chapters.push(row[0]);
                if (row.length == 2) {
                    rhs.push(row[1]);
                }
            }
            chapters = chapters.concat(rhs);
        }
        return chapters.map(a => util.hyperLinkToChapter(a));
    }
}
