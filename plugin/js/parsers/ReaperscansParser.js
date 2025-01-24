"use strict";

parserFactory.register("reaperscans.com", () => new ReaperscansParser());

class ReaperscansParser extends Parser{
    constructor() {
        super();
        this.seriesInfo = null;
    }

    async getChapterUrls(dom) {
        if(this.seriesInfo === null) {
            await this.extractSeriesInfo(dom)
        }
        const chaptersApiUrl = new URL('https://api.reaperscans.com/chapter/query');
        chaptersApiUrl.searchParams.set('page', 1);
        chaptersApiUrl.searchParams.set('perPage', this.seriesInfo.chaptersCount);
        chaptersApiUrl.searchParams.set('query', '');
        chaptersApiUrl.searchParams.set('order', 'asc');
        chaptersApiUrl.searchParams.set('series_id', this.seriesInfo.seriesId);
        const chaptersJson = (await HttpClient.fetchJson(chaptersApiUrl)).json;
        const chapterUrls = chaptersJson.data.map(chapter => {
            return {
                sourceUrl: `https://reaperscans.com/series/${this.seriesInfo.seriesSlug}/${chapter.chapter_slug}`,
                title: `${chapter.chapter_name} - ${chapter.chapter_title}`
            };
        });
        return chapterUrls;
    }

    async extractSeriesInfo(dom) {
        const baseUrl= this.getBaseUrl(dom);
        const match = baseUrl.match(/reaperscans\.com\/series\/[^/]+/);
        const apiUrl = `https://api.${match[0]}`;
        const seriesJson = (await HttpClient.fetchJson(apiUrl)).json
        this.seriesInfo = {
            seriesId: seriesJson.id,
            seriesName: seriesJson.title,
            seriesSlug: seriesJson.series_slug,
            chaptersCount: seriesJson.meta.chapters_count
        }
    }

    findScriptContent(dom) {
        const scripts = dom.querySelectorAll("script");
        for (const script of scripts) {
            if (script.firstChild && script.firstChild.nodeName === "#text" 
                && script.textContent.includes("\\u003cp") //contains paragraph tags
                && script.textContent.includes("series_id") === false //ignore other series info
                ) {
                return script.textContent;
            }
        }
        return null;
    }

    findContent(dom) {
        const scriptContent = this.findScriptContent(dom);
        const content = scriptContent.substring(scriptContent.indexOf('\\u003cp'), scriptContent.lastIndexOf('\\u003e') + 6)
        const decoded = this.decodeString(content);
        const html = this.cleanHTML(decoded);
        return html;
    }

    decodeString(input) {
        // Decode Unicode escapes
        const unicodeDecoded = JSON.parse(`"${input}"`);
        // Decode HTML entities
        const textarea = document.createElement("textarea");
        textarea.innerHTML = unicodeDecoded;
        return textarea.value;
    }

    cleanHTML(inputHTML) {
        let html = inputHTML.replace(/\n\n/g, "<br>");
        html = html.replace(/\n/g, "");
        html = html.replace(/style=\"line-height: 2;\"/g, "");
        const doc = new DOMParser().parseFromString(html, "text/html");
    
        const unwantedPatterns = [
            "Reaper Scans",           // Site name
            "Chapter ",               // Chapter title
            "[TL:", "[PR:", 
            "Translator:", "Editor:", // Translator/Proofreader notes
            "discord", "Discord:"      // Discord link
        ];
    
        const paragraphs = doc.querySelectorAll("p");
        paragraphs.forEach(p => {
            if (unwantedPatterns.some(pattern => p.textContent.includes(pattern))) {
                p.remove();
            }
        });
    
        return doc.body;
    }

    extractTitleImpl(dom) {
        const title = dom.querySelector("h1");
        if(title.textContent.includes("Chapter")) {
            return dom.querySelector("h2"); //h2 on chapter pages and h1 on series pages
        }
        return title;
    }

}
