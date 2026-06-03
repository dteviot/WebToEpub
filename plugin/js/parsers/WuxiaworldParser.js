/*
  Parses www.wuxiaworld.com
  Uses gRPC-web API (api2.wuxiaworld.com) which has open CORS - no proxy needed.
*/
"use strict";

parserFactory.register("wuxiaworld.com", () => new WuxiaworldParser());

class WuxiaworldParser extends Parser {
    constructor() {
        super();
    }

    // ─── gRPC-web helpers ────────────────────────────────────────────────────

    static encodeVarint(value) {
        const bytes = [];
        while (value > 127) {
            bytes.push((value & 0x7f) | 0x80);
            value >>>= 7;
        }
        bytes.push(value & 0x7f);
        return bytes;
    }

    static buildGrpcPayload(novelId, chapterGroupId) {
        const body = [];
        // field 1 = novelId (varint)
        body.push(0x08);
        body.push(...WuxiaworldParser.encodeVarint(novelId));
        // field 2 = chapterGroupId (varint)
        body.push(0x10);
        body.push(...WuxiaworldParser.encodeVarint(chapterGroupId));
        // gRPC-web envelope: flag(0x00) + 4-byte big-endian length
        const len = body.length;
        return new Uint8Array([
            0x00,
            (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
            ...body
        ]);
    }

    static readVarint(bytes, pos) {
        let result = 0, shift = 0;
        while (pos < bytes.length) {
            const b = bytes[pos++];
            result |= (b & 0x7f) << shift;
            shift += 7;
            if ((b & 0x80) === 0) break;
        }
        return { value: result, pos };
    }

    static readUtf8(bytes, start, len) {
        const slice = bytes.slice(start, start + len);
        return new TextDecoder().decode(slice);
    }

    // Parse a single Chapter protobuf message
    // field2=name(string), field3=slug(string), field6=novelId(varint)
    static parseChapterMsg(bytes) {
        const ch = { name: "", slug: "" };
        let pos = 0;
        while (pos < bytes.length) {
            const tagByte = bytes[pos++];
            const fieldNum = tagByte >> 3;
            const wireType = tagByte & 0x07;
            if (wireType === 0) {
                const r = WuxiaworldParser.readVarint(bytes, pos);
                pos = r.pos;
                // skip varint fields we don't need
            } else if (wireType === 2) {
                const r = WuxiaworldParser.readVarint(bytes, pos);
                pos = r.pos;
                if (fieldNum === 2) ch.name = WuxiaworldParser.readUtf8(bytes, pos, r.value);
                else if (fieldNum === 3) ch.slug = WuxiaworldParser.readUtf8(bytes, pos, r.value);
                pos += r.value;
            } else if (wireType === 5) {
                pos += 4;
            } else if (wireType === 1) {
                pos += 8;
            } else {
                break;
            }
        }
        return ch;
    }

    // Parse a ChapterGroup protobuf message
    // field1=groupId(varint), field2=title(string), field6=repeated Chapter
    static parseChapterGroupMsg(bytes) {
        const group = { id: 0, title: "", chapters: [] };
        let pos = 0;
        while (pos < bytes.length) {
            const tagByte = bytes[pos++];
            const fieldNum = tagByte >> 3;
            const wireType = tagByte & 0x07;
            if (wireType === 0) {
                const r = WuxiaworldParser.readVarint(bytes, pos);
                pos = r.pos;
                if (fieldNum === 1) group.id = r.value;
            } else if (wireType === 2) {
                const r = WuxiaworldParser.readVarint(bytes, pos);
                pos = r.pos;
                const sub = bytes.slice(pos, pos + r.value);
                if (fieldNum === 2) {
                    group.title = WuxiaworldParser.readUtf8(bytes, pos, r.value);
                } else if (fieldNum === 6) {
                    const ch = WuxiaworldParser.parseChapterMsg(sub);
                    if (ch.slug) group.chapters.push(ch);
                }
                pos += r.value;
            } else if (wireType === 5) {
                pos += 4;
            } else if (wireType === 1) {
                pos += 8;
            } else {
                break;
            }
        }
        return group;
    }

    // Parse a GetChapterListResponse gRPC-web frame
    // Top-level field1 = repeated ChapterGroup
    static parseGrpcResponse(buffer) {
        const bytes = new Uint8Array(buffer);
        const groups = [];
        let pos = 0;

        while (pos < bytes.length) {
            if (pos + 5 > bytes.length) break;
            const flag = bytes[pos];
            const msgLen = (bytes[pos+1] << 24) | (bytes[pos+2] << 16) | (bytes[pos+3] << 8) | bytes[pos+4];
            pos += 5;
            if (flag === 0x80) break; // trailers frame

            const end = pos + msgLen;
            let fp = pos;
            while (fp < end) {
                const tagByte = bytes[fp++];
                const fieldNum = tagByte >> 3;
                const wireType = tagByte & 0x07;
                if (wireType === 2) {
                    const r = WuxiaworldParser.readVarint(bytes, fp);
                    fp = r.pos;
                    if (fieldNum === 1) {
                        const sub = bytes.slice(fp, fp + r.value);
                        groups.push(WuxiaworldParser.parseChapterGroupMsg(sub));
                    }
                    fp += r.value;
                } else if (wireType === 0) {
                    const r = WuxiaworldParser.readVarint(bytes, fp);
                    fp = r.pos;
                } else {
                    break;
                }
            }
            pos = end;
        }
        return groups;
    }

    // Fetch chapters for one chapter group via gRPC-web (direct, no proxy needed)
    static async fetchChapterGroup(novelId, groupId) {
        const payload = WuxiaworldParser.buildGrpcPayload(novelId, groupId);
        const response = await fetch(
            "https://api2.wuxiaworld.com/wuxiaworld.api.v2.Chapters/GetChapterList",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                },
                body: payload,
            }
        );
        if (!response.ok) throw new Error(`gRPC HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        return WuxiaworldParser.parseGrpcResponse(buffer);
    }

    // ─── Extract novel metadata from __REACT_QUERY_STATE__ ──────────────────

    static extractReactQueryState(dom) {
        try {
            const scriptEl = [...dom.querySelectorAll("script")]
                .find(s => s.textContent.includes("__REACT_QUERY_STATE__"));
            if (!scriptEl) return null;
            const match = scriptEl.textContent.match(
                /window\.__REACT_QUERY_STATE__\s*=\s*(\{[\s\S]*?\});\s*window\.__APP_CONTEXT__/
            );
            if (match) return JSON.parse(match[1]);
        } catch (e) {
            // ignore
        }
        return null;
    }

    static getNovelItem(dom) {
        const state = WuxiaworldParser.extractReactQueryState(dom);
        if (!state) return null;
        const novelQuery = state.queries.find(q => q.queryKey && q.queryKey[0] === "novel");
        return novelQuery?.state?.data?.item ?? null;
    }

    static getChapterItem(dom) {
        const state = WuxiaworldParser.extractReactQueryState(dom);
        if (!state) return null;
        const chapterQuery = state.queries.find(q => q.queryKey && q.queryKey[0] === "chapter");
        return chapterQuery?.state?.data?.item ?? null;
    }

    // ─── Chapter URL list ────────────────────────────────────────────────────

    async getChapterUrls(dom) {
        // Try gRPC-web API first (new site uses React SPA, no chapter links in HTML)
        try {
            const item = WuxiaworldParser.getNovelItem(dom);
            if (item && item.id && item.slug && item.chapterInfo) {
                const novelId = item.id;
                const novelSlug = item.slug;
                const groups = item.chapterInfo.chapterGroups || [];

                if (groups.length > 0) {
                    const allChapters = [];
                    for (const group of groups) {
                        const fetchedGroups = await WuxiaworldParser.fetchChapterGroup(novelId, group.id);
                        for (const fg of fetchedGroups) {
                            let isFirst = true;
                            for (const ch of fg.chapters) {
                                const entry = {
                                    sourceUrl: `https://www.wuxiaworld.com/novel/${novelSlug}/${ch.slug}`,
                                    title: ch.name,
                                };
                                if (isFirst && fg.title && groups.length > 1) {
                                    entry.newArc = fg.title;
                                    isFirst = false;
                                }
                                allChapters.push(entry);
                            }
                        }
                    }
                    if (allChapters.length > 0) return allChapters;
                }
            }
        } catch (e) {
            // fall through to DOM-based methods
        }

        // Legacy DOM-based fallback (old site layout)
        let chapters = [];
        let chaptersElement = dom.querySelector("div.content div.panel-group");
        if (chaptersElement != null) {
            chapters = util.hyperlinksToChapterList(chaptersElement,
                WuxiaworldParser.isChapterHref, WuxiaworldParser.getChapterArc);
            WuxiaworldParser.removeArcsWhenOnlyOne(chapters);
        }
        if (chapters.length === 0) {
            chapters = [...dom.querySelectorAll("li.chapter-item a")]
                .map(link => util.hyperLinkToChapter(link));
        }
        if (chapters.length === 0) {
            let baseURI = dom.baseURI || "";
            let slug = baseURI.split("/novel/")[1]?.split("/")[0]?.split("?")[0];
            if (slug) {
                chapters = [...dom.querySelectorAll("a")]
                    .filter(a => {
                        let href = a.getAttribute("href");
                        return href && href.includes(`/novel/${slug}/`);
                    })
                    .map(link => util.hyperLinkToChapter(link));
            }
        }
        return chapters;
    }

    static isChapterHref(link) {
        let parent = link.parentNode;
        return (parent.tagName.toLowerCase() === "li")
            && (parent.className === "chapter-item");
    }

    static getChapterArc(link) {
        let isPanel = function(element) {
            return (element.tagName.toLowerCase() === "div")
                && (element.className === "panel panel-default");
        };
        let parent = link;
        do {
            parent = parent.parentNode;
            if (parent == null) return null;
        } while (!isPanel(parent));
        let arc = parent.querySelector("span.title a");
        return arc == null ? null : arc.textContent.trim();
    }

    static removeArcsWhenOnlyOne(chapters) {
        let arcCount = chapters.reduce((p, c) => p + (c.newArc != null), 0);
        if (arcCount < 2) {
            chapters.forEach(c => c.newArc = null);
        }
    }

    // ─── Chapter content ─────────────────────────────────────────────────────

    // find the node(s) holding the story content
    findContent(dom) {
        // Try to extract from __REACT_QUERY_STATE__ (website mode - no JS rendering)
        try {
            const chapterItem = WuxiaworldParser.getChapterItem(dom);
            if (chapterItem && chapterItem.content && chapterItem.content.value) {
                const doc = dom.ownerDocument || dom;
                const div = doc.createElement("div");
                div.id = "wte-wuxia-content";
                div.innerHTML = chapterItem.content.value;
                // Inject into document so other methods can find it
                const body = dom.querySelector("body");
                if (body) body.appendChild(div);
                return div;
            }
        } catch (e) {
            // ignore
        }

        // DOM fallback for rendered pages
        let candidates = [...dom.querySelectorAll("#chapter-content, .chapter-content, div.fr-view:not(.panel-body), div.fr-view")];
        let content = WuxiaworldParser.elementWithMostParagraphs(candidates);
        if (content == null) {
            content = super.findContent(dom);
        }
        if (content) {
            this.cleanContent(content);
        }
        return content;
    }

    static elementWithMostParagraphs(elements) {
        if (elements.length === 0) return null;
        return elements.map(
            e => ({ e: e, numParagraphs: [...e.querySelectorAll("p")].length })
        ).reduce(
            (a, c) => a.numParagraphs < c.numParagraphs ? c : a
        ).e;
    }

    cleanContent(content) {
        util.removeChildElementsMatchingSelector(content, "button, #spoiler_teaser");
        let toDelete = [...content.querySelectorAll("a")]
            .filter(a => a.textContent === "Teaser");
        util.removeElements(toDelete);
    }

    // ─── Chapter title ───────────────────────────────────────────────────────

    findChapterTitle(dom) {
        // Try from React state first
        try {
            const chapterItem = WuxiaworldParser.getChapterItem(dom);
            if (chapterItem && chapterItem.name) {
                const doc = dom.ownerDocument || dom;
                const h1 = doc.createElement("h1");
                h1.textContent = chapterItem.name;
                return h1;
            }
        } catch (e) {
            // ignore
        }
        return dom.querySelector("div.caption h4") ||
            dom.querySelector("h4.chapter-title") ||
            dom.querySelector("h1.chapter-title") ||
            dom.querySelector("h3.chapter-title") ||
            dom.querySelector(".chapter-title") ||
            dom.querySelector("h1") ||
            dom.querySelector("h2") ||
            dom.querySelector("h3") ||
            dom.querySelector("h4");
    }

    // ─── Novel metadata ──────────────────────────────────────────────────────

    extractTitleImpl(dom) {
        try {
            const item = WuxiaworldParser.getNovelItem(dom);
            if (item && item.name) return item.name;
        } catch (e) {
            // ignore
        }
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        try {
            const item = WuxiaworldParser.getNovelItem(dom);
            if (item && item.authorName && item.authorName.value) return item.authorName.value;
        } catch (e) {
            // ignore
        }
        let meta = dom.querySelector("meta[property='books:author']") || dom.querySelector("meta[name='author']");
        return meta ? meta.getAttribute("content") : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        try {
            const item = WuxiaworldParser.getNovelItem(dom);
            if (item && item.coverUrl && item.coverUrl.value) return item.coverUrl.value;
        } catch (e) {
            // ignore
        }
        let ogImg = dom.querySelector("meta[property='og:image']");
        if (ogImg) return ogImg.getAttribute("content");
        return util.getFirstImgSrc(dom, "div.novel-index") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [];
        try {
            const item = WuxiaworldParser.getNovelItem(dom);
            if (item) {
                const doc = dom.ownerDocument || dom;
                if (item.synopsis && item.synopsis.value) {
                    const div = doc.createElement("div");
                    div.innerHTML = "<h3>Synopsis</h3>" + item.synopsis.value;
                    nodes.push(div);
                }
                if (item.description && item.description.value) {
                    const div = doc.createElement("div");
                    div.innerHTML = "<h3>Description</h3>" + item.description.value;
                    nodes.push(div);
                }
            }
        } catch (e) {
            // ignore
        }
        if (nodes.length === 0) {
            nodes = [...dom.querySelectorAll("div.media-novel-index div.media-body")];
            let summary = [...dom.querySelectorAll("div.fr-view")];
            if (summary.length > 1) {
                nodes.push(summary[1]);
            }
        }
        return nodes;
    }
}
