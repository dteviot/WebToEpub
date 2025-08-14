class FootnoteExtractor { // eslint-disable-line no-unused-vars
    scriptElementsToFootnotes(dom) {
        let indexedFootnotes = new Map();
        [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes("toolTips('.classtoolTips"))
            .forEach(s => indexedFootnotes.set(this.getId(s), this.extractFootnoteText(s)));

        return this.getIdsUsedOnPage(dom)
            .map(id => this.makeSpan(indexedFootnotes.get(id), dom));
    }

    getIdsUsedOnPage(dom) {
        let extractId = (span) => [...span.classList]
            .filter(s => s.startsWith("class"))[0];

        return [...dom.querySelectorAll("span.tooltipsall")]
            .map(extractId);
    }

    getId(script) {
        return this.extractSubstring(script, "toolTips('.", ",").replace("'", "");
    }

    makeSpan(content, dom) {
        let span = dom.createElement("span");
        span.textContent = content;
        return span;
    }

    extractFootnoteText(content) {
        return this.extractSubstring(content, "tt_store_content = \"", "\"; toolTips('");
    }

    extractSubstring(content, startTag, endTag) {
        content = content.substring(content.indexOf(startTag) + startTag.length);
        return content.substring(0, content.indexOf(endTag));
    }
}
