"use strict";

parserFactory.register("ranobelib.me", () => new RanobelibParser());
parserFactory.register("api.cdnlibs.org", () => new RanobelibParser());

class RanobelibParser extends Parser {
    constructor() {
        super();
        this.homedom = "";
        this.minimumThrottle = 1500;
    }

    async getChapterUrls() {
        const baseChapterUrl = `${this.baseApiUrl}/chapter`;
        const json = await this.getJsonWithChapters();
        return json.data.map(d => this.jsonChaptersDataToChapters(d, baseChapterUrl));
    }

    async loadEpubMetaInfo(dom) {
        const base = new URL(dom.baseURI);
        this.tip = base.pathname.split("/").pop();
        this.baseApiUrl = `https://api.cdnlibs.org/api/manga/${this.tip}`;

        await this.applyRules();
        this.metadataJson = await this.loadMetadata();

        this.homedom = dom;
        return;
    }

    async getJsonWithChapters() {
        const url = `${this.baseApiUrl}/chapters`;
        const response = await HttpClient.fetchJson(url, null);
        return response.json;
    }

    jsonChaptersDataToChapters(data, base) {
        let name = data.name;
        if (!util.isNullOrEmpty(name)) {
            name = " - " + name;
        }
        return ({
            sourceUrl: `${base}?number=${data.number}&volume=${data.volume}`,
            title: `Том ${data.volume} Глава ${data.number}${name}`
        });
    }

    async fetchChapter(url) {
        const json = (await HttpClient.fetchJson(url, null)).json;
        return this.jsonDataToHtml(json.data, url);
    }

    jsonDataToHtml(data) {
        let newDoc = Parser.makeEmptyDocForContent();
        this.appendElement(newDoc, "h1", data.name);

        if (!data.content) return newDoc.dom;

        if (typeof data.content === "string") {
            this.appendHtml(newDoc, data.content);
            return newDoc.dom;
        }

        for (let node of data.content.content) {
            switch (node.type) {
                case "heading":
                    this.appendElement(newDoc, "h3", this.getText(node));
                    break;

                case "paragraph": {
                    const isBold = node.content?.some(item =>
                        item.marks?.some(mark =>
                            mark.type === "bold"
                        )
                    );
                    const tag = isBold ? "b" : "p";
                    this.appendElement(newDoc, tag, this.getText(node));
                    break;
                }

                case "horizontalRule":
                    this.appendElement(newDoc, "hr", "");
                    break;

                case "blockquote": {
                    let bq = newDoc.dom.createElement("blockquote");
                    if (node.content) {
                        for (let item of node.content) {
                            let p = newDoc.dom.createElement("p");
                            p.textContent = this.getText(item);
                            bq.appendChild(p);
                        }
                    }
                    newDoc.content.appendChild(bq);
                    break;
                }
            }
        }
        return newDoc.dom;
    }

    getText(node) {
        if (!node.content) return node.text || "";
        return node.content.map(item => item.text || "").join("");
    }

    appendElement(newDoc, tag, text) {
        let element = newDoc.dom.createElement(tag);
        element.textContent = text;
        newDoc.content.appendChild(element);
    }

    appendHtml(newDoc, html) {
        let rawDom = util.sanitize("<div id=\"raw\">" + html + "</div>");
        let div = rawDom.querySelector("div#raw");
        util.moveChildElements(div, newDoc.content);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    async loadMetadata() {
        return (await HttpClient.fetchJson(this.baseApiUrl, null)).json;
    }

    async applyRules() {
        const rules =  this.generateRules(["https://cover.imglib.info", "https://api.cdnlibs.org", "https://ranobelib.me"]);
        await HttpClient.setDeclarativeNetRequestRules(rules);
    }

    generateRules(filters) {
        let rules = [];
        for (let [i, filter] of filters.entries()) {
            rules.push({
                "id": i + 1,
                "priority": i + 1,
                "action": {
                    "type": "modifyHeaders",
                    "requestHeaders": [
                        {
                            "header": "referer",
                            "operation": "set",
                            "value": "https://ranobelib.me/"
                        }, {
                            "header": "site-id",
                            "operation": "set",
                            "value": "3"
                        }
                    ]
                },
                "condition": {
                    "urlFilter": filter
                }
            });
        }
        return rules;
    }

    findCoverImageUrl() {
        return this.metadataJson.data.cover.default;
    }
}
