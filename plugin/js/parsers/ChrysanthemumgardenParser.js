"use strict";
parserFactory.registerManualSelect("Chrysanthemumgarden", () => new ChrysanthemumgardenParser());
parserFactory.register("chrysanthemumgarden.com", () => new ChrysanthemumgardenParser());

class ChrysanthemumgardenParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
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

    // Mapeo de caracteres basado en DeJumCG
    static dejumMapping = {
        "A": "J", "B": "K", "C": "A", "D": "B", "E": "R", "F": "U", "G": "D", "H": "Q", "I": "Z", "J": "C",
        "K": "T", "L": "H", "M": "F", "N": "V", "O": "L", "P": "I", "Q": "W", "R": "N", "S": "E", "T": "Y",
        "U": "P", "V": "S", "W": "X", "X": "G", "Y": "O", "Z": "M",
        "a": "t", "b": "o", "c": "n", "d": "q", "e": "u", "f": "e", "g": "r", "h": "z", "i": "l", "j": "a",
        "k": "w", "l": "i", "m": "c", "n": "v", "o": "f", "p": "j", "q": "p", "r": "s", "s": "y", "t": "h",
        "u": "g", "v": "d", "w": "m", "x": "k", "y": "b", "z": "x"
    };

    // Función para descifrar el texto
    static dejumText(text) {
        return text.split("").map(char => ChrysanthemumgardenParser.dejumMapping[char] || char).join("");
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        let jumbledElements = webPageDom.querySelectorAll("span.jum"); 
        jumbledElements.forEach(element => {
            let originalText = element.textContent;
            let decodedText = ChrysanthemumgardenParser.dejumText(originalText);
            element.textContent = decodedText;
        });

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