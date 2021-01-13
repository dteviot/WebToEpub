/*
  Parses files on www.fanfiction.net
*/
"use strict";

parserFactory.register("www.fanfiction.net", function() { return new FanFictionParser() });

// fictionpress.com has same format as fanfiction.net
parserFactory.register("www.fictionpress.com", function() { return new FanFictionParser() });

class FanFictionParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let baseUrl = that.getBaseUrl(dom);
        let options = [...dom.querySelectorAll("select#chap_select option")];
        if (options.length ===0) {
            // no list of chapters found, assume it's a single chapter story
            return Promise.resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            return Promise.resolve(
                options.map(option => that.optionToChapterInfo(baseUrl, option))
            );
        }
    }

    optionToChapterInfo(baseUrl, optionElement) {
        // constructing the URL is a bit complicated as the value is not final part of URL.
        let relativeUrl = "../" + optionElement.getAttribute("value");
        let pathNodes = baseUrl.split("/");
        relativeUrl = relativeUrl + "/" + pathNodes[pathNodes.length - 1];
        let url = util.resolveRelativeUrl(baseUrl, relativeUrl);
        return {
            sourceUrl:  url,
            title: optionElement.innerText
        };
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div.storytext");
    }

    extractTextFromProfile(dom, tag) {
        return dom.querySelector("div#profile_top " + tag).textContent.trim();
    }

    extractTitleImpl(dom) {
        return this.extractTextFromProfile(dom, "b");
    }

    extractAuthor(dom) {
        return this.extractTextFromProfile(dom, "a");
    }

    populateInfoDiv(infoDiv, dom) {
        let sanitize = new Sanitize();
        // keep data-xutime for outside processing because locale time is local
        sanitize.attributesForTag.set("span",["data-xutime"])
        for(let n of this.getInformationEpubItemChildNodes(dom).filter(n => n != null)) {
            let clone = n.cloneNode(true);
            this.cleanInformationNode(clone);
            if (clone != null) {
                // convert dates to avoid '19hours ago'
                for(let s of clone.querySelectorAll('span[data-xutime]')) {
                    let time = new Date(1000*s.getAttribute("data-xutime"));
                    s.textContent = time.toLocaleString();
                }
                // fix relative url links.
                for(let a of clone.querySelectorAll('a[href]')) {
                    a.href = new URL(a['href'], dom.baseURI).href
                }
                infoDiv.appendChild(sanitize.clean(clone));
            }
        }
        // this "page" doesn't go through image collector, so strip images
        util.removeChildElementsMatchingCss(infoDiv, "img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#pre_story_links"),
                ...dom.querySelectorAll("div#profile_top")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "button, span[title]");
    }
}
