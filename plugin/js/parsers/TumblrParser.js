"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).endsWith(".tumblr.com")),
    () => new TumblrParser()
);

class TumblrParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = this.findContent(dom);
        this.removeUnwantedContent(menu);
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        let content = dom.querySelector("main div.post") ||
            dom.querySelector("main div.post-main") ||
            dom.querySelector("article div.post-content");
        //fix embeded image links
        for (let e of content.querySelectorAll("a[data-big-photo]")) {
            e.href = e.dataset?.bigPhoto;
        }
        return content;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        this.removeUnwantedContent(this.findContent(dom));
        let photoset = dom.querySelector("iframe.photoset");
        if (photoset !== null) {
            let iframe = (await HttpClient.wrapFetch(photoset.src)).responseXML;
            let images = iframe.querySelector("div.photoset");
            if (images === null) {
                this.fixupPhotoset(dom);        
            } else {
                photoset.replaceWith(images);
            }
        }
        return dom;
    }

    removeUnwantedContent(content) {
        util.removeChildElementsMatchingSelector(content, "footer, #disqus_thread, #notes");
    }

    fixupPhotoset(dom) {
        let photoset = dom.querySelector("div.html_photoset");
        if (photoset !== null) {
            for (let url of this.getPhotosetUrls(dom)) {
                let img = document.createElement("img");
                img.src = url;
                photoset.appendChild(img);
            }
        }
    }

    getPhotosetUrls(dom) {
        let meta = [...dom.querySelectorAll("meta[property='og:image']")];
        return meta.map(m => m.getAttribute("content"))
            .filter(u => !util.isNullOrEmpty(u));
    }
}
