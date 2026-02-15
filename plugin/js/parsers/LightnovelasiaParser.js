"use strict";

parserFactory.register("lightnovelasia.com", () => new LightnovelasiaParser());

class LightnovelasiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let orgURL = new URL(dom.baseURI);
        let header = {
            "Content-Type": "application/json;charset=UTF-8",
            "Apikey":this.apiKey
        };
        let chapters = [];
        let fetchUrl = "https://ouhwjbjvbjcnmbzlfrkl.supabase.co/rest/v1/rpc/get_novel_toc";
        let formData = 
            {
                "p_is_paid":false,
                "p_limit":50,
                "p_novel_id":this.novel_id,
                "p_offset":0,
                "p_sort_asc":false
            };
        let options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header
        };
        let Chapterjsons = (await HttpClient.fetchJson(fetchUrl, options)).json;
        formData = 
            {
                "p_is_paid":false,
                "p_limit":Chapterjsons[0].total_count,
                "p_novel_id":this.novel_id,
                "p_offset":0,
                "p_sort_asc":false
            };
        options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header
        };
        Chapterjsons = (await HttpClient.fetchJson(fetchUrl, options)).json;
        chapters = this.chaptersFromJson(Chapterjsons, orgURL.origin + orgURL.pathname).reverse();
        return chapters;
    }

    chaptersFromJson(json, pathname) {
        return json.map(a => ({
            sourceUrl: pathname +"-chapter-"+ a.chapter_number, 
            title: a.title
        }));
    }
    
    async loadEpubMetaInfo(dom) {
        // eslint-disable-next-line
        let novelSlug = new URL(dom.baseURI).pathname.match(/\/novel\/([^/]+)/)[1];
        //magic value
        this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHdqYmp2Ympjbm1iemxmcmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTMwNzQsImV4cCI6MjA4NTA4OTA3NH0.6_wyMFLThEyPimrEVmBLF9aYRdN1VaEGFtRHXilR8tg";
        let header = {
            "Content-Type": "application/json;charset=UTF-8",
            "Apikey":this.apiKey
        };
        let options = {
            method: "GET",
            headers: header
        };
        let bookinfo = (await HttpClient.fetchJson("https://ouhwjbjvbjcnmbzlfrkl.supabase.co/rest/v1/novels?select=*&slug=eq."+novelSlug+"&publish_status=eq.Published", options)).json;
        this.novel_id = bookinfo[0].id;
        this.title = bookinfo[0].title;
        this.author = bookinfo[0].author;
        this.tags = bookinfo[0].tags;
        this.tags = this.tags.concat(bookinfo[0].genres);
        this.description = bookinfo[0].description;
        this.img = bookinfo[0].cover_image;
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
        let leaves = url.split("/");
        let slug = leaves[leaves.length-1];
        let fetchURL = "https://ouhwjbjvbjcnmbzlfrkl.supabase.co/rest/v1/rpc/get_content_by_slug";
        let header = {
            "Content-Type": "application/json;charset=UTF-8",
            "Apikey":this.apiKey
        };
        let formData = 
            {
                "slug_input":slug
            };
        let options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header
        };
        let json = (await HttpClient.fetchJson(fetchURL, options)).json;
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json[0]?.data?.title;
        newDoc.content.appendChild(title);
        let content = util.sanitize(json[0]?.data?.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
