"use strict";

parserFactory.register("chrysanthemumgarden.com", () => new ChrysanthemumgardenParser());

class ChrysanthemumgardenParser extends WordpressBaseParser{
    constructor() {
        super();
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
            for(let n of notes) {
                content.appendChild(n);
            }
        }
        util.resolveLazyLoadedImages(webPageDom, "img.br-lazy", "data-breeze");
    }

    static getInputValue(form, selector) {
        return form.querySelector("input" + selector).getAttribute("value");
    }
}
