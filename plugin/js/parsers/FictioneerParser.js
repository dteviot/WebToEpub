"use strict";

// This is for the Fictioneer WordPress theme: https://github.com/Tetrakern/fictioneer

//dead urls
parserFactory.register("blossomtranslation.com", () => new FictioneerParser());
parserFactory.register("igniforge.com", () => new FictioneerParser());
parserFactory.register("razentl.com", () => new FictioneerParser());
//these still exist
parserFactory.register("emberlib731.xyz", () => new FictioneerParser());
parserFactory.register("lilyonthevalley.com", () => new FictioneerParser());
parserFactory.register("novelib.com", () => new FictioneerParser());
parserFactory.register("smeraldogarden.com", () => new FictioneerParser());
parserFactory.register("springofromance.com", () => new FictioneerParser());

parserFactory.registerRule(
    (url, dom) => FictioneerParser.isFictioneerTheme(dom) * 0.7,
    () => new FictioneerParser()
);

class FictioneerParser extends Parser {
    constructor() {
        super();
    }

    static isFictioneerTheme(dom) {
        // the html tag has the class "fictioneer-theme"
        return (dom.querySelector("html.fictioneer-theme") !== null);
    }

    async getChapterUrls(dom) {
        let chapters = [];
        // Put free chapters first
        [...dom.querySelectorAll(".chapter-group__list ._publish a")].map(a => chapters.push(({
            sourceUrl: a.href,
            title: a.textContent,
            isIncludeable: true
        })));
        // Put scheduled chapters after free and don't select them
        [...dom.querySelectorAll("._future a")].map(a => chapters.push(({
            sourceUrl: a.href,
            title: a.textContent,
            isIncludeable: false
        })));

        if (chapters.length === 0) {
            chapters = [...dom.querySelectorAll(".chapter-group__list-item a")]
                .map(a => util.hyperLinkToChapter(a));
        }

        return chapters;
    }

    // the element holding chapter content
    findContent(dom) {
        const content =
            dom.querySelector(".chapter-formatting") ||
            dom.querySelector("#chapter-content");

        const footnotes = dom.querySelector(".chapter__footnotes");
        if (footnotes) { content.appendChild(footnotes); }

        return content;
    }

    // title of the story (not title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector(".story__identity-title");
    }

    extractAuthor(dom) {
        let author =
            dom.querySelector("a.author").textContent ||
            dom.querySelector(".story__identity-meta").textContent;
        // remove "by " from the beginning if it exists
        author = author.replace(/^by /, "");
        return author;
    }

    // story description
    extractDescription(dom) {
        return dom.querySelector(".story__summary").textContent.trim();
    }

    findChapterTitle(dom) {
        // some sites use subtitles and chapter groups and info is lost without them
        let title = dom.querySelector(".chapter__title")?.textContent;
        let subtitle =
            dom.querySelector(".chapter__second-title")?.textContent ||
            dom.querySelector(".chapter__group")?.textContent;
        if (subtitle) { title += ": " + subtitle; }
        return title;
    }

    findCoverImageUrl(dom) {
        let img =
            dom.querySelector(".wp-post-image") ||
            dom.querySelector("figure.story__thumbnail img");

        if (!img?.src) return null;

        // Strip off the arguments for smaller sizes
        let url = img.src;
        const pos = url.indexOf("?");
        return pos !== -1 ? url.substring(0, pos) : url;
    }

    customRawDomToContentStep(chapter, content) {
        content.querySelectorAll("*").forEach(element => {
            if (element.tagName === "P") {
                element.removeAttribute("id");
                element.removeAttribute("data-paragraph-id");
            }
            // remove style attribute if style="font-weight: 400;" - it"s just noise
            if (element.hasAttribute("style") && element.getAttribute("style") === "font-weight: 400;") {
                element.removeAttribute("style");
            }
        });
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("iframe, .eoc-chapter-groups, .chapter-nav, .related-stories-block"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".story__header, .story__summary")];
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll(".story__taxonomies .tag-pill")]);
        return tags.map(t => t.textContent?.trim()).join(", ");
    }
}
