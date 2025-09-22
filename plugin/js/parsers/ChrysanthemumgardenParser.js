"use strict";

parserFactory.register("chrysanthemumgarden.com", () => new ChrysanthemumgardenParser());

class ChrysanthemumgardenParser extends WordpressBaseParser {
    constructor() {
        super();
        this.usedfonts = new Set();
    }

    populateUIImpl() {
        document.getElementById("passwordRow").hidden = false;
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    async fetchChapter(url) {
        let newDom = (await HttpClient.wrapFetch(url)).responseXML;
        let passwordForm = ChrysanthemumgardenParser.getPasswordForm(newDom);
        if (passwordForm) {
            let formData = ChrysanthemumgardenParser.makePasswordFormData(passwordForm);
            let options = {
                method: "POST",
                credentials: "include",
                body: formData
            };
            newDom = (await HttpClient.wrapFetch(url, {fetchOptions: options})).responseXML;
        }
        return newDom;
    }

    async fetchWebPageContent(webPage) {
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_SLEEPING);
        await this.rateLimitDelay();
        ChapterUrlsUI.showDownloadState(webPage.row, ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING);
        let pageParser = webPage.parser;
        try {
            let webPageDom = await pageParser.fetchChapter(webPage.sourceUrl);
            delete webPage.error;
            webPage.rawDom = webPageDom;
            pageParser.preprocessRawDom(webPageDom);
            pageParser.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
            let content = pageParser.findContent(webPage.rawDom);
            if (content == null) {
                let errorMsg = UIText.Error.errorContentNotFound(webPage.sourceUrl);
                throw new Error(errorMsg);
            }
            //get fonts from content
            let allnodes = [...content.querySelectorAll("p, span")];
            let regex = new RegExp(".+style=\"font-family: ([a-zA-Z]+);\".+");
            allnodes = allnodes.map(a => a.innerHTML);
            allnodes = allnodes.filter(a => a.search(regex) != -1);
            allnodes = allnodes.map(a => a.replace(regex, "$1"));
            for (let i = 0; i < allnodes.length; i++) {
                if (!this.usedfonts.has(allnodes[i])) {
                    this.usedfonts.add(allnodes[i]);
                    let xhr = await HttpClient.wrapFetch("https://chrysanthemumgarden.com/wp-content/plugins/chrys-garden-plugin/resources/fonts/used/"+allnodes[i]+".woff2");
                    let newfont = new FontInfo(allnodes[i]+".woff2");
                    newfont.arraybuffer = xhr.arrayBuffer;
                    this.imageCollector.imagesToPack.push(newfont);
                }
            }

            return pageParser.fetchImagesUsedInDocument(content, webPage);
        } catch (error) {
            if (this.userPreferences.skipChaptersThatFailFetch.value) {
                ErrorLog.log(error);
                webPage.error = error;
            } else {
                webPage.isIncludeable = false;
                throw error;
            }
        }
    }

    static getPasswordForm(dom) {
        return dom.querySelector("form#password-lock");
    }

    static makePasswordFormData(form) {
        let formData = new FormData();
        let password = document.getElementById("passwordInput").value; 
        formData.append("site-pass", password);
        formData.append("nonce-site-pass", ChrysanthemumgardenParser.getInputValue(form, "#nonce-site-pass"));
        formData.append("_wp_http_referer", ChrysanthemumgardenParser.getInputValue(form, "[name='_wp_http_referer']"));
        return formData;
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        if (!this.userPreferences.removeAuthorNotes.value) {
            let notes = [...webPageDom.querySelectorAll("div.tooltip-container")];
            for (let n of notes) {
                content.appendChild(n);
            }
            this.addLinksToFootnotes(webPageDom);
        }
        util.resolveLazyLoadedImages(webPageDom, "img.br-lazy", "data-breeze");
    }

    static getInputValue(form, selector) {
        return form.querySelector("input" + selector).getAttribute("value");
    }

    addLinksToFootnotes(dom) {
        let makeLink = (id) => {
            let link = dom.createElement("a");
            link.href = "#" + id;
            return link;
        };

        let addParent = (newParent, element) => {
            element.replaceWith(newParent);
            newParent.appendChild(element);
        };

        let addIndexToSpan = (span, index) => {
            let sup = dom.createElement("sup");
            sup.textContent = index;
            span.appendChild(sup);
        };

        let addHyperlinkToSpan = (span, id) =>
            addParent(makeLink(id), span);

        let updateSpan = (span, index, id, backRef) => {
            addIndexToSpan(span, index);
            span.id = backRef;
            addHyperlinkToSpan(span, id);
        };

        let addIndexToFootnote = (title, index) =>
            title.prepend(dom.createTextNode(index + " "));

        let addHyperlinkToFootnote = (title, backRef) => {
            let link = makeLink(backRef);
            util.moveChildElements(title, link);
            title.appendChild(link);
        };

        let updateFootnote = (footnote, index, backRef) => {
            let title = footnote.querySelector(".tooltip-title");
            addIndexToFootnote(title, index);
            addHyperlinkToFootnote(title, backRef);
        };

        let spans = [...dom.querySelectorAll("span.tooltip-toggle")];
        let index = 0;
        for (let span of spans) {
            let id = span.getAttribute("tooltip-target");
            let footnote = dom.querySelector("#" + id);
            let backRef = "back-" + id;
            if (id) {
                ++index;
                updateSpan(span, index, id, backRef);
                updateFootnote(footnote, index, backRef);
            }
        }
    }
}