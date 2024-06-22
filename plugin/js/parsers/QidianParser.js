/*
   parses Qidian International site
*/
"use strict";

parserFactory.register("webnovel.com", () => new QidianParser());

class QidianParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = Array.from(dom.querySelectorAll("ul.content-list a"));
        if (links.length === 0) {
            links = Array.from(dom.querySelectorAll("div.volume-item ol a"));
        }
        return links.map(QidianParser.linkToChapter);
    };

    static isLinkLocked(link) {
        let img = link.querySelector("svg > use");
        return (img != null)
            && (img.getAttribute("xlink:href") === "#i-lock");
    }

    static linkToChapter(link) {
        let title = link.textContent;
        let element = link.querySelector("strong");
        if (element !== null) {
            title = element.textContent.trim();
            element = link.querySelector("i");
            if (element !== null) {
                title = element.textContent + ": " + title;
            }
        }
        return {sourceUrl: link.href, title: title, 
            isIncludeable: !QidianParser.isLinkLocked(link)
        };
    }

    findContent(dom) {
        return dom.querySelector("div.chapter_content");
    };

    preprocessRawDom(webPage) {
        let content = this.findContent(webPage);
        if (content !== null) {
            return;
        }
        let json = this.findChapterContentJson(webPage);
        if (json === null) {
            return;
        }
        content = webPage.createElement("div");
        content.className = "chapter_content";
        webPage.body.appendChild(content);
        this.addHeader(webPage, content, json.chapterInfo.chapterName)
        for(let c of json.chapterInfo.contents) {
            this.addParagraph(webPage, content, c.content);
        }
        if (!this.userPreferences.removeAuthorNotes.value) {
            let notes = json.chapterInfo.notes?.note ?? null;
            if (!util.isNullOrEmpty(notes)) {
                let container = this.addNoteContainer(webPage, content);
                this.addHeader(webPage, container, "Notes");
                this.addParagraph(webPage, container, notes);
            }
        }
        for(let e of [...webPage.querySelectorAll("div.j_bottom_comment_area, div.user-links-wrap, div.g_ad_ph")]) {
            e.remove()
        }
    }

    findChapterContentJson(dom) {
        const searchString = "var chapInfo=";
        return [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.startsWith(searchString))
            .map(s => util.locateAndExtractJson(this.fixExcaping(s), searchString))[0];
    } 

    fixExcaping(s) {
        return this.stripBackslash(s)
            .replace(/\n|\r|<\/?p>/g, "");
    }

    addHeader(webPage, content, text) {
        this.addElement(webPage, content, "h3", text);
    }

    addParagraph(webPage, content, text) {
        this.addElement(webPage, content, "p", text);
    }

    addNoteContainer(webPage, content) {
        let container = this.addElement(webPage, content, "div", "");
        this.tagAuthorNotes([container]);
        return container;
    }

    addElement(webPage, content, tag, text) {
        let t = webPage.createElement(tag);
        t.textContent = text;
        content.appendChild(t);
        return t;
    }

    stripBackslash(s) {
        const singleEscapeChars = "\"\\";
        const stripChars = "bfnrtv";
        let temp = "";
        let i = 0;
        while (i < (s.length)) {
            if (s[i] === "\\") {
                ++i;
                if (stripChars.includes(s[i])) {
                    temp += " ";
                }
                else { 
                    if (singleEscapeChars.includes(s[i])) {
                        temp += "\\";
                    }
                    temp += s[i];
                }
            }
            else {
                temp += s[i];
            }
            ++i;
        }
        return temp;
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    // title of the story
    extractTitleImpl(dom) {
        let title = dom.querySelector("div.chapter_content h1");
        return title;
    };

    extractAuthor(dom) {
        return dom.querySelector("a.c_primary")?.textContent ?? super.extractAuthor(dom);
    }
 
    removeUnwantedElementsFromContentElement(content) {
        util.removeChildElementsMatchingCss(content, "form.cha-score, div.cha-bts, pirate, div.cha-content div.user-links-wrap, div.tac");
        this.tagAuthorNotesBySelector(content, "div.m-thou");
        super.removeUnwantedElementsFromContentElement(content);
    }

    findCoverImageUrl(dom) {
        let imgs = [...dom.querySelectorAll("div.det-hd i.g_thumb img")];
        return 0 === imgs.length 
            ? util.getFirstImgSrc(dom, "div.det-hd")
            : imgs.pop().src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div._mn, div.det-abt")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "div._ft, span.g_star");
    }
}
