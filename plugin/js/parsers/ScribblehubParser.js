"use strict";

parserFactory.register("scribblehub.com", () => new ScribblehubParser());

class ScribblehubParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 5000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let baseUrl = dom.baseURI;
        let nextTocIndex = 1;
        let numChapters = parseInt(dom.querySelector("span.cnt_toc").textContent);
        let nextTocPageUrl = function(_dom, chapters, lastFetch) {
            // site has bug, sometimes, won't return chapters, so 
            // don't loop forever when this happens
            return ((chapters.length < numChapters) && (0 < lastFetch.length))
                ? `${baseUrl}?toc=${++nextTocIndex}`
                : null;
        };
        let saveThrottle = this.minimumThrottle;
        this.minimumThrottle = 0;
        let chapters = (await this.walkTocPages(dom,
            ScribblehubParser.getChapterUrlsFromTocPage,
            nextTocPageUrl,
            chapterUrlsUI
        )).reverse();
        this.minimumThrottle = saveThrottle;
        return chapters;
    }

    static getChapterUrlsFromTocPage(dom) {
        return [...dom.querySelectorAll("a.toc_a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.fic_row, div#chp_raw");
    }

    populateUIImpl() {
        document.getElementById("removeAuthorNotesRow").hidden = false;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.fic_title");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("span.auth_name_fic");
        return (author === null) ? super.extractAuthor(dom) : author.textContent;
    }
    
    extractSubject(dom) {
        let selector = "[property='genre']";
        if (!document.getElementById("lesstagsCheckbox").checked) {
            selector += ", .stag";
        }
        let tags = [...dom.querySelectorAll(selector)];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return this.extractDescriptionInternal(dom)?.innerText?.trim();
    }
    // unwrap the description from the readmore that you may get on mobile
    extractDescriptionInternal(dom) {
        let desc = dom.querySelector(".wi_fic_desc");
        if (desc != null) {
            desc.querySelectorAll(".dots, .morelink").forEach(e => e.remove());
            desc.querySelectorAll(".testhide").forEach(e => e.replaceWith(...e.childNodes));
        }

        return desc;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.chapter-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.fic_image");
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);

        this.tagAuthorNotesBySelector(content, ".wi_authornotes, .wi_news");

        // spoilers
        for (let element of content.querySelectorAll(".sp-wrap")) {
            element.querySelector(".sp-body>.spdiv").remove();

            let details = webPageDom.createElement("details");
            let summary = webPageDom.createElement("summary");
            summary.append(...element.querySelector(".sp-head").childNodes);
            details.append(summary);
            details.append(...element.querySelector(".sp-body").childNodes);

            element.replaceWith(details);
        }

        // anouncements
        for (let element of content.querySelectorAll(".wi_news_title")) {
            element.setAttribute("style", "font-weight: bold");
            element.querySelector(".fa-exclamation-triangle").replaceWith("⚠");
        }

        // author notes
        for (let element of content.querySelectorAll(".p-avatar-wrap")) {
            element.remove();
        }

    }

    getInformationEpubItemChildNodes(dom) {
        function cleanTag(tag, index, array) {
            let out = tag.ownerDocument.createElement("a");
            out.setAttribute("href", tag.getAttribute("href"));
            out.innerText = tag.innerText;
            return index < array.length -1 ? [out, ", "] : [out];
        }

        let info = [];

        info.push(dom.createElement("div").innerHTML = "<p><b>Synopsis</b></p>");
        let synopsis = this.extractDescriptionInternal(dom);
        if (synopsis) {
            info.push(...synopsis.childNodes);
        }

        let genre = dom.querySelectorAll(".wi_fic_genre a.fic_genre");
        if (genre.length > 0) {
            info.push(dom.createElement("div").innerHTML = "<p><b>Genre</b></p>");
            info.push(...[...genre].flatMap(cleanTag));
        }

        let fandom = dom.querySelectorAll(".wi_fic_genre a.stag");
        if (fandom.length > 0) {
            info.push(dom.createElement("div").innerHTML = "<p><b>Fandom</b></p>");
            info.push(...[...fandom].flatMap(cleanTag));
        }

        let tags = dom.querySelectorAll(".wi_fic_showtags a.stag");
        if (tags.length > 0) {
            info.push(dom.createElement("div").innerHTML = "<p><b>Tags</b></p>");
            info.push(...[...tags].flatMap(cleanTag));
        }
  
        return info;
    }
}
