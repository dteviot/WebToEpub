"use strict";

parserFactory.registerUrlRule(
    (url) => /^https?:\/\/(?:www\.)?(sbxh|toki)\d+\.com(?:\/|$)/.test(url),
    () => new Sbxh1Parser(),
);

class Sbxh1Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let novelId = Sbxh1Parser.extractNovelId(dom.baseURI);
        if (novelId == null) {
            return [];
        }
        let chapterLinks = Sbxh1Parser.parseChapters(dom, novelId);

        let page = 1;
        while (chapterLinks[chapterLinks.length - 1].querySelector(".ne-num").textContent !== "1화") {
            page++;
            const xml = (await HttpClient.wrapFetch(`${dom.baseURI}?epage=${page}`)).responseXML;
            let newLinks = Sbxh1Parser.parseChapters(xml, novelId);
            if (newLinks.length === 0) {
                break;
            }
            chapterLinks.push(...newLinks);
        }

        let chaptersByUrl = new Map();
        chapterLinks
            .filter((a) => Sbxh1Parser.isEpisodeUrl(a.href, novelId))
            .forEach((a) => {
                let episodeNumber = Sbxh1Parser.extractEpisodeNumber(a.textContent);
                if (episodeNumber == null) {
                    return;
                }
                let normalized = util.normalizeUrlForCompare(a.href);
                let chapterNumber = a.querySelector(".ne-num").textContent;
                let chapterTitle = a.querySelector(".ne-title").textContent;

                let chapter = {
                    sourceUrl: a.href,
                    title: `${chapterNumber} - ${chapterTitle}`,
                    episodeNumber: episodeNumber,
                };
                let existing = chaptersByUrl.get(normalized);
                if (
                    existing == null ||
                    Sbxh1Parser.isBetterEpisodeTitle(chapter.title, existing.title)
                ) {
                    chaptersByUrl.set(normalized, chapter);
                }
            });

        return [...chaptersByUrl.values()]
            .sort((a, b) => a.episodeNumber - b.episodeNumber)
            .map((a) => ({
                sourceUrl: a.sourceUrl,
                title: a.title,
            }));
    }

    static parseChapters(dom, novelId) {
        let chapterLinks = [
            ...dom.querySelectorAll(`a.novel-ep-link[href*="/novel/${novelId}/"]`),
        ];
        if (chapterLinks.length === 0) {
            chapterLinks = [...dom.querySelectorAll(`a[href*="/novel/${novelId}/"]`)];
        }
        return chapterLinks;
    }

    findContent(dom) {
        return (
            Parser.findConstrutedContent(dom) ??
            dom.querySelector("article.novel-viewer")
        );
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("main h1:not(.ne-h1)");
        return (
            title ??
            dom.querySelector("main nav a[href^='/novel/'], main a[href^='/novel/']")
        );
    }

    extractAuthor(dom) {
        let main = dom.querySelector("main");
        let title = main?.querySelector("h1:not(.ne-h1)");
        if (main != null && title != null) {
            let text = main.textContent
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s.length !== 0);
            let titleIndex = text.indexOf(title.textContent.trim());
            if (titleIndex >= 0) {
                let author = text
                    .slice(titleIndex + 1)
                    .find(
                        (s) => !/^\u00b7|\d+화|^#|완결|연재|무료|보기|에피소드/.test(s),
                    );
                if (author != null) {
                    return author;
                }
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let description = [...dom.querySelectorAll("main p")].find(
            (p) => !util.isElementWhiteSpace(p),
        );
        return description?.textContent.trim() ?? null;
    }

    extractLanguage() {
        return "ko";
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("main img[alt]")?.src ?? null;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.ne-h1") ?? dom.querySelector("main h1");
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url, { parser: this })).responseXML;
        let viewerInfo = Sbxh1Parser.extractViewerInfo(dom);
        if (viewerInfo == null) {
            throw Error("Unable to find sbxh novel content token");
        }

        let content = await this.fetchNovelContent(url, viewerInfo);
        return this.buildChapter(dom, url, content);
    }

    async fetchNovelContent(pageUrl, viewerInfo) {
        let tabId = Sbxh1Parser.extractTabIdFromQueryParameter();
        if (tabId != null && !util.isFirefox()) {
            return await Sbxh1Parser.fetchContentInPageContext(tabId, pageUrl);
        }
        let response = await this.fetchContentJson(pageUrl, viewerInfo);
        return await Sbxh1Parser.decodePayload(
            response.payload,
            new URL(pageUrl).origin,
            viewerInfo.cookieName,
            viewerInfo.novelId,
            viewerInfo.episodeId,
        );
    }

    async fetchContentJson(pageUrl, viewerInfo) {
        let baseUrl = new URL(pageUrl).origin;
        await Sbxh1Parser.setApiRequestHeaders(baseUrl, pageUrl);
        let cookie = await Sbxh1Parser.getCookie(baseUrl, viewerInfo.cookieName);
        if (cookie == null) {
            await HttpClient.wrapFetch(`${baseUrl}/api/nv-issue`, {
                fetchOptions: {
                    method: "POST",
                    credentials: "include",
                    cache: "no-store",
                },
                parser: this,
            });
            cookie = await Sbxh1Parser.getCookie(baseUrl, viewerInfo.cookieName);
        }
        if (cookie == null) {
            throw Error("Unable to read sbxh novel content cookie");
        }

        let nonce = Sbxh1Parser.makeNonce();
        let proof = await Sbxh1Parser.hmacSha256Base64Url(
            cookie.value,
            `${viewerInfo.token}.${nonce}.${navigator.userAgent}`,
        );
        let response = (
            await HttpClient.fetchJson(`${baseUrl}/api/novel-content`, {
                method: "POST",
                credentials: "include",
                cache: "no-store",
                headers: {
                    "content-type": "application/json",
                    "x-novel-client": "shadow-v3",
                },
                body: JSON.stringify({
                    novelId: viewerInfo.novelId,
                    episodeId: viewerInfo.episodeId,
                    token: viewerInfo.token,
                    nonce: nonce,
                    proof: proof,
                }),
                parser: this,
            })
        ).json;
        if (!response.ok || response.empty || response.payload == null) {
            throw Error("sbxh returned empty novel content");
        }
        return response;
    }

    static async fetchContentInPageContext(tabId, pageUrl) {
        await chrome.tabs.update(tabId, { url: pageUrl });
        await Sbxh1Parser.waitForTabLoad(tabId);
        let results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: "MAIN",
            func: async () => {
                let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                for (let i = 0; i < 120; ++i) {
                    let text =
                        typeof window.__novelTTSText === "string"
                            ? window.__novelTTSText.trim()
                            : "";
                    if (text.length !== 0) {
                        return { kind: "text", text: text };
                    }
                    if (document.body?.innerText.includes("본문을 불러올 수 없습니다")) {
                        throw Error("sbxh viewer failed to load novel content");
                    }
                    await sleep(250);
                }
                throw Error("Timed out waiting for sbxh novel content");
            },
        });
        let content = results?.[0]?.result;
        if (content == null || util.isNullOrEmpty(content.text)) {
            throw Error("sbxh returned empty visible novel content");
        }
        return content;
    }

    static waitForTabLoad(tabId) {
        return new Promise((resolve) => {
            let complete = false;
            let timeoutId = null;
            let finish = () => {
                if (!complete) {
                    complete = true;
                    clearTimeout(timeoutId);
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            let listener = (updatedTabId, changeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === "complete") {
                    finish();
                }
            };
            timeoutId = setTimeout(finish, 20000);
            chrome.tabs.onUpdated.addListener(listener);
            chrome.tabs.get(tabId, (tab) => {
                if (tab?.status === "complete") {
                    finish();
                }
            });
        });
    }

    buildChapter(sourceDom, url, content) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = this.findChapterTitle(sourceDom);
        if (title != null) {
            let titleNode = newDoc.dom.createElement("h1");
            titleNode.textContent = title.textContent.trim();
            newDoc.content.appendChild(titleNode);
        }

        if (content == null) {
            throw Error("sbxh returned empty decoded novel content");
        }
        if (content.kind === "html" && typeof content.html === "string") {
            let sanitized = util.sanitize(content.html);
            util.moveChildElements(sanitized.body, newDoc.content);
        } else if (content.kind === "text-shuffled") {
            throw Error(
                "sbxh returned shuffled text content outside the page viewer",
            );
        } else {
            let text = Sbxh1Parser.contentToText(content);
            Sbxh1Parser.addTextParagraphs(newDoc, text);
        }
        return newDoc.dom;
    }

    isCustomError(response) {
        return response.responseXML?.title === "Just a moment...";
    }

    setCustomErrorResponse(url, wrapOptions, checkedresponse) {
        return {
            url: url,
            wrapOptions: wrapOptions,
            response: {
                url: checkedresponse.response.url,
                status: 403,
                retryDelay: [80, 40, 20, 10, 5],
            },
            errorMessage:
                "sbxh returned a Cloudflare challenge. Open the page in the browser, pass the check, then retry.",
        };
    }

    static extractNovelId(url) {
        return new URL(url).pathname.match(/^\/novel\/(\d+)/)?.[1] ?? null;
    }

    static isEpisodeUrl(url, novelId) {
        return (
            new URL(url).pathname.match(new RegExp(`^/novel/${novelId}/\\d+$`)) !=
            null
        );
    }

    static extractEpisodeNumber(title) {
        let match = title.match(/(\d+)\s*화/);
        return match == null ? null : parseInt(match[1], 10);
    }

    static isBetterEpisodeTitle(candidate, existing) {
        let candidateHasNumber = /^\d+\s*화\b/.test(candidate);
        let existingHasNumber = /^\d+\s*화\b/.test(existing);
        return (
            (candidateHasNumber && !existingHasNumber) ||
            (candidateHasNumber === existingHasNumber &&
                candidate.length > existing.length)
        );
    }

    static extractViewerInfo(dom) {
        let scripts = [...dom.querySelectorAll("script")]
            .map((s) => s.textContent)
            .join("\n");
        let token = Sbxh1Parser.extractScriptValue(scripts, "token");
        let tokenInfo = Sbxh1Parser.extractTokenInfo(token);
        let ret = {
            novelId:
                tokenInfo?.novelId ??
                Sbxh1Parser.extractScriptValue(scripts, "novelId"),
            episodeId:
                tokenInfo?.episodeId ??
                Sbxh1Parser.extractScriptValue(scripts, "episodeId"),
            episodeNo: Sbxh1Parser.extractScriptValue(scripts, "episodeNo"),
            token: token,
            cookieName: Sbxh1Parser.extractScriptValue(scripts, "cookieName"),
        };
        return Object.values(ret).every((v) => v != null) ? ret : null;
    }

    static extractScriptValue(text, name) {
        let escaped = text.match(new RegExp(`${name}\\\\?":\\\\?"([^"\\\\]+)`));
        return escaped?.[1] ?? null;
    }

    static extractTokenInfo(token) {
        if (token == null) {
            return null;
        }
        try {
            let json = JSON.parse(
                new TextDecoder("utf-8").decode(
                    Sbxh1Parser.base64UrlToBytes(token.split(".")[0]),
                ),
            );
            return {
                novelId: json.n,
                episodeId: json.e,
            };
        } catch {
            return null;
        }
    }

    static async setApiRequestHeaders(baseUrl, refererUrl) {
        let hostname = new URL(baseUrl).hostname;
        let rules = [
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        { header: "origin", operation: "set", value: baseUrl },
                        { header: "referer", operation: "set", value: refererUrl },
                    ],
                },
                condition: { urlFilter: `${hostname}/api/` },
            },
        ];
        await HttpClient.setDeclarativeNetRequestRules(rules);
    }

    static extractTabIdFromQueryParameter() {
        let tabId = new URLSearchParams(window.location.search).get("id");
        return util.isNullOrEmpty(tabId) ? null : parseInt(tabId, 10);
    }

    static async getCookie(url, name) {
        let cookieApi = util.isFirefox() ? browser.cookies : chrome.cookies;
        return await cookieApi.get({ url: url, name: name });
    }

    static makeNonce() {
        let bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        return Sbxh1Parser.bytesToBase64Url(bytes);
    }

    static async hmacSha256Base64Url(secret, data) {
        let encoder = new TextEncoder();
        let key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        let signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
        return Sbxh1Parser.bytesToBase64Url(new Uint8Array(signature));
    }

    static async decodePayload(payload, origin, cookieName, novelId, episodeId) {
        let cookie = await Sbxh1Parser.getCookie(origin, cookieName);
        if (cookie == null) {
            throw Error("Unable to decode sbxh novel content");
        }
        let key = await Sbxh1Parser.makePayloadKey(
            cookie.value,
            novelId,
            episodeId,
        );
        let payloadBytes = Sbxh1Parser.base64UrlToBytes(payload);
        if (payloadBytes.length < 28) {
            throw Error("sbxh returned short novel content payload");
        }
        let decoded = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: payloadBytes.slice(0, 12), tagLength: 128 },
            key,
            payloadBytes.slice(12),
        );
        let text = new TextDecoder("utf-8").decode(decoded);
        if (text.startsWith("{")) {
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        }
        return text;
    }

    static async makePayloadKey(cookie, novelId, episodeId) {
        let seed = Sbxh1Parser.base64UrlToBytes(cookie.split(".")[0] ?? "");
        let suffix = new TextEncoder().encode(`:${novelId}:${episodeId}:v3`);
        let data = new Uint8Array(seed.length + suffix.length);
        data.set(seed, 0);
        data.set(suffix, seed.length);
        let digest = await crypto.subtle.digest("SHA-256", data);
        return await crypto.subtle.importKey(
            "raw",
            digest,
            { name: "AES-GCM" },
            false,
            ["decrypt"],
        );
    }

    static contentToText(content) {
        if (content.kind === "text" && Array.isArray(content.paragraphs)) {
            return content.paragraphs.join("\n\n");
        }
        if (content.kind === "text" && typeof content.text === "string") {
            return content.text;
        }
        return String(content);
    }

    static base64UrlToBytes(data) {
        let padding =
            data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
        let binary = atob(data.replace(/-/g, "+").replace(/_/g, "/") + padding);
        return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    }

    static bytesToBase64Url(bytes) {
        let binary = "";
        for (let byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }

    static addTextParagraphs(newDoc, text) {
        let paragraphs = text
            .split(/\n{2,}/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        for (let paragraph of paragraphs) {
            let p = newDoc.dom.createElement("p");
            p.textContent = paragraph;
            newDoc.content.appendChild(p);
        }
    }
}
