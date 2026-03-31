"use strict";

parserFactory.register("woopread.com", () => new WoopreadParser());

class WoopreadParser extends Parser {
    constructor() {
        super();
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.text-3xl");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.relative .text-text-secondary")];
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.mb-4:nth-of-type(4) a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.relative");
    }

    async getChapterUrls(dom) {
        const chapterLinks = [...dom.querySelectorAll("main.grow .notranslate .mt-8 .grid-cols-1 a")];
        const chapterTitles = [...dom.querySelectorAll("main.grow .line-clamp-2")];

        let chapterList = [];
        for (let i = 0; i < chapterLinks.length; i++) {
            chapterList.push({
                sourceUrl: chapterLinks[i].href,
                title: chapterTitles[i].textContent,
            });
        }

        return chapterList.reverse();
    }
    
    findChapterTitle(dom) {
        return dom.querySelector("h2.text-2xl");
    }

    findContent(dom) {
        const content = dom.querySelector("div[id^='chapter']");

        if (content) {
            // Remove Text-to-Speech (TTS) play buttons so they don't clutter the
            // EPUB.

            // We target the 'aria-label' instead of visual CSS classes because
            // accessibility tags are much less likely to change during site updates.

            // We also wrap this in a try/catch so that if the site does change, the
            // parser simply skips the cleanup and returns the original text rather
            // than crashing the entire download.
            try {
                const junkButtons = content.querySelectorAll(
                    "button[aria-label^=\"Play from paragraph\"]",
                );

                if (junkButtons && junkButtons.length > 0) {
                    junkButtons.forEach((currentButton) => {
                        if (currentButton !== null) currentButton.remove();
                    });
                }
            } catch (_error) {
                // Push a warning to the extension's UI Error Log instead of the console
                ErrorLog.log(
                    "Woopread warning: Could not clean up Text-to-Speech buttons. The site's layout may have changed.",
                );
            }
        }

        return content;
    }
}
