/*
  Parses web novels from jadescrolls.com
*/
"use strict";

parserFactory.register("jadescrolls.com", () => new JadeScrollsParser());

class JadeScrollsParser extends Parser {
    constructor() {
        super();
        this.ChacheChapterContent = new Map();
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
    }

    async getChapterUrls() {
        let chapters = [];
        let Chapterjsons = (await HttpClient.fetchJson("https://api.jadescrolls.com/api/novels-chapter/"+this.id+"/chapters/list?limit="+this.chapters_count+"&page=1&novelId="+this.id+"&status=PUBLISHED&isDeleted=false&sortOrder=desc")).json;
        chapters = this.chaptersFromJson(Chapterjsons);
        this.chacheChapter(Chapterjsons);
        return chapters;
    }

    chaptersFromJson(json) {
        return json.data.map(a => ({
            sourceUrl: "https://jadescrolls.com/novel/"+this.slug+"/"+a.slug, 
            title: document.getElementById("removeChapterNumberCheckbox").checked?a.title:"Chapter "+a.chapter_number+": "+a.title, 
            isIncludeable: (a.type == "FREE")
        })).reverse();
    }

    chacheChapter(json) {
        json.data.map(a => (this.ChacheChapterContent.set("https://jadescrolls.com/novel/"+this.slug+"/"+a.slug, [a.title, a.content])));
    }

    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        let novelSlug = new URL(dom.baseURI).pathname.match(/\/novel\/([^/]+)/)[1];
        let bookinfo = (await HttpClient.fetchJson("https://api.jadescrolls.com/api/novels?slug=" + novelSlug)).json;
        this.title = bookinfo.title;
        this.author = bookinfo.author_name;
        this.description = bookinfo.synopsis;
        this.img = bookinfo.cover_image;
        this.tags = "";
        for (let tmp in bookinfo?.genres) {
            this.tags = this.tags.concat(tmp?.name);
        }
        for (let tmp in bookinfo?.sub_genres) {
            this.tags = this.tags.concat(tmp?.name);
        }
        this.novelSlug = novelSlug;
        this.id = bookinfo.id;
        this.chapters_count = bookinfo.chapters_count;
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
        if (this.ChacheChapterContent.has(url)) {
            this.minimumThrottle = 0;
            return this.buildChapterfromChache(this.ChacheChapterContent.get(url), url);
        } else {
            this.minimumThrottle = this.getRateLimit();
            let restUrl = this.toRestUrl(url);
            let json = (await HttpClient.fetchJson(restUrl)).json;
            return this.buildChapter(json, url);
        }
    }

    buildChapterfromChache(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json[0];
        newDoc.content.appendChild(title);
        let content = util.sanitize(json[1]);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    toRestUrl(url) {
        let leaves = url.split("/");
        let story_slug = leaves[leaves.length - 2];
        let chapter_slug = leaves[leaves.length - 1];
        return "https://api.jadescrolls.com/api/novels-chapter/"+story_slug+"/chapters/"+chapter_slug;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json?.title;
        newDoc.content.appendChild(title);
        let content = util.sanitize(json?.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
