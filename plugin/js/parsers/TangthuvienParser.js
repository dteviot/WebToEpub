"use strict";

parserFactory.register("tangthuvien.net", () => new TangThuVienParser());

class TangThuVienParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = await this.getChapterUrlsFromMultipleTocPages(
            dom,
            TangThuVienParser.extractPartialChapterList,
            TangThuVienParser.getUrlsOfTocPages,
            chapterUrlsUI
        );

        chapters.sort((a, b) => {
            if (a.isVolume || b.isVolume) return 0;
            let numA = parseInt(a.sourceUrl.match(/chuong-(\d+)/)?.[1] || 0, 10);
            let numB = parseInt(b.sourceUrl.match(/chuong-(\d+)/)?.[1] || 0, 10);
            return numA - numB;
        });

        return chapters.filter((v, i, a) => 
            v.isVolume || a.findIndex(t => (t.sourceUrl === v.sourceUrl)) === i
        );
    }

    static getUrlsOfTocPages(dom) {
        let urls = [];
        let storyId = dom.querySelector("input[name='story_id']")?.value;
        if (!storyId) {
            let scripts = Array.from(dom.querySelectorAll("script"));
            for (let script of scripts) {
                let match = script.textContent.match(/story_id\s*[:=]\s*['"]?(\d+)['"]?/);
                if (match) {
                    storyId = match[1];
                    break;
                }
            }
        }

        let maxPage = 0;
        let paginationLinks = dom.querySelectorAll("ul.pagination li a[onclick*='Loading']");
        paginationLinks.forEach(a => {
            let match = a.getAttribute("onclick").match(/Loading\((\d+)\)/);
            if (match) {
                let p = parseInt(match[1], 10);
                if (p > maxPage) maxPage = p;
            }
        });

        if (storyId) {
            for (let i = 0; i <= maxPage; i++) {
                urls.push(`https://tangthuvien.net/story/chapters?story_id=${storyId}&page=${i}`);
            }
        }
        return urls;
    }

    static extractPartialChapterList(dom) {
        let items = [];
        let listItems = dom.querySelectorAll("li");

        listItems.forEach(li => {
            if (li.classList.contains("divider-chap")) {
                items.push({
                    title: li.textContent.trim(),
                    isVolume: true
                });
            } else {
                let link = li.querySelector("a");
                if (link && link.href.includes("/chuong-")) {
                    items.push(util.hyperLinkToChapter(link));
                }
            }
        });
        return items;
    }

    findContent(dom) {
        let content = dom.querySelector(".box-chap") || dom.querySelector(".chapter-c-content");
        if (content) {
            let div = dom.createElement("div");
            let text = content.innerText || content.textContent;
            let lines = text.split(/\n+/);
            lines.forEach(line => {
                let trimmed = line.trim();
                if (trimmed.length > 0) {
                    let p = dom.createElement("p");
                    p.textContent = trimmed;
                    div.appendChild(p);
                }
            });
            return div;
        }
        return null;
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-info h1")?.textContent.trim() || 
               dom.querySelector(".truyen-title")?.textContent.trim() || 
               super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        return dom.querySelector("a[href*='tac-gia?author=']")?.textContent.trim() || 
               dom.querySelector(".author")?.textContent.trim() || 
               super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#bookImg") ||
            util.getFirstImgSrc(dom, ".book-img");
    }

    findChapterTitle(dom) {
        let titleNode = dom.querySelector(".chapter h2") || dom.querySelector("h2");
        return titleNode ? titleNode.textContent.trim() : super.findChapterTitle(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".book-info p.intro")?.textContent.trim() || "";
    }

    extractSubject(dom) {
        let genres = Array.from(dom.querySelectorAll(".book-info p.tag a.red"));
        return genres.map(g => g.textContent.trim()).join(", ");
    }
}