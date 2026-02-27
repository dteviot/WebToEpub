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
            return "https://www.lanry.space/novels/"+slug.replace("&slug=eq.","")+"/c" + a.chapter_number;
        } else {
            return "https://www.lanry.space/novels/"+slug.replace("&slug=eq.","")+"/c" + a.chapter_number + "-p" + a.part_number;
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
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let startString = "self.__next_f.push(";
        let scriptElement = [...dom.querySelectorAll("script")].map(a => a.textContent).filter(s => s.includes(startString));
        let json = [];
        let i = 0;
        let j = 0;
        let longestindex = 0;
        let longestcontent = 0;
        //search longest content to build chapter
        while ( j < scriptElement.length) {
            try {
                json[i] = this.parseNextjsHydration(scriptElement[j]);
                i++;
                if (scriptElement[j].length > longestcontent && json[i-1].length == 2) {
                    longestcontent = scriptElement[j].length;
                    longestindex = i-1;
                }
            } catch (error) {
                //catch maleformed json
            }
            j++;
        }
        if (json[longestindex].webtoepubformat == "backslash") {
            json[longestindex].title = "";
            for (let jsonentry of json) {
                try {
                    json[longestindex].title = jsonentry.chapter.title.trim();
                } catch (error) {
                    //set title
                }
            }
        }
        return this.buildChapter(json[longestindex], url);
    }

    parseNextjsHydration(nextjs) {
        let malformedjson = nextjs.match(/{.*}/s);
        let json;
        if (malformedjson == null) {
            malformedjson = nextjs.match(/\[.*\]/s);
            let ret = malformedjson[0];
            json = JSON.parse(ret);
            json.webtoepubformat = "backslash";
        } else {
            let ret = malformedjson[0];
            ret = ret.replaceAll("\\\\\\\"", "[webtoepubescape\"]");
            ret = ret.replaceAll("\\", "");
            ret = ret.replaceAll("[webtoepubescape\"]","\\\"");
            json = JSON.parse(ret);
            json.webtoepubformat = "array";
        }
        return json;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        let br = newDoc.dom.createElement("br");
        if (json.webtoepubformat == "backslash") {
            title.textContent = json.title;
            newDoc.content.appendChild(title);
            let text = json[json[0]];
            text = text.replaceAll("\n\n", "\n");
            text = text.split("\n");
            for (let element of text) {
                let pnode = newDoc.dom.createElement("p");
                //filter title
                if (element != json.title) {
                    pnode.textContent = element;
                    newDoc.content.appendChild(pnode);
                }
                newDoc.content.appendChild(br);
            }
        } else {
            title.textContent = json.chapter.title;
            newDoc.content.appendChild(title);
            let textleaves = json.chapter.content.root.children.filter(a => a.direction!=null);
            for (let element of textleaves) {
                let newtext = "";
                element.children.map(a => newtext += a.text);
                let pnode = newDoc.dom.createElement("p");
                pnode.textContent = newtext;
                newDoc.content.appendChild(pnode);
                newDoc.content.appendChild(br);
            }
        }
        return newDoc.dom;
    }
}
