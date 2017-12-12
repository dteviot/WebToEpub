/*
  Parser for www.wattpad.com
*/
"use strict";

parserFactory.register("wattpad.com", function() { return new WattpadParser() });

class WattpadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("ul.table-of-contents");
        if (menu == null) {
            return this.fetchChapterList(dom);
        }
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    };

    fetchChapterList(dom) {
        let storyId = WattpadParser.extractIdFromUrl(dom.baseURI);
        let chaptersUrl = `https://www.wattpad.com/api/v3/stories/${storyId}`;
        return HttpClient.fetchJson(chaptersUrl).then(function (handler) {
            return handler.json.parts.map(p => ({sourceUrl: p.url, title: p.title}))
        });
    }

    static extractIdFromUrl(url) {
        let hyperlink = document.createElement("a");
        hyperlink.href = url;
        let path = hyperlink.pathname;
        return path.split("/").filter(s => s.includes("-"))[0].split("-")[0];
    }

    fetchChapter(url) {
        let that = this;
        return HttpClient.wrapFetch(url).then(function (xhr) {
            let dom = xhr.responseXML;
            let extraUris = that.findURIsWithRestOfChapterContent(dom);
            return that.fetchAndAddExtraContentForChapter(dom, extraUris);
        });
    }

    findURIsWithRestOfChapterContent(dom) {
        let uris = [];
        let json = this.findJsonWithRestOfChapterUriInfo(dom);
        if (json != null) {
            let pages = json.pages;
            let uri = json.text_url.text;
            let index = uri.indexOf("?");
            let uriStart = uri.substring(0, index);
            let uriEnd = uri.substring(index);
            for(let i = 2; i <= pages; ++i) {
                uris.push(uriStart + "-" + i + uriEnd);
            }
        }
        return uris;
    }

    findJsonWithRestOfChapterUriInfo(dom) {
        let searchString = ".metadata\":{\"data\":";
        for(let s of [...dom.querySelectorAll("script")]) {
            let source = s.innerHTML;
            let index = source.indexOf(searchString);
            if (0 <= index) {
                return util.locateAndExtractJson(source, searchString);
            }
        }
    }

    fetchAndAddExtraContentForChapter(dom, extraUris) {
        return this.fetchExtraChapterContent(extraUris).then(
            (extraContent) => this.addExtraContent(dom, extraContent)
        );
    }

    fetchExtraChapterContent(extraUris) {
        let sequence = Promise.resolve();
        let extraContent = [];
        extraUris.forEach(function(uri) {
            sequence = sequence.then(function () {
                return HttpClient.fetchText(uri).then(
                    text => extraContent.push(text)
                );
            }); 
        });
        sequence = sequence.then(
            () => extraContent
        );
        return sequence;
    }

    addExtraContent(dom, extraContent) {
        let content = this.findContent(dom);
        for (let s of extraContent) {
            content.appendChild(this.toHtml(s));
        }
        return dom;
    }

    toHtml(extraContent) {
        return new DOMParser().parseFromString(
            "<div>" + extraContent + "</div>", 
            "text/html"
        ).querySelector("div");
    }

    findContent(dom) {
        return dom.querySelector("div[data-page-number]");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitle(dom) {
        return dom.querySelector("div#story-landing h1").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-info a.on-navigate");
        if (authorLabel === null) {
            return super.extractAuthor(dom)
        }
        let path = authorLabel.getAttribute("href").split("/");
        return path[path.length - 1];
    };

    // custom cleanup of content
    removeUnwantedElementsFromContentElement(element) {
        let keep = [...element.querySelectorAll("p")];
        util.removeElements([...element.children]);
        for(let e of keep) {
            element.appendChild(e);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }
}
