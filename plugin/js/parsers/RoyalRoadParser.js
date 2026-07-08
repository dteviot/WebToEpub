/*
  Parses files on www.royalroadl.com
*/
"use strict";

parserFactory.register("royalroadl.com", () => new RoyalRoadParser());
parserFactory.register("royalroad.com", () => new RoyalRoadParser());

class RoyalRoadParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // Page in browser has links reduced to "Number of links to show"
        // Fetch new page to get all chapter links.
        //
        // Royal Road's markup varies by session/redesign: the old server-rendered
        // <table id="chapters">, a new Tailwind table (class "w-full divide-y", no id),
        // or a JS-rendered shell with an empty <body>. The one constant across every
        // variant is the full chapter list embedded as a `window.chapters = [...]`
        // JSON array (each entry has id/title/slug/url). Parse that first
        // (redesign-proof); fall back to scraping the old table for legacy pages.
        let tocHtml = await HttpClient.fetchText(dom.baseURI);
        // Capture book metadata (description + genres) from the RAW html now — the DOM
        // the parser later sees has its <script> tags stripped and, on the redesign, no
        // JSON-LD at all, so the full description must be scraped here.
        RoyalRoadParser.lastBookMeta = RoyalRoadParser.extractBookMeta(tocHtml);
        let fromJson = RoyalRoadParser.chaptersFromWindowChapters(tocHtml, dom.baseURI);
        if (0 < fromJson.length) {
            return fromJson;
        }
        // fallback: legacy server-rendered table
        let doc = new DOMParser().parseFromString(tocHtml, "text/html");
        let table = doc.querySelector("table#chapters");
        return util.hyperlinksToChapterList(table);
    }

    // Extract the chapter list from the page's `window.chapters = [...]` JSON blob.
    // Returns [] if not present/parseable, so the caller can fall back.
    static chaptersFromWindowChapters(html, baseUrl) {
        let match = html.match(/window\.chapters\s*=\s*(\[[\s\S]*?\])\s*;/);
        if (match === null) {
            return [];
        }
        let chapters;
        try {
            chapters = JSON.parse(match[1]);
        } catch (err) {
            ErrorLog.log("RoyalRoadParser: found window.chapters but could not parse it: " + err);
            return [];
        }
        let fictionPath = new URL(baseUrl).pathname.replace(/\/+$/, "");
        return chapters
            .filter(c => (c != null) && ((c.url != null) || (c.id != null)))
            .map(c => ({
                sourceUrl: new URL(c.url ?? `${fictionPath}/chapter/${c.id}/${c.slug}`, baseUrl).href,
                title: c.title,
                newArc: null
            }));
    }

    // find the node(s) holding the story content
    findContent(dom) {
        // Royal Road's Tailwind redesign removed the "portlet-body" wrapper; the chapter
        // body is now div.chapter-inner inside a generic container. Anchor on
        // div.chapter-inner (present in every variant) and use its parent as the content
        // root; fall back to the legacy portlet-body match, then page-content-wrapper.
        let content = dom.querySelector("div.chapter-inner")?.parentElement
            ?? util.getElement(dom, "div",
                e => (e.className === "portlet-body") &&
                (e.querySelector("div.chapter-inner") !== null))
            ?? dom.querySelector(".page-content-wrapper");

        // fix embeded image links (null-guarded so one odd chapter can't abort the book)
        content?.querySelector(".author-note")?.querySelectorAll("a")?.forEach((e) =>
        {
            let img = e.querySelector("img");
            if (img !== null)
            {
                e.href = img.src;
            }
        });
        return content;
    }

    populateUIImpl() {
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    preprocessRawDom(webPageDom) { 
        this.removeWatermarks(webPageDom);
        this.removeImgTagsWithNoSrc(webPageDom);
        this.tagAuthorNotesBySelector(webPageDom, "div.author-note-portlet");

        let re_cnRandomClass = new RegExp("^cn[A-Z][a-zA-Z0-9]{41}$");
        webPageDom.querySelectorAll("p").forEach(element =>
        {
            let className = Array.from(element.classList).filter(item => re_cnRandomClass.test(item))[0];
            if (className)
            {
                element.classList.remove(className);
            }
        }
        );
    }

    //watermarks are regular <p> elements set to "display: none" by internal css
    removeWatermarks(webPageDom) {
        let internalStyles = [...webPageDom.querySelectorAll("style")]
            .map(style => style.sheet?.rules);
        let allCssRules = [];
        for (let ruleList of internalStyles) {
            for (let rule of ruleList) {
                allCssRules.push(rule);
            }
        }
        for (let rule of allCssRules.filter(s => s.style?.display == "none")) {
            webPageDom.querySelector(rule.selectorText)?.remove();
        }        
    }

    removeUnwantedElementsFromContentElement(content) {
        // only keep the <div class="chapter-inner" elements of content
        for (let i = content.childElementCount - 1; 0 <= i; --i) {
            let child = content.children[i];
            if (!this.isWantedElement(child)) {
                child.remove();
            }
        }
        this.makeHiddenElementsVisible(content);

        super.removeUnwantedElementsFromContentElement(content);
    }

    isWantedElement(element) {
        let tagName = element.tagName.toLowerCase();
        let className = element.className;
        return (tagName === "h1") || 
            ((tagName === "div") && 
                (className.startsWith("chapter-inner") ||
                className.includes("author-note-portlet") ||
                className.includes("page-content"))
            );
    }

    makeHiddenElementsVisible(content) {
        [...content.querySelectorAll("div")]
            .filter(e => (e.style.display === "none"))
            .forEach(e => e.removeAttribute("style"));
    }

    removeNextAndPreviousChapterHyperlinks(webPage, content) {
        util.removeElements(content.querySelectorAll("a[href*='www.royalroadl.com']"));
        RoyalRoadParser.removeOlderChapterNavJunk(content);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.fic-header div.col h1");
    }

    extractAuthor(dom) {
        // Royal Road's redesign removed "div.fic-header h4 span a". The author's
        // /profile/ link still lives in the fiction header; fall back to the
        // books:author meta tag, then the legacy selector, then the base default.
        let headerLink = dom.querySelector("div.fic-header a[href^='/profile/']");
        if ((headerLink != null) && !util.isNullOrEmpty(headerLink.textContent)) {
            return headerLink.textContent.trim();
        }
        let metaAuthor = dom.querySelector("meta[property='books:author']")?.getAttribute("content");
        if (!util.isNullOrEmpty(metaAuthor)) {
            return metaAuthor.trim();
        }
        let legacy = dom.querySelector("div.fic-header h4 span a");
        return legacy?.textContent?.trim() ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let meta = RoyalRoadParser.lastBookMeta;
        if ((meta != null) && (0 < meta.genres.length)) {
            return meta.genres.join(", ");
        }
        let labels = [...dom.querySelectorAll("a.fiction-tag, a[href*='tagsAdd='], div.fiction-info span.tags .label")]
            .map(e => e.textContent.trim())
            .filter(t => !util.isNullOrEmpty(t));
        return [...new Set(labels)].join(", ");
    }

    extractDescription(dom) {
        let meta = RoyalRoadParser.lastBookMeta;
        if ((meta != null) && !util.isNullOrEmpty(meta.description)) {
            return meta.description;
        }
        let desc = dom.querySelector("div.fiction-info div.description");
        if ((desc != null) && !util.isNullOrEmpty(desc.textContent)) {
            return desc.textContent.trim();
        }
        let og = dom.querySelector("meta[property='og:description'], meta[name='description']")
            ?.getAttribute("content");
        return util.isNullOrEmpty(og) ? "" : og.trim();
    }

    // Capture the book's description + genres from the RAW page html. The sanitized DOM
    // the parser later sees has scripts stripped and, on the redesign, no JSON-LD at all.
    // Prefer JSON-LD when present; otherwise locate the full description in the body by
    // matching the og:description as a needle (the redesign's classes are unstable).
    static extractBookMeta(html) {
        let doc = new DOMParser().parseFromString(html, "text/html");
        let jsonld = RoyalRoadParser.extractBookInfo(html);
        let description = null;
        let descriptionHtml = null;
        if ((jsonld != null) && !util.isNullOrEmpty(jsonld.description)) {
            descriptionHtml = jsonld.description;
            let holder = doc.createElement("div");
            holder.innerHTML = jsonld.description;
            description = holder.textContent.replace(/\s+/g, " ").trim();
        } else {
            let og = doc.querySelector("meta[property='og:description'], meta[name='description']")
                ?.getAttribute("content") ?? "";
            let el = RoyalRoadParser.findDescriptionElement(doc, og);
            if (el != null) {
                descriptionHtml = el.innerHTML;
                description = el.textContent.replace(/\s+/g, " ").trim();
            } else if (!util.isNullOrEmpty(og)) {
                description = og.trim();
            }
        }
        // Redesign links each genre/tag to /fictions/search?tagsAdd=...; the legacy
        // markup used a.fiction-tag.
        let genres = [...doc.querySelectorAll("a.fiction-tag, a[href*='tagsAdd=']")]
            .map(a => a.textContent.trim())
            .filter(t => !util.isNullOrEmpty(t));
        if ((genres.length === 0) && Array.isArray(jsonld?.genre)) {
            genres = jsonld.genre.map(g => {
                let match = ("" + g).match(/genre=([^&]+)/);
                return match ? match[1].replace(/_/g, " ") : ("" + g);
            });
        }
        return { description: description, descriptionHtml: descriptionHtml, genres: [...new Set(genres)] };
    }

    // Locate the element holding the full description by matching the (truncated)
    // og:description as a needle: the smallest element whose text starts the same way but
    // is longer than the meta value.
    static findDescriptionElement(doc, og) {
        if (util.isNullOrEmpty(og)) {
            return null;
        }
        let needle = og.replace(/\s+/g, " ").trim().slice(0, 20);
        if (needle.length === 0) {
            return null;
        }
        let best = null;
        let bestLen = 0;
        for (let el of doc.querySelectorAll("div, section, article")) {
            let text = (el.textContent || "").replace(/\s+/g, " ").trim();
            if ((og.length < text.length) && text.includes(needle)) {
                if ((best === null) || (text.length < bestLen)) {
                    best = el;
                    bestLen = text.length;
                }
            }
        }
        return best;
    }

    // Extract the JSON-LD Book object from a raw HTML string (scripts intact).
    static extractBookInfo(html) {
        let regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            try {
                let data = JSON.parse(match[1].trim());
                if (data && (data["@type"] === "Book")) {
                    return data;
                }
            } catch (err) {
                // ignore malformed JSON-LD block
            }
        }
        return null;
    }

    static appendInfoLine(dom, nodes, label, value) {
        if (!util.isNullOrEmpty(value)) {
            let p = dom.createElement("p");
            let b = dom.createElement("b");
            b.textContent = label + ": ";
            p.appendChild(b);
            p.appendChild(dom.createTextNode(value));
            nodes.push(p);
        }
    }

    findChapterTitle(dom, webPage) {
        // Royal Road's redesign adds unrelated <h1>s to the page (e.g. a
        // "Give Reputation to User" widget), so grabbing the first h1 yields the wrong
        // chapter title. Prefer the authoritative title from the chapter list
        // (window.chapters, carried on webPage.title); fall back to an h1/h2 for
        // legacy pages.
        if (!util.isNullOrEmpty(webPage?.title) && (webPage.title !== "[placeholder]")) {
            return webPage.title;
        }
        return dom.querySelector("h1") ||
            dom.querySelector("h2");
    }

    static removeOlderChapterNavJunk(content) {
        // some older chapters have next chapter & previous chapter links seperated by string "<-->"
        for (let node of util.iterateElements(content, 
            n => (n.textContent.trim() === "<-->"),
            NodeFilter.SHOW_TEXT)) {
            node.remove();
        }
    }

    findCoverImageUrl(dom) {
        // Royal Road's redesign changed the cover element; the stable source is the
        // og:image / twitter:image meta (RR points both at the cover). Fall back to the
        // legacy img.thumbnail / img[data-type="cover"].
        let ogImage = dom.querySelector("meta[property='og:image'], meta[name='twitter:image']")
            ?.getAttribute("content");
        if (!util.isNullOrEmpty(ogImage)) {
            return ogImage;
        }
        return dom.querySelector("img.thumbnail, img[data-type='cover']")?.src ?? null;
    }

    removeImgTagsWithNoSrc(webPageDom) {
        [...webPageDom.querySelectorAll("img")]
            .filter(i => util.isNullOrEmpty(i.src))
            .forEach(i => i.remove());
    }

    getInformationEpubItemChildNodes(dom) {
        // Royal Road's redesign removed div.fic-title / div.fiction-info portlets, so the
        // old scrape yielded an almost-empty info page. Build it from stable metadata
        // (author, genres, the og:description blurb); fall back to the legacy nodes.
        let nodes = [];
        let bookTitle = this.extractTitle(dom);
        if (!util.isNullOrEmpty(bookTitle)) {
            let titleHeading = dom.createElement("h1");
            titleHeading.textContent = bookTitle;
            nodes.push(titleHeading);
        }
        RoyalRoadParser.appendInfoLine(dom, nodes, "Author", this.extractAuthor(dom));
        RoyalRoadParser.appendInfoLine(dom, nodes, "Genres", this.extractSubject(dom));
        let heading = dom.createElement("h2");
        heading.textContent = "Description";
        let descriptionHtml = RoyalRoadParser.lastBookMeta?.descriptionHtml;
        if (!util.isNullOrEmpty(descriptionHtml)) {
            // Full description captured from the raw page, keeping its paragraph
            // formatting (sanitized downstream by populateInfoDiv).
            nodes.push(heading);
            let descDiv = dom.createElement("div");
            descDiv.innerHTML = descriptionHtml;
            nodes.push(descDiv);
        } else {
            let text = this.extractDescription(dom);
            if (!util.isNullOrEmpty(text)) {
                nodes.push(heading);
                for (let para of text.split("\n").map(s => s.trim()).filter(s => 0 < s.length)) {
                    let p = dom.createElement("p");
                    p.textContent = para;
                    nodes.push(p);
                }
            }
        }
        if (0 < nodes.length) {
            return nodes;
        }
        // legacy fallback
        return [...dom.querySelectorAll("div.fic-title, div.fiction-info div.portlet.row")];
    }
}
