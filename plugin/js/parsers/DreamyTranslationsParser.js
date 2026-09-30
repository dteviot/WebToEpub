"use strict";

parserFactory.register("dreamy-translations.com", () => new DreamyTranslationsParser());

class DreamyTranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("a")]
            .filter(a => a.href && a.href.includes("/chapter/") && a.hasAttribute("data-chapter-index"));
            
        let chapters = links.map(a => {
            let title = "";
            let chNumSpan = a.querySelector("span.font-medium");
            let titleP = a.querySelector("p.truncate");
            
            if (chNumSpan && titleP) {
                title = chNumSpan.textContent.trim() + " - " + titleP.textContent.trim();
            } else {
                title = a.textContent.trim();
            }
            
            return {
                sourceUrl: a.href,
                title: title
            };
        });
        
        return chapters;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img[src*='/covers/']");
        if (img) {
            return img.src;
        }
        return super.findCoverImageUrl(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        // Do NOT remove sup.tl-note — those are footnote markers we want to keep
        super.removeUnwantedElementsFromContentElement(element);
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("button.text-2xl span > span");
    }

    customRawDomToContentStep(chapter, content) {
        if (content == null) {
            return;
        }
        this.addTranslatorNotes(chapter, content);
    }

    addTranslatorNotes(chapter, content) {
        let dom = chapter.rawDom;

        // Find the Translator's Notes section by looking for the heading text
        let notesSection = null;
        let h3Elements = [...dom.querySelectorAll("h3")];
        for (let h3 of h3Elements) {
            if (h3.textContent.trim() === "Translator's Notes") {
                notesSection = h3.closest("div.glass, div.rounded-xl");
                break;
            }
        }

        if (notesSection == null) {
            return;
        }

        // Extract individual notes
        let noteItems = [...notesSection.querySelectorAll("div.flex.gap-3.text-sm")];
        if (noteItems.length === 0) {
            return;
        }

        // Build a clean footnotes section
        let hr = dom.createElement("hr");
        content.appendChild(hr);

        let header = dom.createElement("h3");
        header.textContent = "Translator's Notes";
        content.appendChild(header);

        let ol = dom.createElement("ol");
        for (let noteItem of noteItems) {
            let li = dom.createElement("li");

            // The note number is in the first child div (the circle badge)
            let numberDiv = noteItem.querySelector("div.flex-shrink-0");
            let noteId = numberDiv ? numberDiv.textContent.trim() : "";

            // The context line is in div.font-medium
            let contextDiv = noteItem.querySelector("div.font-medium");
            // The explanation is in div.opacity-70
            let explanationDiv = noteItem.querySelector("div.opacity-70");

            if (contextDiv) {
                let strong = dom.createElement("strong");
                strong.textContent = contextDiv.textContent.trim();
                li.appendChild(strong);
            }

            if (contextDiv && explanationDiv) {
                li.appendChild(dom.createTextNode(" — "));
            }

            if (explanationDiv) {
                li.appendChild(dom.createTextNode(explanationDiv.textContent.trim()));
            }

            // Set a value attribute matching the note number for proper ordered list numbering
            if (noteId) {
                li.setAttribute("value", noteId);
            }

            ol.appendChild(li);
        }
        content.appendChild(ol);
    }
}
