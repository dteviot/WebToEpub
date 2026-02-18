"use strict";

parserFactory.register("patreon.com", () => new PatreonParser());

class PatreonParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        if (this.isCollectionList(dom)) {
            return this.getCollectionLinks(dom);
        }
        let cards = [...dom.querySelectorAll("div[data-tag='post-card']")];
        return cards
            .filter(c => this.hasAccessableContent(c))
            .map(s => this.cardToChapter(s)).reverse();
    }

    getCollectionLinks(dom) {
        let getTitle = (e) => {
            return [...e.querySelectorAll("span.cm-ugDCiy")]
                .map(s => s.textContent.trim())
                .join(" ");
        };

        if (this.isCondensedView(dom))
        {
            let getLink = (e) => {
                return e.querySelector("a");
            };
            let linksContainer = [...dom.querySelectorAll("div.cm-hhCVrV.cm-WzHHbB div:not([class])")];
            return linksContainer.map(linkContainer => {
                return {
                    sourceUrl: getLink(linkContainer).href,
                    title: getTitle(linkContainer),
                };
            });
        }
        
        let links = [...dom.querySelectorAll("a.cm-XHOpxu")];
        return links.map(link => ({
            sourceUrl: link.href,
            title: getTitle(link),
        }));
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
        let content;
        if (json.content)
        {
            content =  "<div>" + json.content + "</div>";
        }
        else if (json.content_json_string)
        {
            const tiptapToHtml = (node) => {
                if (!node) return "";

                // 1. Handle Text Nodes with Marks (Bold, Italic)
                if (node.type === "text") {
                    let text = node.text;
                    if (node.marks) {
                        node.marks.forEach(mark => {
                            if (mark.type === "bold") text = `<strong>${text}</strong>`;
                            if (mark.type === "italic") text = `<em>${text}</em>`;
                        });
                    }
                    return text;
                }

                // 2. Map Content of Parent Nodes
                const htmlContent = node.content 
                    ? node.content.map(child => tiptapToHtml(child)).join("") 
                    : "";

                // 3. Handle Block Types
                switch (node.type) {
                    case "doc":
                        return `<div class="content-body">${htmlContent}</div>`;
                    
                    case "paragraph": {
                        // Handle the custom "nodeTextAlignment" found in your source
                        let style = node.attrs?.nodeTextAlignment 
                            ? ` style='text-align: ${node.attrs.nodeTextAlignment}'` 
                            : "";
                        return `<p${style}>${htmlContent || "&nbsp;"}</p>`;
                    }

                    case "hardBreak":
                        return "<br />";

                    default:
                        return htmlContent;
                }
            };
            content = tiptapToHtml(JSON.parse(json.content_json_string));
        }
        content = util.sanitize(content)
            .querySelector("div");
        newDoc.content.append(content);
        return newDoc.dom;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1").textContent + " Patreon"  ;
    }

    extractAuthor(dom) {
        if (this.isCollectionList(dom)) {
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
        if (this.isCollectionList(dom)) {
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

    isCollectionList(dom) {
        return new URL(dom.baseURI).pathname.startsWith("/collection/");
    }

    isCondensedView(dom) {
        let url = new URL(dom.baseURI);
        return url.searchParams.get("view") === "condensed";
    }
}
