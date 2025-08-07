/*
  Parses files on www.fanfiction.net
*/
"use strict";

parserFactory.register("www.fanfiction.net", function() { return new FanFictionParser(); });

// fictionpress.com has same format as fanfiction.net
parserFactory.register("www.fictionpress.com", function() { return new FanFictionParser(); });

class FanFictionParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3050;
    }

    async getChapterUrls(dom) {
        let baseUrl = this.getBaseUrl(dom);
        let options = this.getOptions(dom);
        // no list of chapters found, assume it's a single chapter story
        return (options.length === 0) 
            ? this.singleChapterStory(baseUrl, dom)
            : options.map(option => this.optionToChapterInfo(baseUrl, option));
    }

    getOptions(dom) {
        return [...dom.querySelectorAll("select#chap_select option")];
    }

    optionToChapterInfo(baseUrl, optionElement) {
        // constructing the URL is a bit complicated as the value is only part of URL.
        let onchange = optionElement.parentElement.getAttribute("onchange");
        onchange = onchange.split("'");
        let url = new URL(baseUrl);
        url.pathname = onchange[1] + optionElement.getAttribute("value") + onchange[3];
        return {
            sourceUrl:  url.href,
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

    async fetchChapter(url) {
        let dom = await super.fetchChapter(url);
        this.addTitleToChapter(url, dom);
        return dom;
    }

    async fetchWebPageContent(webPage)
    {
        try
        {
            return await super.fetchWebPageContent(webPage);
        }
        catch (ex)
        {
            //Determine if path contains extra parameters. Immediately fail if already shortened.
            //Shortened URI is not always ideal solution; apparently related to caching on server. 
            let regex = /(https?:\/\/(?:www\.)?\w+\.\w+\/s\/\d+\/\d+\/)[a-z\-0-9]+/i;
            let shortUri = regex.exec(webPage.sourceUrl);
            if (shortUri)
            {
                //Primary failure condition - catch where fanfiction controller fails to forward view
                console.log(`Failed to load URI [${webPage.sourceUrl}] - Attempting alternative. [${shortUri[1]}]`);
                //Await throttle timer again for second page fetch.
                await this.rateLimitDelay();
                webPage.sourceUrl = shortUri[1];
                return await this.fetchWebPageContent(webPage);
            }
            else if (webPage.sourceUrl.endsWith("/"))
            {
                //Secondary failure condition - catch where fanfiction controller failed to load from cache
                let newUrl = webPage.sourceUrl.slice(0, -1);
                console.log(`Failed to load URI [${webPage.sourceUrl}] - Attempting alternative. [${newUrl}]`);
                //Await throttle timer again for second page fetch.
                await this.rateLimitDelay();
                webPage.sourceUrl = newUrl;
                return await this.fetchWebPageContent(webPage);
            }
            else
            {
                throw ex;
            }
        }
    }

    addTitleToChapter(url, dom) {
        let path = url.split("/");
        let chapterId = path[path.length - 2];
        for (let option of this.getOptions(dom)) {
            if (chapterId === option.getAttribute("value")) {
                let title = dom.createElement("H1");
                title.appendChild(dom.createTextNode(option.textContent));
                let content = this.findContent(dom);
                content.insertBefore(title, content.firstChild);
                break;
            }
        }
    }

    populateInfoDiv(infoDiv, dom) {
        for (let n of this.getInformationEpubItemChildNodes(dom).filter(n => n != null)) {
            let clone = util.sanitizeNode(n);
            this.cleanInformationNode(clone);
            if (clone != null) {
                // convert dates to avoid '19hours ago'
                for (let s of clone.querySelectorAll("span[data-xutime]")) {
                    let time = new Date(1000*s.getAttribute("data-xutime"));
                    s.textContent = time.toLocaleString();
                }
                // fix relative url links.
                for (let a of clone.querySelectorAll("a[href]")) {
                    a.href = new URL(a["href"], dom.baseURI).href;
                }
                // Fix for > from CSS
                for (let s of clone.querySelectorAll("span.icon-chevron-right")) {
                    s.textContent = " > ";
                }
                infoDiv.appendChild(clone);
            }
        }
        // this "page" doesn't go through image collector, so strip images
        util.removeChildElementsMatchingSelector(infoDiv, "img");
    }

    findCoverImageUrl(dom) {
        let big = dom.querySelector("div#img_large img");
        if (big !== null) {
            let img = big.getAttribute("data-original");
            if (!util.isNullOrEmpty(img)) {
                return "https://www.fanfiction.net" + img;
            }
        }
        return util.getFirstImgSrc(dom, "div#profile_top");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#pre_story_links, div#profile_top")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "button, span[title]");
    }
}
