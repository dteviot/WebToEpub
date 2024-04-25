"use strict";

parserFactory.register("patreon.com", () => new PatreonParser());

class PatreonParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let cards = [...dom.querySelectorAll("div[data-tag='all-posts-layout'] div[data-tag='post-card'] ")]
        return cards
            .filter(c => this.hasAccessableContent(c))
            .map(s => this.cardToChapter(s)).reverse();
    }

    cardToChapter(card) {
        let title = card.querySelector("span[data-tag='post-title']").textContent;
        let link = card.querySelector("div.iorWWT a");
        return ({
            title: title.trim(),
            sourceUrl:  link.href
        });
    }

    hasAccessableContent(card) {
        return card.querySelector("div.iorWWT a") != null;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    async fetchChapter(url) {
        let xhr = await HttpClient.wrapFetch(url);
        let script = xhr.responseXML.querySelector("script#__NEXT_DATA__").textContent;
        let json = JSON.parse(script);
        json = json.props.pageProps.bootstrapEnvelope.bootstrap.post.data.attributes;
        return this.jsonToHtml(json, url);
    }

    jsonToHtml(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.title;
        newDoc.content.appendChild(header);
        let content =  "<div>" + json.content + "</div>"
        content = new DOMParser().parseFromString(content, "text/html")
            .querySelector("div");
        newDoc.content.append(content);
        return newDoc.dom;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1").textContent + " Patreon"  ;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h1");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "picture");
    }
}
