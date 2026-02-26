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
            return [...e.querySelectorAll("span.LineClamp-module__N_eOMG__lineClamp1")]
                .map(s => s.textContent.trim())
                .join(" ");
        };

        if (this.isCondensedView(dom))
        {
            let getLink = (e) => {
                return e.querySelector("a");
            };
            // The SVG check skips all locked chapters.
            let linksContainer = [...dom.querySelectorAll("div.ListPost-module__d2AM5a__listPost:not(:has(svg[data-tag='IconLock']))")];
            return linksContainer.map(linkContainer => {
                return {
                    sourceUrl: getLink(linkContainer).href,
                    title: getTitle(linkContainer),
                };
            });
        }
        
        // The SVG check skips all locked chapters.
        let links = [...dom.querySelectorAll("a.CollectionPostList-module__IhO0fW__gridCard:not(:has(svg[data-tag='IconLock']))")];
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
                if (!node) return null;

                // 1. Handle Text Nodes (Returns a Text Node or Span)
                if (node.type === "text") {
                    let root;
                    if (node.marks) {
                        // If there are marks, we build them nested
                        root = document.createElement("span");
                        let current = root;
                        node.marks.forEach(mark => {
                            let wrapper;
                            switch (mark.type) {
                                case "bold":
                                    wrapper = document.createElement("strong");
                                    break;
                                case "italic":
                                    wrapper = document.createElement("em");
                                    break;
                                case "underline":
                                    wrapper = document.createElement("u");
                                    break;
                                case "link":
                                    wrapper = document.createElement("a");
                                    wrapper.href = mark.attrs.href;
                                    wrapper.target = mark.attrs.target;
                                    break;
                                default:
                                    wrapper = document.createElement("span");
                                    console.error(`Unsupported mark type: "${mark.type}"`);
                            }
                            current.appendChild(wrapper);
                            current = wrapper;
                        });
                        current.textContent = node.text; // Safety here
                        return root;
                    } else {
                        // No marks? Just return a plain text node
                        return document.createTextNode(node.text);
                    }
                }

                // 2. Handle Block Types
                let element;
                switch (node.type) {
                    case "doc":
                        element = document.createElement("div");
                        element.className = "content-body";
                        break;

                    case "paragraph":
                        element = document.createElement("p");
                        if (node.attrs?.nodeTextAlignment) {
                            element.style.textAlign = node.attrs.nodeTextAlignment;
                        }
                        break;

                    case "heading": 
                        element = document.createElement(`h${node.attrs.level || 3}`);
                        break;

                    case "bulletList":
                        element = document.createElement("ul");
                        break;
                    
                    case "orderedList":
                        element = document.createElement("ol");
                        break;

                    case "listItem":
                        element = document.createElement("li");
                        break;

                    case "image": 
                        element = document.createElement("img");
                        element.src = node.attrs.src;
                        element.alt = node.attrs.alt || "";
                        return element; // Images don't have children

                    case "blockquote":
                        element = document.createElement("blockquote");
                        break;
                    
                    case "codeBlock": {
                        let pre = document.createElement("pre");
                        element = document.createElement("code");
                        pre.appendChild(element);

                        if (node.content) {
                            node.content.forEach(childNode => {
                                const child = tiptapToHtml(childNode);
                                if (child) element.appendChild(child);
                            });
                        }
                        return pre;
                    }
                    case "hardBreak":
                        return document.createElement("br");

                    default:
                        element = document.createElement("span");
                        break;
                }

                // 3. Recursive Step: Append children as actual DOM Nodes
                if (node.content) {
                    node.content.forEach(childNode => {
                        const childElement = tiptapToHtml(childNode);
                        if (childElement) {
                            element.appendChild(childElement);
                        }
                    });
                } else if (node.type !== "image" && node.type !== "hardBreak") {
                    // Handle empty blocks with a non-breaking space
                    element.textContent = "\u00A0";
                }

                return element;
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
