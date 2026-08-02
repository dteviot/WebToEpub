/*
  Parser for https://chyoa.com
  Full recursive branching-story support with nested TOC.

  Architecture note
  -----------------
  CHYOA is a "Choose Your Own Adventure" site – stories are *trees*, not lists.
*/
"use strict";

parserFactory.register("chyoa.com", () => new ChyoaParser());

// ---------------------------------------------------------------------------
// ChyoaEpubItem
// A custom EpubItem that carries a tree-depth for the nested TOC.
// ---------------------------------------------------------------------------
class ChyoaEpubItem extends EpubItem {
    /**
     * @param {string}  sourceUrl
     * @param {string}  title       Chapter title (shown in TOC)
     * @param {number}  index       Epub item index (determines filename)
     * @param {number}  tocDepth    Nesting level: 0 = root, 1 = first branch, …
     * @param {Node[]}  nodes       Array of DOM nodes to write into the XHTML file
     */
    constructor(chapter, content, index ) {
        super(chapter.sourceUrl);
        super.setIndex(index);
        this.nodes = Array.from(content.childNodes);
        this.chapterTitle = chapter.title;
        this.tocDepth = chapter.newArc;
    }

    // EpubItem.chapterInfo() is what EpubPacker iterates to build toc.ncx / nav.
    *chapterInfo() {
        if (this.chapterTitle) {
            yield {
                depth: this.tocDepth,
                title: this.chapterTitle,
                src:   this.getZipHref()
            };
        }
    }
}

class ChyoaParser extends Parser {
    constructor() {
        super();
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
    }
    
    async getChapterUrls(dom, chapterUrlsUI) {
        let tokenrsp = (await HttpClient.fetchJson("https://chyoa.com/csrf-token")).json;
        let token = tokenrsp.data.csrf_token;
        let options = {
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "x-csrf-token": token,
                "x-requested-with": "XMLHttpRequest",
                "sec-fetch-site": "same-origin"
            }
        };
        let basemapurl = new URL([...dom.querySelectorAll("a")].filter(a => a.href.includes("/map?chapter="))[0].href);
        let basemaphref = basemapurl.origin + basemapurl.pathname;
        let resp = (await HttpClient.fetchJson(basemaphref + ".json?collapse_default=0&collapsed=&display_offset=0&expanded=", options)).json;
        let ChapterArray = this.reponseToToc(resp);
        chapterUrlsUI.showTocProgress(ChapterArray);
        let nextOffset = resp.data.nextOffset;
        while (resp.data.hasMorePages == true) {
            await this.rateLimitDelay();
            resp = (await HttpClient.fetchJson(basemaphref + ".json?collapse_default=0&collapsed=&display_offset="+nextOffset+"&expanded=", options)).json;
            let partialList = this.reponseToToc(resp);
            chapterUrlsUI.showTocProgress(partialList);
            ChapterArray = ChapterArray.concat(partialList);
            nextOffset = resp.data.nextOffset;
        }
        return ChapterArray;
    }

    reponseToToc(resp) {
        return resp.data.chapters.map(a => ({
            sourceUrl: a.url, 
            title: (document.getElementById("removeChapterNumberCheckbox").checked)?a.title:a.position+" "+a.title, 
            newArc: a.page | 0
        }));
    }

    webPageToEpubItems(webPage, epubItemIndex) {
        let content = this.convertRawDomToContent(webPage);
        let items = [];
        if (content != null) {
            items.push(new ChyoaEpubItem(webPage, content, epubItemIndex));
        }
        return items;
    }

    async fetchChapter(url) {
        return this.buildChapter(await super.fetchChapter(url), url);
    }

    buildChapter(dom, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = dom.querySelector(".chapter>header>h1")?.textContent??"";
        newDoc.content.appendChild(title);
        let maincontent = (dom.querySelector("div.chapter-content") || dom.querySelector("div.layout-content-wrapper"));
        let question = dom.querySelector("section.question");
        util.removeChildElementsMatchingSelector(question,"div.rd-story-navigation, li.dropdown");
        util.moveChildElements(maincontent, newDoc.content);
        util.moveChildElements(question, newDoc.content);
        return newDoc.dom;
    }

    extractTitleImpl(dom) {
        // Story root has <header class="story-header"><h1>…</h1>
        let h1 = dom.querySelector("header.story-header h1");
        if (h1) return h1.textContent.trim();
        return Parser.extractTitleDefault(dom);
    }

    extractAuthor(dom) {
        // Author link is inside <p class="meta"><a …>AuthorName</a>
        let a = dom.querySelector("p.meta a");
        if (a) return a.textContent.trim();
        return "<unknown>";
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.cover img");
        return img ? img.src : null;
    }

    // =========================================================================
    // Cleanup
    // =========================================================================
    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(
            element,
            "footer, div.chyoa-adzone, div.ratings, div.links, nav, script, noscript, input, button"
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    /**
     * For CHYOA we must NOT strip the choice links that appear in content –
     * they ARE the story navigation. Override to do nothing.
     */
    removeNextAndPreviousChapterHyperlinks() {
        // intentionally empty
    }
}
