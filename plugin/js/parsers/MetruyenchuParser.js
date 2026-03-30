"use strict";

parserFactory.register("metruyenchu.com.vn", () => new MeTruyenChuParser());

class MeTruyenChuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const chapters = [];
        const bid = dom.querySelector("input[name='bid']")?.value;
        const baseUrl = "https://metruyenchu.com.vn";
        let maxPage = 1;
        
        dom.querySelectorAll(".paging a[onclick]").forEach(a => {
            const match = a.getAttribute("onclick").match(/page\(\d+,\s*(\d+)\)/);
            if (match) {
                maxPage = Math.max(maxPage, parseInt(match[1], 10));
            }
        });

        if (bid && maxPage > 1) {
            for (let i = 1; i <= maxPage; i++) {
                try {
                    const response = await fetch(`${baseUrl}/get/listchap/${bid}?page=${i}`, {
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "Accept": "application/json"
                        }
                    });
                    
                    const json = await response.json(); 
                    const tempDiv = dom.createElement("div");
                    tempDiv.innerHTML = json.data;
                    
                    chapters.push(...Array.from(tempDiv.querySelectorAll("li a")).map(link => ({
                        title: link.textContent.trim(),
                        sourceUrl: new URL(link.getAttribute("href"), baseUrl).href 
                    })));
                } catch (err) {
                    continue;
                }
            }
        } else {
            chapters.push(...Array.from(dom.querySelectorAll("#chapter-list .clearfix ul li a")).map(link => ({
                title: link.textContent.trim(),
                sourceUrl: new URL(link.getAttribute("href"), baseUrl).href
            })));
        }
        
        return chapters;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1[itemprop='name']")?.textContent.trim() || 
               dom.querySelector(".chapter-title h1 a")?.textContent.trim() ||
               super.extractTitleImpl(dom);
    }

    extractSubject(dom) {
        return Array.from(dom.querySelectorAll(".li--genres a"))
            .map(g => g.textContent.trim())
            .join(", ");
    }

    extractAuthor(dom) {
        return dom.querySelector("a[itemprop='author']")?.textContent.trim() || 
               super.extractAuthor(dom);
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-info-pic") || super.findCoverImageUrl(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.current-chapter")?.textContent.trim();
    }

    findContent(dom) {
        return dom.querySelector(".truyen");
    }
}