parserFactory.registerDeadSite(
    "stellarrealm.net",
    () => new BrightNovelsParser(),
);
parserFactory.register("brightnovels.com", () => new BrightNovelsParser());

class BrightNovelsParser extends Parser {
    async getChapterUrls(dom) {
        const json = this.getJson(dom);
        this.InertiaVersion = json.version;
        const url = new URL(dom.baseURI);
        let slug = url.pathname.split("/").filter((a) => a !== "");
        slug = slug[slug.length - 1];
        const bookinfo = (
            await HttpClient.fetchJson(
                `https://brightnovels.com/series/${slug}/chapters?sort_order=asc`,
            )
        ).json;
        const chapters = bookinfo.chapters.map((a) => ({
            sourceUrl: `https://brightnovels.com/series/${slug}/${a.slug}`,
            title: a.name,
            isIncludeable: a.price === 0 && a.is_premium !== true,
        }));
        return chapters;
    }

    getJson(dom) {
        const jsondiv = dom.querySelector("#app");
        return JSON.parse(jsondiv.dataset.page);
    }

    async loadEpubMetaInfo(dom) {
        const xml = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        const bookinfo = this.getJson(xml);
        this.title = bookinfo.props.series?.title;
        this.tags = bookinfo.props.series.tags?.map((a) => a.name);
        this.tags = this.tags.concat(
            bookinfo.props.series.genre?.map((a) => a.name),
        );
        const parsed = util.sanitize(bookinfo.props.series.description);
        this.description = parsed.body.textContent;
        this.img = bookinfo.props.series.cover?.path
            ? `https://brightnovels.com/storage/${bookinfo.props.series.cover.path}`
            : null;
        return;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleImpl() {
        return this.title;
    }

    extractSubject() {
        const tags = this.tags;
        return tags.join(", ");
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.img;
    }

    async fetchChapter(url) {
        /*
    alternative the this.InertiaVersion can change with time that's why the other version it is the same json
        let header = {"X-Inertia": "true", "X-Inertia-Version": this.InertiaVersion};
        let options = {
            headers: header
        };
        let json = (await HttpClient.fetchJson(url, options)).json;
    */
        const xml = (await HttpClient.wrapFetch(url)).responseXML;
        const json = this.getJson(xml).props;
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        const newDoc = Parser.makeEmptyDocForContent(url);
        const title = newDoc.dom.createElement("h1");
        let titleText = `Chapter ${json.chapter.number}`;
        if (!util.isNullOrEmpty(json.chapter.title)) {
            titleText += `: ${json.chapter.title}`;
        }
        title.textContent = titleText;
        newDoc.content.appendChild(title);
        const content = util.sanitize(json.chapter.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
