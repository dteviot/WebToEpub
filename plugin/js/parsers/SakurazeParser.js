/*
  Parses web novels from sakuraze.vercel.app

  Sakuraze is a React single page app with no novel content in the HTML.
  All data is served from a Supabase REST API, using the public "anon" key
  that the site ships in its JavaScript bundle. If that key is ever rotated,
  update SUPABASE_KEY below.
*/
"use strict";

parserFactory.register("sakuraze.vercel.app", () => new SakurazeParser());
HttpClient.blockedSites.add("sakuraze.vercel.app");

class SakurazeParser extends Parser {
    constructor() {
        super();
        this.chapterIdByUrl = new Map();
    }

    disabled() {
        return UIText.Warning.parserDisabledNotification;
    }

    static SUPABASE_URL = "https://hlzjslwrhabsxdskinwd.supabase.co/rest/v1";
    static SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsempzbHdyaGFic3hkc2tpbndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODYyNTEsImV4cCI6MjA3NzA2MjI1MX0._xpIADB4jDsXIGp92-sFTQW8KAbli-Lr99ggJ8DRyX8";

    static apiUrl(path) {
        return SakurazeParser.SUPABASE_URL + "/" + path + "&apikey=" + SakurazeParser.SUPABASE_KEY;
    }

    static novelSlugFromUrl(url) {
        // Novel URL:   https://sakuraze.vercel.app/novel/<slug>
        // Chapter URL: https://sakuraze.vercel.app/novel/<slug>/chapter/<number>
        return new URL(url).pathname.match(/\/novel\/([^/]+)/)?.[1] ?? null;
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
    }

    async loadEpubMetaInfo(dom) {
        let slug = SakurazeParser.novelSlugFromUrl(dom.baseURI);
        let select = "id,title,description,cover_image,original_author," +
            "genres(name),author:profiles(username,display_name)";
        let novel = (await HttpClient.fetchJson(
            SakurazeParser.apiUrl("novels?slug=eq." + encodeURIComponent(slug) + "&select=" + select)
        )).json[0];
        this.novelId = novel.id;
        this.title = novel.title;
        this.description = novel.description ?? "";
        this.img = novel.cover_image;
        this.author = novel.original_author || novel.author?.display_name || novel.author?.username || "";
        this.tags = (novel.genres ?? []).map(g => g.name).filter(name => name).join(", ");
    }

    async getChapterUrls() {
        let slug = SakurazeParser.novelSlugFromUrl(document.getElementById("startingUrlInput").value);
        let json = (await HttpClient.fetchJson(
            SakurazeParser.apiUrl("chapters?novel_id=eq." + this.novelId +
                "&select=id,title,chapter_number,is_premium&order=chapter_number.asc")
        )).json;
        let removeChapterNumber = document.getElementById("removeChapterNumberCheckbox").checked;
        return json.map(c => {
            let sourceUrl = "https://sakuraze.vercel.app/novel/" + slug + "/chapter/" + c.chapter_number;
            this.chapterIdByUrl.set(sourceUrl, c.id);
            let hasTitle = !util.isNullOrEmpty(c.title);
            let title = (removeChapterNumber && hasTitle)
                ? c.title
                : "Chapter " + c.chapter_number + (hasTitle ? ": " + c.title : "");
            // Premium chapters return no content through the anon API
            return { sourceUrl: sourceUrl, title: title, isIncludeable: !c.is_premium };
        });
    }

    async fetchChapter(url) {
        let chapter = (await HttpClient.fetchJson(
            SakurazeParser.apiUrl("chapters?id=eq." + this.chapterIdByUrl.get(url) + "&select=content")
        )).json[0];
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.moveChildElements(util.sanitize(chapter?.content ?? "").body, newDoc.content);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    // Chapter content from the API has no heading, so use the title from the chapter list
    findChapterTitle(dom, webPage) {
        return webPage?.title ?? null;
    }

    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractDescription() {
        // Descriptions are plain text (may contain literal angle brackets as prose), so don't strip anything.
        return this.description.trim();
    }

    extractSubject() {
        return this.tags;
    }

    findCoverImageUrl() {
        return this.img;
    }
}
