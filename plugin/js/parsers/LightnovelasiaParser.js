"use strict";

parserFactory.register("lightnovelasia.com", () => new LightnovelasiaParser());

class LightnovelasiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        // eslint-disable-next-line
        let novelSlug = new URL(dom.baseURI).pathname.match(/\/novel\/([^/]+)/)[1];
        let header = {
            "Content-Type": "application/json;charset=UTF-8",
            "Apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHdqYmp2Ympjbm1iemxmcmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTMwNzQsImV4cCI6MjA4NTA4OTA3NH0.6_wyMFLThEyPimrEVmBLF9aYRdN1VaEGFtRHXilR8tg"
        };
        let options = {
            method: "GET",
            headers: header
        };
        let bookinfo = (await HttpClient.fetchJson("https://ouhwjbjvbjcnmbzlfrkl.supabase.co/rest/v1/novels?select=*&slug=eq."+novelSlug+"&publish_status=eq.Published", options)).json;
        let novel_id = bookinfo[0].id;
        let pageCount = 1;
        let chapters = [];
        let fetchUrl = "https://ouhwjbjvbjcnmbzlfrkl.supabase.co/rest/v1/rpc/get_novel_toc";
        let formData = 
            {
                "p_is_paid":false,
                "p_limit":50,
                "p_novel_id":novel_id,
                "p_offset":0,
                "p_sort_asc":false
            };
        options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header
        };
        let Chapterjsons = (await HttpClient.fetchJson(fetchUrl, options)).json;
        formData = 
            {
                "p_is_paid":false,
                "p_limit":Chapterjsons[0].total_count,
                "p_novel_id":novel_id,
                "p_offset":0,
                "p_sort_asc":false
            };
        options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header
        };
        Chapterjsons = (await HttpClient.fetchJson(fetchUrl, options)).json;

        chapters = chaptersFromJson(Chapterjsons).reverse();
        return chapters;
    }

    chaptersFromJson(json) {
        return json.map(a => ({
            sourceUrl: "https://www.dao-divine-tl.com/book/" + a.b_name + "/" + a.chapter_no, 
            title: a.title, 
            isIncludeable: !a.is_locked
        }));
    }
    
    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        /*
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
        */
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
