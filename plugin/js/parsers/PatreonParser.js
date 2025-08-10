"use strict";

parserFactory.register("patreon.com", () => new PatreonParser());

class PatreonParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        if (this.isCollectionList()) {
            return this.getCollectionLinks(dom);
        }
        let cards = [...dom.querySelectorAll("div[data-tag='post-card']")];
        return cards
            .filter(c => this.hasAccessableContent(c))
            .map(s => this.cardToChapter(s)).reverse();
    }

    getCollectionLinks(dom) {
        return [...dom.querySelectorAll("a[href*='posts/']")]
            .filter((a) => a.querySelector("h3") != null)
            .map(util.hyperLinkToChapter)
            .reverse();
    }

    cardToChapter(card) {
        let title = card.querySelector("span[data-tag='post-title']").textContent;
        let link = this.getUrlOfContent(card);
        return ({
            title: title.trim(),
            sourceUrl:  link.href
        });
    }

    hasAccessableContent(card) {
        let link = this.getUrlOfContent(card);
        return !util.isNullOrEmpty(link?.getAttribute("href"));
    }
 
    getUrlOfContent(card) {
        return card.querySelector("a[data-tag='post-published-at']");
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    async fetchChapter(url) {
        let xhr = await HttpClient.wrapFetch(url);
        let script = xhr.responseXML.querySelector("script#__NEXT_DATA__").textContent;
        let json = JSON.parse(script);
        let envelope = json.props.pageProps.bootstrapEnvelope;
        let bootstrap = envelope.bootstrap || envelope.pageBootstrap;
        return this.jsonToHtml(bootstrap.post.data.attributes, url);
    }

    jsonToHtml(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.title;
        newDoc.content.appendChild(header);
        if (json.image) {
            let img = new Image();
            img.src = json.image.url;
            newDoc.content.append(img);
        }
        let content =  "<div>" + json.content + "</div>";
        content = util.sanitize(content)
            .querySelector("div");
        newDoc.content.append(content);
        return newDoc.dom;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1").textContent + " Patreon"  ;
    }

    extractAuthor(dom) {
        if (this.isCollectionList()) {
            return this.extractCollectionAuthor(dom);
        }
        let authorLabel = dom.querySelector("h1");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    extractCollectionAuthor(dom) {
        let title = dom.querySelector("h1");
        let parent = title.parentNode;
        while (parent.querySelector("a") == null) {
            parent = parent.parentNode;
        }
        return parent.querySelector("a")?.textContent ?? "Not Found";
    }

    findCoverImageUrl(dom) {
        if (this.isCollectionList()) {
            return this.extractCollectionCover(dom);
        }
        return util.getFirstImgSrc(dom, "picture");
    }


    extractCollectionCover(dom) {
        let divsWithPicutres = dom.querySelectorAll("div[src]");
        if (divsWithPicutres.length == 0) {
            return null;
        }
        return divsWithPicutres[divsWithPicutres.length - 1].getAttribute("src");
    }

    isCollectionList() {
        return this.state.chapterListUrl?.indexOf("collection") != -1;
    }
}
