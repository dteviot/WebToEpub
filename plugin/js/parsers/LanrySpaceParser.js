"use strict";

parserFactory.register("lanry.space", () => new LanrySpaceParser());

class LanrySpaceParser extends Parser {
    constructor() {
        super();
        this.bookid = "";
    }

    async getChapterUrls(dom) {
        let slug = this.getSlug(dom);
        let bookinfo = await this.fetchBookinfo(dom);
        this.bookid = bookinfo.id;
        let unlocked = new Set();
        bookinfo.chapter_unlocks.map(a => unlocked.add(a.chapter_number));
        let currenttime = Date.now();
        let chapterlist = [...bookinfo.chapters];
        chapterlist = chapterlist.sort((a,b) => (a.part_number==null?0:a.part_number) - (b.part_number==null?0:b.part_number));
        chapterlist = chapterlist.sort((a,b) => a.chapter_number - b.chapter_number);
        chapterlist = [...chapterlist.map(a => ({
            sourceUrl: this.sourceURL(a, slug),
            title: this.chtitle(a),
            isIncludeable: (a.publish_at == null || Date.parse(a.publish_at) < currenttime)
        }))];
        return chapterlist;
    }

    async fetchBookinfo(dom) {
        let slug = this.getSlug(dom);
        let apikey = "&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZ2toaXBhc3hxeGl0d2xrdHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMzE4MzMsImV4cCI6MjA0NTgwNzgzM30.mHBd2yrRm934yPGy4pui3p7cW4FxfIf6yxh7b2TpUA8";
        let apibasetoc = "https://vkgkhipasxqxitwlktwz.supabase.co/rest/v1/novels?select=*%2Cchapter_unlocks%21left%28chapter_number%2Cprofile_id%29%2Ccategories%3Acategories_on_novels%28category%3Acategory_id%28id%2Cname%2Ccreated_at%2Cupdated_at%29%29%2Ctags%3Atags_on_novels%21left%28novel_id%2Ctag_id%2Ccreated_at%2Ctag%3Atag_id%28id%2Cname%2Cdescription%29%29%2Cchapters%28id%2Ctitle%2Ccreated_at%2Cchapter_number%2Cpart_number%2Cpublish_at%2Ccoins%2Cvolume_id%2Cage_rating%29";
        return (await HttpClient.fetchJson(apibasetoc+slug+apikey)).json[0];
    }

    getSlug(dom) {
        // eslint-disable-next-line
        let regex = new RegExp("\/novels\/.+");
        let slug = "&slug=eq."+dom.baseURI.match(regex)?.[0].slice(8);
        const suffix = "/chapters";
        return slug.endsWith(suffix)
            ? slug.substring(0, slug.length - suffix.length)
            : slug;
    }

    sourceURL(a, slug) {
        if (a.part_number == null) {
            return "https://www.lanry.space/novels/"+slug+"/c" + a.chapter_number;
        } else {
            return "https://www.lanry.space/novels/"+slug+"/c" + a.chapter_number + "-p" + a.part_number;
        }
    }

    chtitle(a) {
        let chapNum = (a.part_number == null)
            ? `Ch. ${a.chapter_number}`
            : `Ch. ${a.chapter_number}-${a.part_number}`;
        return (a.title != "")
            ? chapNum + " " + a.title
            : chapNum;
    }
    
    async loadEpubMetaInfo(dom) {
        let bookinfo = await this.fetchBookinfo(dom);
        this.title = bookinfo.title;
        this.author = bookinfo.author;
        this.tags = bookinfo.tags.map(a => a.tag.name);
        this.tags = this.tags.concat(bookinfo.categories.map(a => a.category.name));
        this.description = bookinfo.description;
        this.img = bookinfo.cover_image_url	;
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
        let json = (await HttpClient.fetchJson(restUrl)).json[0];
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let partregex = new RegExp("-p[0-9]+");
        let partnumber = url.match(partregex)?.[0].slice(2);
        // eslint-disable-next-line
        let chapterregex = new RegExp("\/c[0-9]+");
        let chapterid = url.match(chapterregex)[0].slice(2);
        let apikey = "&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZ2toaXBhc3hxeGl0d2xrdHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMzE4MzMsImV4cCI6MjA0NTgwNzgzM30.mHBd2yrRm934yPGy4pui3p7cW4FxfIf6yxh7b2TpUA8";
        let ret = "https://vkgkhipasxqxitwlktwz.supabase.co/rest/v1/chapters?select=*%2Cnovel%3Anovels%28id%2Ctitle%2Cauthor%2Cauthor_profile_id%29&novel_id=eq."+this.bookid+"&chapter_number=eq."+chapterid+"&part_number=";
        if (partnumber == undefined) {
            ret+= "is.null" + apikey;
        } else {
            ret+= "eq." + partnumber + apikey;
        }
        return ret;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = this.chtitle(json);
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
