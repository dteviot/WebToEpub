"use strict";

parserFactory.register("wtr-lab.com", () => new WtrlabParser());

class WtrlabParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 12000;
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    /** Live Reader has no popup checkboxes; fall back to saved preferences. */
    shouldRemoveChapterNumber() {
        let el = document.getElementById("removeChapterNumberCheckbox");
        if (el) return el.checked;
        return typeof window !== "undefined"
            && window.localStorage?.getItem("removeChapterNumber") === "true";
    }

    shouldRetryLonger() {
        let el = document.getElementById("selectRetryLongerCheckbox");
        if (el) return el.checked;
        return typeof window !== "undefined"
            && window.localStorage?.getItem("selectRetryLonger") === "true";
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
        // raw download no longer supported as the raw text is encoded and i don't know how.
        // leaving old code in case it gets solved.
        // document.getElementById("selectTranslationAiRow").hidden = false;
        document.getElementById("selectRetryLongerRow").hidden = false;
        let wtrLabCookieRow = document.getElementById("wtrLabCookieRow");
        if (wtrLabCookieRow) {
            wtrLabCookieRow.hidden = false;
        }
    }

    async getChapterUrls(dom) {
        try {
            let nextRaw = dom.querySelector("script#__NEXT_DATA__")?.textContent;
            if (nextRaw) {
                let parsed = JSON.parse(nextRaw);
                this.magickey = parsed?.buildId;
                let dataSlug = parsed?.props?.pageProps?.serie?.serie_data?.slug;
                if (dataSlug) {
                    this.slug = dataSlug;
                }
            }
        } catch (e) {
            this.magickey = undefined;
        }

        let leaves = dom.baseURI.split("/");
        let novelIndex = leaves.indexOf("novel");
        if (novelIndex < 0) {
            novelIndex = leaves.findIndex(l => l.startsWith("serie-"));
        }

        let language = (novelIndex >= 1) ? leaves[novelIndex - 1] : "en";
        let id;
        if (novelIndex >= 0 && leaves[novelIndex].startsWith("serie-")) {
            id = leaves[novelIndex].slice(6);
        } else {
            let idPart = leaves[novelIndex + 1] || leaves[novelIndex];
            id = idPart.startsWith("serie-") ? idPart.slice(6) : idPart;
        }
        if (!this.slug) {
            this.slug = leaves[leaves.length - 1].split("?")[0];
        }
        this.language = language;
        this.id = id;

        let chapters = (await HttpClient.fetchJson("https://wtr-lab.com/api/chapters/" + id)).json;

        let websiteMode = typeof HttpClient !== "undefined" && HttpClient.enableCorsProxy;
        let wtrCookies = typeof HttpClient !== "undefined" && HttpClient.wtrLabCookieHeader && HttpClient.wtrLabCookieHeader.trim();
        let fetchGlossaryApis = !websiteMode || wtrCookies;
        if (!fetchGlossaryApis) {
            this.termsuser = [];
            this.termsstory = [];
        } else {
            let serie_id = chapters.chapters[0].serie_id;
            try {
                let terms = (await HttpClient.fetchJson("https://wtr-lab.com/api/v2/user/config")).json;
                terms = (terms?.config?.terms ?? []).filter(a => (a[4] == null) || (a[4].includes(serie_id)));
                terms = terms.map(a => ({ from: a[2].split("|"), to: a[1] }));
                let index = 0;
                this.termsuser = [];
                for (let i = 0; i < terms.length; i++) {
                    for (let j = 0; j < terms[i].from.length; j++) {
                        this.termsuser[index] = ({ from: terms[i].from[j], to: terms[i].to });
                        index++;
                    }
                }
            } catch (error) {
                this.termsuser = [];
            }
            // entire stories have their own terms that supersede the chapter ones
            try {
                let terms = (await HttpClient.fetchJson("https://wtr-lab.com/api/v2/reader/terms/" + id + ".json")).json;
                let termstmp = {};
                for (let i = 0; i < terms?.glossaries?.length; i++) {
                    for (let j = 0; j < terms.glossaries[i]?.data?.terms?.length; j++) {
                        if (terms.glossaries[i]?.data.terms[j]?.length > 1 && terms.glossaries[i]?.data.terms[j][0].length > 0) {
                            termstmp[terms.glossaries[i].data.terms[j][1]] = terms.glossaries[i].data.terms[j][0][0];
                        }
                    }
                }
                this.termsstory = [];
                let index = 0;
                for (let key in termstmp) {
                    this.termsstory[index++] = ({ from: key, to: termstmp[key] });
                }
            } catch (error) {
                this.termsstory = [];
            }
        }
        return chapters.chapters.map(a => ({
            sourceUrl: "https://wtr-lab.com/" + language + "/novel/" + id + "/" + this.slug + "/chapter-" + a.order,
            title: this.shouldRemoveChapterNumber() ? a.title : a.order + ": " + a.title
        }));
    }

    async loadEpubMetaInfo(dom) {
        let json = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        json = JSON.parse(json);
        this.img = json?.props.pageProps.serie.serie_data.data.image;
        return;
    }

    formatTitle(link) {
        let span = link.querySelector("span").textContent.trim();
        let num = link.querySelector("b").textContent.trim().replace("#", "");
        return num + ": " + span;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl() {
        return this.img;
    }

    extractSubject(dom) {
        let tagsgenre = [...dom.querySelectorAll("span.genre")].map(a => a.textContent);
        let tagstags = [...dom.querySelectorAll(".tags a.tag")].map(a => a.textContent.replace(",", ""));
        let tags = tagsgenre;
        tags = tags.concat(tagstags);
        return tags.map(e => e.trim()).join(", ");
    }

    extractDescription(dom) {
        let desc = dom.querySelector("span.description");
        return desc.textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#contents-tabpane-about")];
    }

    async fetchChapter(url) {
        let leaves = url.split("/");
        let novelIndex = leaves.indexOf("novel");
        if (novelIndex < 0) {
            novelIndex = leaves.findIndex(l => l.startsWith("serie-"));
        }
        let language = (novelIndex >= 1) ? leaves[novelIndex - 1] : "en";
        let id;
        if (novelIndex >= 0 && leaves[novelIndex].startsWith("serie-")) {
            id = leaves[novelIndex].slice(6);
        } else {
            let idPart = leaves[novelIndex + 1] || leaves[novelIndex];
            id = idPart.startsWith("serie-") ? idPart.slice(6) : idPart;
        }
        let chapterPart = leaves[leaves.length - 1].split("?")[0];
        let chapter = chapterPart.startsWith("chapter-")
            ? chapterPart.slice(8)
            : chapterPart;

        if (this.magickey && this.slug) {
            let nextUrl = "https://wtr-lab.com/_next/data/" + this.magickey + "/" + language + "/novel/" + id + "/" + this.slug + "/chapter-" + chapter + ".json?service=google";
            try {
                let nextRet = await HttpClient.fetchJson(nextUrl);
                let nextJson = nextRet.json;
                let body = nextJson?.pageProps?.serie?.chapter_data?.data?.body;
                if (body && Array.isArray(body) && body.length > 0) {
                    return this.buildChapterFromNext(nextJson, url);
                }
            } catch (e) {
                /* fall through to POST */
            }
        }

        let fetchUrl = "https://wtr-lab.com/api/reader/get";
        let formData = {
            "translate": "ai",
            "language": language,
            "raw_id": id,
            "chapter_no": chapter,
            "retry": false,
            "force_retry": false
        };
        let header = { "Content-Type": "application/json;charset=UTF-8" };
        let options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header,
            parser: this
        };
        let json = (await HttpClient.fetchJson(fetchUrl, options)).json;
        return this.buildChapter(json, url);
    }

    buildChapterFromNext(json, url) {
        let chapterData = json.pageProps.serie.chapter_data.data;
        let leaves = url.split("/");
        let chapterNum = leaves[leaves.length - 1].split("?")[0].replace("chapter-", "");
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        let num = chapterData.chapter_no != null ? String(chapterData.chapter_no) : chapterNum;
        title.textContent = this.shouldRemoveChapterNumber()
            ? chapterData.title
            : num + ": " + chapterData.title;
        newDoc.content.appendChild(title);
        let br = newDoc.dom.createElement("br");
        for (let element of chapterData.body) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br.cloneNode());
        }
        return newDoc.dom;
    }

    isCustomError(response) {
        if (response.json?.data?.data?.body ? false : true) {
            return true;
        }
        if (response.json?.requireTurnstile) {
            return true;
        }
        return false;
    }

    setCustomErrorResponse(url, wrapOptions, checkedresponse) {
        if (checkedresponse.json?.requireTurnstile || checkedresponse.json?.code == 1401) {
            let newresp = {};
            newresp.url = url;
            newresp.wrapOptions = wrapOptions;
            newresp.response = {};
            newresp.response.url = this.PostToUrl(checkedresponse.response.url, JSON.parse(wrapOptions.fetchOptions.body));
            newresp.response.status = 403;
            return newresp;
        } else {
            let newresp = {};
            newresp.url = url;
            newresp.wrapOptions = wrapOptions;
            newresp.response = {};
            newresp.response.url = this.PostToUrl(checkedresponse.response.url, JSON.parse(wrapOptions.fetchOptions.body));
            newresp.response.status = 999;
            if (this.shouldRetryLonger()) {
                newresp.response.retryDelay = [80, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120];
            } else {
                newresp.response.retryDelay = [80, 40, 25, 25, 25];
            }
            newresp.errorMessage = "Fetch of URL '" + newresp.response.url + "' failed.\nThe server sends an empty Chapter try to open the URL and try again if you can see the Chapter on the normal website.\nIt could also be that you try to get an Ai translated novel that isn't Ai tranlated.";
            return newresp;
        }
    }

    /** Human-readable chapter URL for errors and "open in browser". Always wtr-lab.com — never use response.url (CORS proxy host). */
    PostToUrl(_responseUrl, body) {
        let translate = body.translate;
        let language = body.language;
        let raw_id = body.raw_id;
        let chapter_no = body.chapter_no;
        return "https://wtr-lab.com/" + language + "/novel/" + raw_id + "/" + this.slug + "/chapter-" + chapter_no + "?service=" + translate;
    }

    buildChapter(json, url) {
        let leaves = url.split("/");
        let chapter = leaves[leaves.length - 1].split("?")[0].replace("chapter-", "");
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = (this.shouldRemoveChapterNumber() ? "" : chapter + ": ") + json.chapter.title;
        newDoc.content.appendChild(title);
        let br = newDoc.dom.createElement("br");
        let imagecounter = 0;
        for (let element of json.data.data.body) {
            if (element == "[image]") {
                let imgnode = newDoc.dom.createElement("img");
                let imghref = json.data.data?.images?.[imagecounter++] ?? "";
                if (imghref == "") {
                    continue;
                }
                imgnode.src = imghref;
                newDoc.content.appendChild(imgnode);
            } else {
                let pnode = newDoc.dom.createElement("p");
                let newtext = element;
                // replace chapter provided translation with story one
                for (let i = 0; i < (json?.data?.data?.glossary_data?.terms?.length ?? 0); i++) {
                    for (let term of this.termsstory || []) {
                        if ((json.data.data.glossary_data.terms[i][1] ?? "") == term?.from) {
                            json.data.data.glossary_data.terms[i][0] = term?.to;
                        }
                    }
                }
                // replace chapter provided translation with user one
                for (let i = 0; i < (json?.data?.data?.glossary_data?.terms?.length ?? 0); i++) {
                    for (let term of this.termsuser || []) {
                        if ((json.data.data.glossary_data.terms[i][1] ?? "") == term?.from) {
                            json.data.data.glossary_data.terms[i][0] = term?.to;
                        }
                    }
                }
                // replace with provided translation
                for (let i = 0; i < (json?.data?.data?.glossary_data?.terms?.length ?? 0); i++) {
                    let term = json.data.data.glossary_data.terms[i][0] ?? ("※" + i + "⛬");
                    newtext = newtext.replaceAll("※" + i + "⛬", term);
                    newtext = newtext.replaceAll("※" + i + "〓", term);
                }
                // replace custom terms
                for (let term of this.termsuser || []) {
                    newtext = newtext.replaceAll(term?.from, term?.to);
                }
                // patch — replace with provided chapter patch
                for (let i = 0; i < (json?.data?.data?.patch?.length ?? 0); i++) {
                    newtext = newtext.replaceAll(json?.data?.data?.patch[i].zh, " " + json?.data?.data?.patch[i].en);
                }
                pnode.textContent = newtext;
                newDoc.content.appendChild(pnode);
            }
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
}
