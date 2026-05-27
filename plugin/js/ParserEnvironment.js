"use strict";

class ParserEnvironment { // eslint-disable-line no-unused-vars
    static async ensureLoaded() {
        if (typeof parserFactory !== "undefined" && typeof Parser !== "undefined") {
            return;
        }

        if (!ParserEnvironment.loadPromise) {
            ParserEnvironment.loadPromise = ParserEnvironment.loadFromPopupHtml();
        }
        return ParserEnvironment.loadPromise;
    }

    static async loadFromPopupHtml() {
        let response = await fetch("plugin/popup.html", { credentials: "same-origin" });
        if (!response.ok) {
            throw new Error(`Failed to load parser environment: ${response.status}`);
        }

        let html = await response.text();
        let matches = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
        let scripts = matches
            .filter(ParserEnvironment.shouldLoadScript)
            .map(src => ParserEnvironment.toIndexPath(src));

        for (let scriptSrc of scripts) {
            if (ParserEnvironment.loadedScripts.has(scriptSrc)) {
                continue;
            }
            await ParserEnvironment.injectScript(scriptSrc);
            ParserEnvironment.loadedScripts.add(scriptSrc);
        }
    }

    static shouldLoadScript(src) {
        return src === "js/ParserFactory.js"
            || src === "js/ImageCollector.js"
            || src === "js/Imgur.js"
            || src === "js/ChapterUrlsUI.js"
            || src === "js/DefaultParserUI.js"
            || src === "js/ProgressBar.js"
            || src === "js/Parser.js"
            || src === "js/CoverImageUI.js"
            || src.startsWith("js/parsers/");
    }

    static toIndexPath(src) {
        return src.startsWith("js/") ? `plugin/${src}` : src;
    }

    static injectScript(src) {
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }
}

ParserEnvironment.loadPromise = null;
ParserEnvironment.loadedScripts = new Set();
