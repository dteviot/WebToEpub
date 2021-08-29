"use strict";

parserFactory.register("patreon.com", () => new PatreonParser());

class PatreonParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let campaignId = this.findCampaignId(dom);
        if (campaignId !== null) {
            return this.walkToc(campaignId);
        }

        return [...dom.querySelectorAll("span[data-tag='post-title'] a")]
            .map(util.hyperLinkToChapter).reverse();
    }

    findCampaignId(dom) {
        let prefix = "\"self\": \"https://www.patreon.com/api/campaigns/";
        let text = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes(prefix));
        return (0 < text.length)
            ? util.extactSubstring(text[0], prefix, "\"")
            : null;
    }

    async walkToc(campaignId) {
        let chapters = [];
        let cursor = null;
        do {
            let url = this.buildUrlForTocRequest(campaignId, cursor);
            let json = (await HttpClient.fetchJson(url)).json;
            chapters = chapters.concat(this.jsonToChapters(json));
            cursor = this.cursorFromJson(json);
        } while (cursor != null);
        return chapters.reverse();
    }

    buildUrlForTocRequest(campaignId, cursor) {
        let url = new URL("https://www.patreon.com/api/posts");
        let params = url.searchParams;
        params.append("include", "campaign,access_rules,attachments,audio,images,media,user");
        params.append("fields[campaign]", "name,url");
        params.append("fields[post]", "current_user_can_view,title,url");
        params.append("fields[user]", "url");
        params.append("fields[access_rule]", "access_rule_type");
        params.append("fields[media]", "id,image_urls,download_url,metadata,file_name");
        params.append("filter[campaign_id]", campaignId);
        params.append("filter[contains_exclusive_posts]", "true");
        params.append("filter[is_draft]", "false");
        params.append("sort", "-published_at");
        params.append("json-api-version", "1.0");
        if (cursor !== null) {
            params.append("page[cursor]", cursor);
        }
        return url.href;
    }

    jsonToChapters(json) {
        return json.data.map(this.jsonToChapter);
    }

    jsonToChapter(json) {
        return {
            sourceUrl:  json.attributes.url,
            title: json.attributes.title,
            newArc: null,
            isIncludeable: json.attributes.current_user_can_view
        };
    }

    cursorFromJson(json) {
        let cursors = json.meta.pagination.cursors;
        return cursors == null ? null : cursors.next;
    }

    findContent(dom) {
        let content = dom.querySelector("div[data-tag='post-card']");
        if (content !== null) {
            this.addImage(dom, content);
            return content;
        }
        content = dom.querySelector("div[data-tag='post-content']");
        if (content === null) {
            this.addContentFromScript(dom)        
        }
        return dom.querySelector("div[data-tag='post-content']");
    }

    addImage(dom, content) {
        let placeholder = content.querySelector("div.lazyload-placeholder");
        if (placeholder !== null) {
            let link = dom.querySelector("link[rel='image_src']");
            if (link !== null) {
                let img = dom.createElement("img");
                img.src = link.getAttribute("content");
                placeholder.replaceWith(img);
            }
        }
    }

    addContentFromScript(dom) {
        let script = [...dom.querySelectorAll("script")]
            .map(e => e.textContent)
            .filter(t => t.includes("\"post\": {"));
        if (0 < script.length) {
            let json = util.locateAndExtractJson(script[0], "\"post\":");
            let attributes = json.data.attributes;
            let dp = new DOMParser();
            let title = dp.parseFromString("<span data-tag='post-title'>" 
                + attributes.title + "</span>", "text/html");
            dom.body.appendChild(title.querySelector("span"));
            let content = dp.parseFromString("<div data-tag='post-content'>" 
                + attributes.content + "</div>", "text/html");
            dom.body.appendChild(content.querySelector("div"));
        }
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div[data-tag='post-tags']");
        super.removeUnwantedElementsFromContentElement(element);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1").textContent + " Patreon"  ;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h1");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("span[data-tag='post-title']").textContent;
    }

    findCoverImageUrl(dom) {
        let imgs = [...dom.querySelectorAll("div")]
            .filter(img => !util.isNullOrEmpty(img.style.backgroundImage))
            .map(d => d.style.backgroundImage)
        if (0 < imgs.length) {
            return util.extractUrlFromBackgroundImage(imgs[0]);
        }
        return null;
    }
}
