"use strict";

parserFactory.register("dao-divine-tl.com", () => new DaoDivineTlParser());

class DaoDivineTlParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        // eslint-disable-next-line
        let regex = new RegExp("\/book\/.+");
        let title = dom.baseURI.match(regex)?.[0].slice(6);
        let bookinfo = (await HttpClient.fetchJson("https://api.dao-divine-tl.com/api/bookdata/filter?b_name=" + title)).json;
        let novel_id = bookinfo.novel_id;
        let pageCount = 1;
        let Chapterjsons;
        let chapters = [];
        let partialList;
        for (let i = 1; i <= pageCount; i++) {
            await this.rateLimitDelay();
            Chapterjsons = (await HttpClient.fetchJson("https://api.dao-divine-tl.com/api/book/getChapterMetadata?b_name=" + novel_id + "&page=" + i)).json;
            partialList = this.chaptersFromJson(Chapterjsons);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            if (i == 1) {
                pageCount = Chapterjsons.pageCount;
            }
        }
        return chapters;
    }

    chaptersFromJson(json) {
        return json.result.map(a => ({
            sourceUrl: "https://www.dao-divine-tl.com/book/" + a.b_name + "/" + a.chapter_no, 
            title: a.title, 
            isIncludeable: !a.is_locked
        }));
    }
    
    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/book\/.+");
        let title = dom.baseURI.match(regex)?.[0].slice(6);
        let bookinfo = (await HttpClient.fetchJson("https://api.dao-divine-tl.com/api/bookdata/filter?b_name=" + title)).json;
        this.title = bookinfo.title;
        this.author = bookinfo.author;
        this.tags = bookinfo.tags;
        this.tags = this.tags.concat(bookinfo.status);
        this.tags = this.tags.concat(bookinfo.category);
        this.description = bookinfo.description;
        this.img = bookinfo.img;
        return;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractSubject() {
        let tags = this.tags;
        return tags.join(", ");
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.img;
    }

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let leaves = url.split("/");
        let id = leaves[leaves.length - 2];
        let chapternumber = leaves[leaves.length - 1];
        return "https://api.dao-divine-tl.com/api/book/getChapter?b_name=" + id +"&chapter=" + chapternumber;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.title;
        newDoc.content.appendChild(title);
        let text = json.content.replace("\n\n", "\n");
        text = text.split("\n");
        let br = newDoc.dom.createElement("br");
        for (let element of text) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
}
