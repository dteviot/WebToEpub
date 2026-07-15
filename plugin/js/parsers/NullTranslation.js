"use strict";

parserFactory.register(
    "nulltranslation.com",
    () => new NullTranslationParser(),
);

/**
 * nulltranslation uses Next.js (RSC), chapter content is an AES-GCM-encrypted blob
 * Chapter list and metadata are inside `self.__next_f.push` inline scripts
 * Chapter page isfetched with the `RSC: 1` header it returns the raw flight stream
 * 1 row has `chapterContent` prop pointing (via `$<id>`) at `<id>:A<hexLen>,<raw bytes>`..
 * those bytes are `IV (12) || ciphertext || GCM tag (16)` and are decrypted with a key from /api/chapter/key
 */
class NullTranslationParser extends Parser {
    static BASE_URL = "https://nulltranslation.com";

    // RSC row-id header
    static RSC_ROW_SPLIT = /\n(?=[0-9a-zA-Z]+:)/;
    // `self.__next_f.push([1,"..."])` payload
    static NEXT_F_PUSH_RE =
        /self\.__next_f\.push\(\[\s*1\s*,\s*(['"])([\s\S]*?)\1\s*\]\)/;
    // bin hint row: `<id>:A<hexLength>,` raw bytes after the comm,a
    static BINARY_HINT_RE = (id) => new RegExp(`${id}:A([0-9a-fA-F]+),`);
    // IV length for the AES-GCM payload
    static GCM_IV_LENGTH = 12;
    // chunk size for the byte->string conv
    static BINARY_CHUNK = 0x8000;

    constructor() {
        super();
        this.bookInfo = null;
        this.nextDataChunks = null;
        this.bookId = null;
    }

    // parse the inline scripts into Map<row-id,payload>
    _parseNextData(dom) {
        if (this.nextDataChunks) {
            return this.nextDataChunks;
        }
        let stream = "";
        for (const script of dom.querySelectorAll("script")) {
            const m = NullTranslationParser.NEXT_F_PUSH_RE.exec(script.textContent);
            if (m?.[2]) {
                stream += NullTranslationParser._unescapePushPayload(m[2]) + "\n";
            }
        }
        this.nextDataChunks = NullTranslationParser._parseRscStream(stream);
        return this.nextDataChunks;
    }

    // parse raw RSC staream
    static _parseRscStream(stream) {
        const chunks = new Map();
        for (const line of stream.split(NullTranslationParser.RSC_ROW_SPLIT)) {
            const sep = line.indexOf(":");
            if (sep === -1) {
                continue;
            }
            chunks.set(line.slice(0, sep), line.slice(sep + 1));
        }
        return chunks;
    }

    static _unescapePushPayload(raw) {
    // it's a JS string literal so have to unescape
        return raw
            .replace(/\\\\/g, "\\")
            .replace(/\\'/g, "'")
            .replace(/\\"/g, "\"")
            .replace(/\\n/g, "\n");
    }

    // find first chunk payload (containing needle)
    static _findChunkContaining(chunks, needle) {
        for (const payload of chunks.values()) {
            if (payload.includes(needle)) {
                return payload;
            }
        }
        return undefined;
    }

    static _tryJson(text) {
        try {
            return JSON.parse(text);
        } catch {
            return undefined;
        }
    }

    // meta
    _getOrParseBookInfo(dom) {
        if (this.bookInfo) {
            return this.bookInfo;
        }
        const chunk = NullTranslationParser._findChunkContaining(
            this._parseNextData(dom),
            "\"book\":{\"id\":",
        );
        if (chunk) {
            this.bookInfo =
        NullTranslationParser._tryJson(/"book":(\{[^}]*\})/.exec(chunk)?.[1]) ??
        null;
        }
        return this.bookInfo;
    }

    getBookId(dom) {
        if (this.bookId) {
            return this.bookId;
        }
        if (dom?.baseURI) {
            const m = /\/book\/([^/]+)/.exec(dom.baseURI);
            if (m) {
                this.bookId = m[1];
            }
        }
        if (!this.bookId) {
            console.error(
                "[NullTranslationParser] getBookId: could not extract bookId from DOM.baseURI",
            );
        }
        return this.bookId;
    }

    getChapterId(url) {
        return url.split("/").pop();
    }

    extractTitleImpl(dom) {
        const title = this._getOrParseBookInfo(dom)?.title ?? "Title Not Found";
        const h1 = dom.createElement("h1");
        h1.textContent = title;
        return h1;
    }

    extractAuthor(dom) {
        return this._getOrParseBookInfo(dom)?.author ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        const chunk = NullTranslationParser._findChunkContaining(
            this._parseNextData(dom),
            "cdn.nulltranslation.com",
        );
        return (
            /"src":"(https:\/\/cdn\.nulltranslation\.com\/[^"]+)"/.exec(
                chunk ?? "",
            )?.[1] ?? super.findCoverImageUrl(dom)
        );
    }

    async getChapterUrls(dom) {
        this.getBookId(dom);
        const chunk = NullTranslationParser._findChunkContaining(
            this._parseNextData(dom),
            "\"chaptersIn\":[",
        );
        if (!chunk) {
            console.error(
                "[NullTranslationParser] getChapterUrls: chapter list chunk not found",
            );
            return [];
        }
        const chapters = NullTranslationParser._tryJson(
            /"chaptersIn":(\[.*?\])/.exec(chunk)?.[1],
        );
        if (!Array.isArray(chapters)) {
            console.error(
                "[NullTranslationParser] getChapterUrls: failed to parse chaptersIn array",
            );
            return [];
        }
        return chapters.map((c) => ({
            sourceUrl: `${NullTranslationParser.BASE_URL}/book/${c.bookId}/chapter/${c.id}`,
            title: c.title.trim(),
        }));
    }

    findContent(dom) {
        return dom.querySelector("div");
    }

    // fetch

    async fetchChapter(url) {
        const bookId = this.getBookId();
        const chapterId = this.getChapterId(url);
        if (!bookId) {
            throw new Error(
                "[NullTranslationParser] fetchChapter: cached bookId is missing",
            );
        }

        // /api/chatper/key needs Referer header with teh appropriate chapter URL
        await HttpClient.setDeclarativeNetRequestRules([
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        { header: "referer", operation: "set", value: url },
                        {
                            header: "origin",
                            operation: "set",
                            value: NullTranslationParser.BASE_URL,
                        },
                    ],
                },
                condition: {
                    urlFilter: `*://${new URL(NullTranslationParser.BASE_URL).hostname}/*`,
                    resourceTypes: ["xmlhttprequest"],
                },
            },
        ]);

        const chapterResponse = await HttpClient.wrapFetch(
            `${NullTranslationParser.BASE_URL}/book/${bookId}/chapter/${chapterId}`,
            { fetchOptions: { headers: { RSC: "1" } } },
        );
        if (!chapterResponse?.arrayBuffer) {
            throw new Error(
                "[NullTranslationParser] fetchChapter: response had no arrayBuffer",
            );
        }

        const stream = NullTranslationParser.arrayBufferToBinaryString(
            chapterResponse.arrayBuffer,
        );

        const keyResponse = await HttpClient.fetchJson(
            `${NullTranslationParser.BASE_URL}/api/chapter/key`,
        );
        const base64Key = keyResponse?.json?.key;
        if (!base64Key) {
            throw new Error(
                "[NullTranslationParser] fetchChapter: decryption key missing from /api/chapter/key",
            );
        }

        return this.buildChapter(stream, base64Key, url);
    }

    // ArrayBuffer to safe string where charCodeAt(i) == bytes[i] for every b0x00-0xFF
    // TextDecoder("iso-8859-1") / "latin1" doesn't work for some reason
    // so String.fromCharCode is used
    static arrayBufferToBinaryString(buffer) {
        const bytes = new Uint8Array(buffer);
        const parts = [];
        for (let i = 0; i < bytes.length; i += NullTranslationParser.BINARY_CHUNK) {
            parts.push(
                String.fromCharCode.apply(
                    null,
                    bytes.subarray(
                        i,
                        Math.min(i + NullTranslationParser.BINARY_CHUNK, bytes.length),
                    ),
                ),
            );
        }
        return parts.join("");
    }

    // AES-GCM payload (IV || ciphertext+tag) using raw base64 key
    // TODO: can be removed if internal decryption is not used (embed path only)
    async _decryptChapterContent({ encryptedData, b64Key }) {
        if (encryptedData.length <= NullTranslationParser.GCM_IV_LENGTH) {
            throw new Error("Ciphertext is empty or shorter than the IV");
        }
        const iv = encryptedData.slice(0, NullTranslationParser.GCM_IV_LENGTH);
        const ciphertext = encryptedData.slice(NullTranslationParser.GCM_IV_LENGTH);

        const keyRaw = atob(b64Key);
        const keyBytes = new Uint8Array(keyRaw.length);
        for (let i = 0; i < keyRaw.length; i++) {
            keyBytes[i] = keyRaw.charCodeAt(i);
        }

        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM" },
            false,
            ["decrypt"],
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            cryptoKey,
            ciphertext,
        );
        return new TextDecoder("utf-8").decode(decrypted);
    }

    async buildChapter(streamData, base64Key, url) {
        const newDoc = Parser.makeEmptyDocForContent(url);

        // find the component that refs the chunk
        const chunks = NullTranslationParser._parseRscStream(streamData);
        const componentPayload = NullTranslationParser._findChunkContaining(
            chunks,
            "\"chapterContent\"",
        );
        const contentId = /"chapterContent":"\$([^"]+)"/.exec(
            componentPayload ?? "",
        )?.[1];
        if (!contentId) {
            newDoc.content.textContent =
        "Chapter stream is invalid: could not find the chapterContent reference.";
            return newDoc.dom;
        }

        // find the binary hint
        const blobMatch =
      NullTranslationParser.BINARY_HINT_RE(contentId).exec(streamData);
        if (!blobMatch) {
            newDoc.content.textContent = `Could not find binary content row "${contentId}:A...," in the stream.`;
            return newDoc.dom;
        }
        const declaredLen = parseInt(blobMatch[1], 16);
        const blobStart = blobMatch.index + blobMatch[0].length;
        const blobString = streamData.substring(blobStart, blobStart + declaredLen);
        if (blobString.length !== declaredLen) {
            newDoc.content.textContent = `Encrypted content blob is truncated (expected ${declaredLen} bytes, got ${blobString.length}).`;
            return newDoc.dom;
        }

        const encryptedBytes = new Uint8Array(declaredLen);
        for (let i = 0; i < declaredLen; i++) {
            encryptedBytes[i] = blobString.charCodeAt(i);
        }

        // build chapter
        try {
            // we do it here
            // const plaintext = await this._decryptChapterContent({
            //     encryptedData: encryptedBytes,
            //     b64Key: base64Key,
            // });
            // NullTranslationParser.renderChapterText(plaintext, newDoc);

            // ..or we save the payload for post-processing
            NullTranslationParser.embedEncryptedChapter({
                newDoc, encryptedBytes, base64Key, url,
            });
        } catch (e) {
            console.error("[NullTranslationParser] buildChapter failed:", e);
            newDoc.content.textContent =
        "Decryption failed. The key may be incorrect or the content corrupted.";
        }

        return newDoc.dom;
    }

    // some of it was markdown so we do some basic rendering here
    // TODO: can be removed if internal decryption is not used (rendering moves to the mutator)
    static renderChapterText(text, newDoc) {
        const normalized = text.replace(/\r\n?/g, "\n").trim();
        if (!normalized) {
            newDoc.content.textContent = "";
            return;
        }

        const blocks = normalized.split(/\n\s*\n/);

        const fragment = newDoc.dom.createDocumentFragment();
        for (const block of blocks) {
            const trimmed = block.trim();
            if (!trimmed) {
                continue;
            }

            if (/^[-=]{3,}$/.test(trimmed)) {
                fragment.appendChild(newDoc.dom.createElement("hr"));
                continue;
            }

            const headingMatch = /^(.+?)\n([-]{3,}|[=]{3,})$/.exec(trimmed);
            if (headingMatch) {
                const h = newDoc.dom.createElement("h3");
                h.textContent = headingMatch[1].trim();
                fragment.appendChild(h);
                continue;
            }

            const p = newDoc.dom.createElement("p");
            p.innerHTML = NullTranslationParser.renderInlineMarkdown(trimmed).replace(
                /\n/g,
                "<br>",
            );
            fragment.appendChild(p);
        }

        const sanitized = util.sanitize(fragment);
        while (sanitized.body.firstChild) {
            newDoc.content.appendChild(sanitized.body.firstChild);
        }
    }

    // TODO: can be removed if internal decryption is not used (rendering moves to the mutator)
    static renderInlineMarkdown(text) {
        const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        return escaped
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    }

    // embed the chapter with attributes for post-process decrpytion
    static embedEncryptedChapter({ newDoc, encryptedBytes, base64Key, url }) {
    // base64-encode the raw bytes for attr
        let binary = "";
        for (
            let i = 0;
            i < encryptedBytes.length;
            i += NullTranslationParser.BINARY_CHUNK
        ) {
            binary += String.fromCharCode.apply(
                null,
                encryptedBytes.subarray(
                    i,
                    Math.min(
                        i + NullTranslationParser.BINARY_CHUNK,
                        encryptedBytes.length,
                    ),
                ),
            );
        }
        const container = newDoc.dom.createElement("div");
        container.className = "nulltranslation-encrypted";
        container.setAttribute("data-nt-encrypted", btoa(binary));
        container.setAttribute("data-nt-key", base64Key);
        container.setAttribute("data-nt-source", url);
        container.setAttribute(
            "data-nt-iv-length",
            String(NullTranslationParser.GCM_IV_LENGTH),
        );
        container.textContent =
      "[Encrypted chapter content]";
        newDoc.content.appendChild(container);
    }
}
