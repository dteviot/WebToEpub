"use strict";

parserFactory.register("wuxiatranslate.com", () => new WuxiaTranslateParser());

class WuxiaTranslateParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
        this.apiKey = "sb_publishable_rs7n1XJd6XdyQQGZjggufQ_lnDleqqr";
        this.apiBase = "https://efrkglhpnooqmqhwfkfb.supabase.co/rest/v1";
        this.novelData = null;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = [...dom.querySelectorAll("span")]
            .find(span => span.textContent.trim() === "Author:");
        let authorValue = authorLabel?.nextElementSibling;
        return authorValue ? authorValue.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let coverImg = [...dom.querySelectorAll("img")]
            .find(img => img.src.includes("supabase.co/storage") && img.src.includes("novel-covers"));
        return coverImg ? coverImg.src : super.findCoverImageUrl(dom);
    }

    extractLanguage() {
        return "en";
    }

    extractSlug(dom) {
        let match = dom.baseURI.match(/\/series\/([^/?#]+)/);
        if (!match) {
            throw new Error("Unable to find novel slug in url.");
        }
        return match[1];
    }

    async fetchSupabaseGet(path) {
        let response = await fetch(`${this.apiBase}${path}`, {
            headers: {
                "apikey": this.apiKey
            }
        });
        if (!response.ok) {
            throw new Error("api error " + response.status + " for " + path);
        }
        return response.json();
    }

    async fetchSupabaseRpc(functionName, body) {
        let response = await fetch(`${this.apiBase}/rpc/${functionName}`, {
            method: "POST",
            headers: {
                "apikey": this.apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error("rpc error " + response.status + " for " + functionName);
        }
        return response.json();
    }

    async fetchNovelData(dom) {
        if (this.novelData) {
            return this.novelData;
        }
        let slug = this.extractSlug(dom);
        let novels = await this.fetchSupabaseGet(
            `/novels?select=id,title,author,cover_image&slug=eq.${encodeURIComponent(slug)}&publish_status=eq.Published`
        );
        if (!Array.isArray(novels) || novels.length === 0) {
            throw new Error("Unable to find novel data for slug " + slug);
        }
        this.novelData = { slug: slug, ...novels[0] };
        return this.novelData;
    }

    async getChapterUrls(dom) {
        let novelData = await this.fetchNovelData(dom);

        let chapters = await this.fetchSupabaseGet(
            `/chapters?select=id,title,sort_order&novel_id=eq.${novelData.id}`
        );
        if (!Array.isArray(chapters)) {
            throw new Error("unexpected chapter response.");
        }

        chapters.sort((a, b) => a.sort_order - b.sort_order);

        return chapters.map((chapter) => ({
            sourceUrl: `https://wuxiatranslate.com/series/${novelData.slug}/chapter-${chapter.sort_order}`,
            title: chapter.title
        }));
    }

    extractChapterSlug(url) {
        let match = url.match(/\/series\/[^/]+\/([^/?#]+)/);
        if (!match) {
            throw new Error("unable to find chapter slug in " + url);
        }
        return match[1];
    }

    async fetchChapter(url) {
        let novelData = await this.fetchNovelData({ baseURI: url });
        let chapterSlug = this.extractChapterSlug(url);

        let result = await this.fetchSupabaseRpc("get_chapter_by_slug", {
            p_novel_slug: novelData.slug,
            p_chapter_slug: chapterSlug
        });

        let chapterData = Array.isArray(result) ? result[0] : result;
        if (!chapterData || !chapterData.content) {
            throw new Error("unexpected chapter response for " + url);
        }

        let newDoc = Parser.makeEmptyDocForContent(url);
        let content = util.sanitize(chapterData.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        let emptyParagraphs = [...element.querySelectorAll("p")].filter((p) => {
            let text = p.textContent.replace(/\u00A0/g, "").trim();
            return text === "";
        });
        util.removeElements(emptyParagraphs);
        super.removeUnwantedElementsFromContentElement(element);
    }
}