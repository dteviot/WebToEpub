"use strict";
parserFactory.register("wattpad.com.vn", () => new WattpadVNParser());
class WattpadVNParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }
    async getChapterUrls(dom, chapterUrlsUI) {
        this.extractNovelId(dom);
        let chapters = [];
        let page = 1;
        let maxPages = 1;
        while (page <= maxPages) {
            let url = `https://wattpad.com.vn/get/listchap/${this.novelId}?page=${page}`;
            let options = {
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            };
            let json = (await HttpClient.fetchJson(url, options)).json;
            let html = json.data;
            let tempDom = new DOMParser().parseFromString(html, "text/html");
            let partialChapters = [];
            let uls = tempDom.querySelectorAll("ul");
            for (let ul of uls) {
                let links = ul.querySelectorAll("a");
                for (let a of links) {
                    let href = a.getAttribute("href");
                    let fullUrl = new URL(href, dom.baseURI).href;
                    partialChapters.push({
                        sourceUrl: fullUrl,
                        title: a.textContent.trim()
                    });
                }
            }
            chapterUrlsUI.showTocProgress(partialChapters);
            chapters = chapters.concat(partialChapters);
            if (page === 1) {
                maxPages = this.extractMaxPages(tempDom);
            }
            page++;
            await this.rateLimitDelay();
        }
        return chapters;
    }
    
    extractNovelId(dom) {
        let input = dom.querySelector(".findchap > input:nth-child(2)");
        this.novelId = input?.value;
    }
    
    extractMaxPages(tempDom) {
        let paging = tempDom.querySelector(".paging");
        if (!paging) return 1;
        let links = paging.querySelectorAll("a");
        let max = 1;
        for (let a of links) {
            let onclick = a.getAttribute("onclick");
            if (onclick) {
                let match = onclick.match(/page\(\d+,(\d+)\)/);
                if (match) {
                    max = Math.max(max, parseInt(match[1]));
                }
            }
        }
        return max;
    }
    
    findContent(dom) {
        return dom.querySelector(".truyen");
    }
    extractTitleImpl(dom) {
        return dom.querySelector(".mRightCol > h1:nth-child(1)");
    }
    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-info-text > ul:nth-child(1) > li:nth-child(1) > a:nth-child(2)");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }
    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".li--genres > a:nth-child(2)")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
    extractDescription(dom) {
        return dom.querySelector(".intro").textContent.trim();
    }
    findChapterTitle(dom) {
        return dom.querySelector(".current-chapter > a:nth-child(1)");
    }
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-3d");
    }
}
