"use strict";

/**
 * NOTE: To add additional hostname/site support hard-coded hostnames used in
 *       implementation must also be fixed.
 */
parserFactory.register("fictionread.xyz", () => new FictionreadParser());

/**
 * Parser for the https://fictionread.xyz/ site.
 */
class FictionreadParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    /**
     * @private
     */
    removeOriginFromWebRequests = (() => {
        let done = false;

        return async () => {
            if (done)
                return;

            done = true;

            /**
             * Don't pass an origin header, because API fetches will fail if you
             * pass anything other than "fictionread.xyz" or nothing.
             * 
             * @type { chrome.declarativeNetRequest.Rule[] }
             */
            const fetchRules = [
                {
                    "id": 1,
                    "priority": 1,
                    "condition": {
                        "urlFilter": "fictionread.xyz",
                    },
                    "action": {
                        "type": "modifyHeaders",
                        "requestHeaders": [
                            {
                                "header": "origin",
                                "operation": "remove",
                            },
                        ]
                    }
                }
            ];

            await HttpClient.setDeclarativeNetRequestRules(fetchRules);
        };
    })();

    /**
     * @param { Document } dom
     * @param { string } url 
     * @param { string } body
     * @param { HeadersInit } headers
     * @private
     */
    async fetchFlightEndpoint(dom, url, body, headers) {
        this.removeOriginFromWebRequests();

        // Set header defaults, provided have priority.
        headers = {
            ...{
                //"x-from": "https://fictionread.xyz/"
            },
            ...headers
        };

        /** @type { RequestInit } */
        let fetchOptions = {
            method: "POST",
            credentials: "include",
            body: body,
            headers: headers,
        };
    
        const contentResponse = await HttpClient.wrapFetch(url, { fetchOptions: fetchOptions });
        const stringifier = contentResponse.makeTextDecoder(contentResponse.response);
        const bytes = new Uint8Array(contentResponse.arrayBuffer);

        const payload = FlightDecoder.from(bytes, { stringifier: stringifier, htmlBase: dom });

        return payload;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    async getChapterUrls(dom) {
        let novelID = /(?<=novel\/)(?<novelID>[^/?\s]+)(?=\/|\?|$)/.exec(dom.baseURI)?.groups?.["novelID"];

        if (!novelID)
            return null;

        const payload = (await this.fetchFlightEndpoint(
            dom,
            dom.baseURI,
            `["${ novelID }"]`,
            {
                // Magic value meaning: "Get the chapters ToC information".
                "Next-Action": "4faf3562c3dfac33c3861c1f0bc314f3e67e89c5",
            }
        ))?.chunks[0]?.decoded[0];

        return payload
            .filter(chapter => !chapter["premium"])
            .map(chapter => ({
                sourceUrl: `https://fictionread.xyz/chapter/${ chapter["_id"] }?n=${ novelID }`,
                title: `Chapter ${ chapter["no"] }: ${ chapter["title"]}`,
            }));
    }

    /**
     * @override
     * @param { string } url
     */
    async fetchChapter(url) {
        try {
            const chapterID = /\/(?<chapter>[^/?]+)\/?(?:\?|$)/.exec(url)?.groups?.["chapter"];

            if (!chapterID)
                return null;

            const { dom, content } = Parser.makeEmptyDocForContent(url);

            const payload = (await this.fetchFlightEndpoint(
                dom,
                url,
                `["${ chapterID }"]`,
                {
                    // Magic value meaning: "Get chapter content text".
                    "Next-Action": "d1519557e507ca98f7d048353337ed88be599264",
                },
            ))?.chunks[0]?.decoded[0];

            const title = dom.createElement("h1");
            title.textContent = `Chapter ${ payload["no"] }: ${ payload["title"] }`;
            content.appendChild(title);

            content.append(payload["content"]);

            return dom;
        } catch (e) {
            console.error(e);
            return;
        }
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractTitleImpl(dom) {
        return dom.querySelector("h2");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        return dom.querySelector("span:has(svg.lucide-pencil)")?.textContent?.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractDescription(dom) {
        return dom.querySelector("p.line-clamp-3")?.textContent?.trim();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractSubject(dom) {
        /** @type { NodeListOf<HTMLSpanElement> } */
        const spans = dom.querySelectorAll("div:has(> span:first-of-type svg) > span.p-1");

        return Array.from(spans, span => span.textContent.trim()).join(", ");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        /** @type { HTMLImageElement | null } */
        const cover = dom.querySelector("img[alt*='main']");

        if (!cover)
            return null;

        const url = new URL(cover?.src);
        
        return url.searchParams.get("url");
    }
}

/**
 * Parser/decoder class for the React "Flight" protocol mainly (if not only)
 * used by React Server Components (RSC).
 * 
 * @class
 */
class FlightDecoder {
    // #region Static Property Land

    /**
     * @private
     * @readonly
     */
    static DEFAULT_ENCODING = "UTF-8";

    // #endregion
    // #region Static Function Land

    /**
     * @overload
     * @param { Uint8Array } input
     * @param { object } [options]
     * @param { TextDecoder | ((bytes: Uint8Array) => string) } [options.stringifier]
     * @param { boolean } [options.parseModel]
     * @param { boolean } [options.parseHtml]
     * @param { Document | string } [options.htmlBase]
     * @returns { FlightDecoder }
     * @public
     */

    /**
     * @overload
     * @param { string } input
     * @param { object } [options]
     * @param { boolean } [options.parseModel]
     * @param { boolean } [options.parseHtml]
     * @param { Document | string } [options.htmlBase]
     * @returns { FlightDecoder }
     * @public
     */

    /**
     * @param { string | Uint8Array } input
     * @param { object } [options]
     * @param { TextDecoder | ((bytes: Uint8Array) => string) } [options.stringifier]
     * @param { boolean } [options.parseModel]
     * @param { boolean } [options.parseHtml]
     * @param { Document | string } [options.htmlBase]
     * @returns { FlightDecoder }
     * @public
     */
    static from(input, { stringifier, parseModel = true, parseHtml = true, htmlBase } = {}) {
        if (typeof input === "string") {
            const encoder = new TextEncoder();
            stringifier = new TextDecoder(encoder.encoding);
            input = encoder.encode(input);
        }

        if (!stringifier)
            stringifier = new TextDecoder(this.DEFAULT_ENCODING);

        stringifier = stringifier instanceof TextDecoder ? stringifier.decode.bind(stringifier) : stringifier;

        return new FlightDecoder(input, stringifier, { parseModel, parseHtml, htmlBase });
    }

    // #endregion
    // #region Instance Property Land

    /**
     * @type { Uint8Array }
     * @protected
     */
    bytes;

    /**
     * @type { (bytes: Uint8Array) => string }
     * @protected
     */
    stringifier;

    /**
     * @type { Document }
     * @protected
     */
    document;

    /**
     * @type { FlightChunk[] }
     * @public
     */
    chunks;

    // #endregion
    // #region Constructor Land

    /**
     * @constructor
     * @param { Uint8Array } bytes
     * @param { ((bytes: Uint8Array) => string) } stringifier
     * @param { object } [options]
     * @param { boolean } [options.parseModel]
     * @param { boolean } [options.parseHtml]
     * @param { Document | string } [options.htmlBase]
     * @private
     */
    constructor(bytes, stringifier, { parseModel, parseHtml, htmlBase } = {}) {
        this.bytes = bytes;
        this.stringifier = stringifier;
        this.document = document;

        const dataChunks = this.gatherChunkData();
        this.chunks = this.parseChunkData(dataChunks, { parseModel, parseHtml, htmlBase });
    }

    // #endregion
    // #region Byte Helper Land

    /**
     * @param { number } byte
     * @returns { boolean }
     * @protected
     */
    isHexByte(byte) {
        return (
            (   byte >= 48 && byte <= 57)  // Check for 0-9
            || (byte >= 65 && byte <= 70)  // Check for A-F
            || (byte >= 97 && byte <= 102) // Check for a-f
        );
    }

    /**
     * @param { number } byte 
     * @returns { number }
     * @protected
     */
    hexByteToValue(byte) {
        if (byte >= 48 && byte <= 57)  return byte - 48;
        if (byte >= 65 && byte <= 70)  return byte - 55;
        if (byte >= 97 && byte <= 102) return byte - 87;

        throw new Error("Invalid hex byte.");
    }

    // #endregion
    // #region Gathering Land

    /**
     * @returns { FlightChunkData[] }
     * @protected
     */
    gatherChunkData() {
        /** @type { FlightChunkData[] } */
        const chunks = [];

        let index = 0;

        while (index < this.bytes.length) {
            // Find hex value before ":" delimiter.
            const { nextIndex, value: id } = this.gatherHexValue(index, 58);
            index = nextIndex;

            if (index >= this.bytes.length)
                throw new Error("Bytes ended unexpectedly");

            switch (this.bytes[index]) {
                // It brokey :(
                case null:
                case undefined: {
                    throw new Error("Bytes ended unexpectedly.");
                }

                // Data length is prefixed.
                case 65:    // A - ArrayBuffer-ish buffer row
                case 71:    // G - Float32Array
                case 76:    // L - Int32Array
                case 77:    // M - BigInt64Array
                case 79:    // O - Int8Array
                case 83:    // S - Int16Array
                case 84:    // T - Text/string
                case 85:    // U - Uint8ClampedArray
                case 86:    // V - DataView
                case 98:    // b - Raw bytes
                case 103:   // g - Float64Array
                case 108:   // l - Uint32Array
                case 109:   // m - BigUint64Array
                case 111:   // o - raw buffer path
                case 115: { // s - Uint16Array
                    const { nextIndex, tag, subBytes } = this.gatherLengthChunk(index);
                    index = nextIndex;
                    chunks.push({ id: id, tag: tag, bytes: subBytes });
                    break;
                }

                // Newline delimited.
                case 35:    // # - Reserve, shouldn't actually be used.
                case 67:    // C - Stop command?
                case 68:    // D - Dev thing, shouldn't be a factor.
                case 69:    // E - Error chunk
                case 72:    // H - Hint chunk
                case 73:    // I - Module chunk
                case 74:    // J - Dev thing, shouldn't be a factor.
                case 78:    // N - Dev thing, shouldn't be a factor.
                case 82:    // R - Readable stream
                case 87:    // W - Dev thing, shouldn't be a factor.
                case 88:    // X - Async iterable
                case 114:   // r - Readable byte stream
                case 120: { // x - Async byte iterable
                    const { nextIndex, tag, subBytes } = this.gatherTaggedNewlineChunk(index);
                    index = nextIndex;
                    chunks.push({ id: id, tag: tag, bytes: subBytes });
                    break;
                }

                // Assume it's a newline delimited chunk without a tag.
                default: {
                    const { nextIndex, subBytes } = this.gatherNewlineChunk(index);
                    index = nextIndex;
                    chunks.push({ id: id, tag: null, bytes: subBytes });
                    break;
                }
            }
        }

        return chunks;
    }

    /**
     * @param { number } index 
     * @param { number } delimiter 
     * @returns { { nextIndex: number, value: number } }
     * @protected
     */
    gatherHexValue(index, delimiter) {
        let value = 0;

        // Gather bytes until `delimiter`.
        while (index < this.bytes.length) {
            const byte = this.bytes[index];
            
            // If it is the delimiter we're done.
            if (byte === delimiter)
                break; 

            if (byte == null || !this.isHexByte(byte))
                throw new Error("Expected hex byte.");

            // Builds ID byte by byte as little endian.
            value = (value << 4) + this.hexByteToValue(byte); 

            index++;
        }

        // Jump over delimiter.
        index++;

        return { nextIndex: index, value: value };
    }

    /**
     * @param { number } index 
     * @returns { { nextIndex: number, tag: number, subBytes: Uint8Array } }
     * @protected
     */
    gatherLengthChunk(index) {
        const tag = this.bytes[index];

        if (!tag)
            throw new Error("A dev did something wrong here.");

        index++;

        // Gather hex value before "," delimiter.
        const { nextIndex, value: length } = this.gatherHexValue(index, 44);
        index = nextIndex;

        if (index >= this.bytes.length)
            throw new Error("Bytes ended unexpectedly.");

        const startIndex = index;
        const endIndex = index + length;

        if (endIndex > this.bytes.length)
            throw new Error("Specified length exceeds bytes.");

        index = endIndex;

        return {
            nextIndex: index,
            tag: tag,
            subBytes: this.bytes.subarray(startIndex, endIndex),
        };
    }

    /**
     * @param { number } index 
     * @returns { { nextIndex: number, subBytes: Uint8Array } }
     * @protected
     */
    gatherNewlineChunk(index) {
        const startIndex = index;

        // Walk until we find a newline.
        while (index < this.bytes.length && this.bytes[index] !== 10)
            index++;

        // NOTE: You could check if the current byte is a newline, and throw
        //       if it isn't; and that would be correct. But why?

        // Jump over delimiter.
        index++;

        return {
            nextIndex: index,
            subBytes: this.bytes.subarray(startIndex, index - 1), // Don't include the delimiter.
        };
    }

    /**
     * @param { number } index 
     * @returns { { nextIndex: number, tag: number, subBytes: Uint8Array } }
     * @protected
     */
    gatherTaggedNewlineChunk(index) {
        const tag = this.bytes[index];

        if (!tag)
            throw new Error("A dev did something wrong here.");

        index++;

        return { ...this.gatherNewlineChunk(index), tag: tag };
    }

    // #endregion
    // #region Parsing Land

    /**
     * @param { FlightChunkData[] } dataChunks
     * @param { object } [options]
     * @param { boolean } [options.parseModel]
     * @param { boolean } [options.parseHtml]
     * @param { Document | string } [options.htmlBase]
     * @returns { FlightChunk[] }
     * @protected
     */
    parseChunkData(dataChunks, { parseModel, parseHtml, htmlBase } = {}) {
        /**
         * @type { FlightChunk[] }
         */
        const chunks = [];

        for (const dataChunk of dataChunks) {
            try {
                switch (dataChunk.tag) {
                    // Untagged chunks.
                    case null: {             
                        // Assume everything is a model not just raw JSON.           
                        if (parseModel) {
                            chunks.push(new ModelFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes, this.stringifier));
                            break;
                        }

                        chunks.push(new JsonFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes, this.stringifier));
                        break;
                    }

                    // Text chunks.
                    case 84: {
                        if (parseHtml) {
                            /*
                             * HTML chunks are not in the real spec, just a QoL
                             * type, so there is no unique identifier for it.
                             */
                            try {
                                chunks.push(new HtmlFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes, this.stringifier, { htmlBase }));
                                break;
                            } catch (_) {} // eslint-disable-line no-empty
                        }

                        chunks.push(new TypedFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes, this.stringifier));
                        break;
                    }

                    // Error chunk.
                    case 69: {
                        chunks.push(new ErrorFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes, this.stringifier));
                        break;
                    }

                    // All others are unhandled.
                    default: {
                        chunks.push(new UnhandledFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes));
                        break;
                    }
                }
            } catch (error) {
                // If a real constructor throws try to not die entirely.
                chunks.push(new BrokenFlightChunk(dataChunk.id, dataChunk.tag, dataChunk.bytes, error));
            }
        }

        const chunksById = new Map(chunks.filter(chunk => chunk instanceof TypedFlightChunk).map(chunk => [chunk.id, chunk]));

        // Connect any model references to the appropriate.
        chunks
            .filter(chunk => chunk instanceof ModelFlightChunk)
            .flatMap(chunk => chunk.references)
            .forEach(reference => reference.chunk = chunksById.get(reference.id));

        return chunks;
    }

    // #endregion
}

// #region Helper Class Land
// #region Chunk Class Land

/**
 * @class
 * @implements { FlightChunkData }
 * @abstract
 */
class FlightChunk {
    /**
     * @type { number }
     * @public
     */
    id;

    /**
     * @type { number | null }
     * @public
     */
    tag;

    /**
     * @type { Uint8Array }
     * @public
     */
    bytes;

    /**
     * @param { number } id 
     * @param { number | null } tag
     * @param { Uint8Array } bytes
     * @protected
     */
    constructor(id, tag, bytes) {
        this.id = id;
        this.tag = tag;
        this.bytes = bytes;
    }
}

/**
 * @class
 * @extends { FlightChunk }
 */
class UnhandledFlightChunk extends FlightChunk {
    /**
     * @param { number } id 
     * @param { number | null } tag
     * @param { Uint8Array } bytes
     * @public
     */
    constructor(id, tag, bytes) {
        super(id, tag, bytes);
    }
}

/**
 * @class
 * @extends { FlightChunk }
 */
class BrokenFlightChunk extends FlightChunk {
    /**
     * @type { any }
     * @public
     */
    error;

    /**
     * @param { number } id 
     * @param { number | null } tag
     * @param { Uint8Array } bytes
     * @param { any } error
     * @public
     */
    constructor(id, tag, bytes, error) {
        super(id, tag, bytes);
        this.error = error;
    }
}

/**
 * @template T
 * @class
 * @extends { FlightChunk }
 */
class TypedFlightChunk extends FlightChunk {
    /**
     * @override
     * @type { 84 | 69 | null }
     * @public
     */
    tag;

    /**
     * @type { T }
     * @public
     */
    decoded;
    
    /**
     * @param { number } id 
     * @param { 84 | 69 | null } tag
     * @param { Uint8Array } bytes
     * @param { (bytes: Uint8Array) => T } decoder 
     * @public
     */
    constructor(id, tag, bytes, decoder) {
        if (tag !== 84 && tag !== 69 && tag !== null)
            throw new Error("Not a supported typed chunk.");

        super(id, tag, bytes);
        this.tag = tag;
        this.decoded = decoder(this.bytes);
    }
}

/**
 * @class
 * @extends { TypedFlightChunk<Document | DocumentFragment> }
 */
class HtmlFlightChunk extends TypedFlightChunk {
    /**
     * @override
     * @type { 84 }
     * @public
     */
    tag;

    /**
     * @param { number } id 
     * @param { 84 } tag
     * @param { Uint8Array } bytes
     * @param { (bytes: Uint8Array) => string } stringifier 
     * @param { object } [options]
     * @param { Document | string } [options.htmlBase]
     * @public
     */
    constructor(id, tag, bytes, stringifier, { htmlBase } = {}) {
        if (tag !== 84)
            throw new Error("Not a text chunk.");

        super(id, tag, bytes, function(bytes) {
            return HtmlFlightChunk.defaultStringToHtml(stringifier(bytes), { htmlBase });
        });

        this.tag = tag;
    }

    /**
     * @param { string } stringified 
     * @param { object } [options]
     * @param { Document | string } [options.htmlBase]
     * @returns { Document | DocumentFragment }
     * @protected
     */
    static defaultStringToHtml(stringified, { htmlBase = document } = {}) {
        if (!HtmlFlightChunk.looksLikeHTML(stringified))
            throw new Error("Decoded doesn't look like HTML.");

        const sanitized = DOMPurify.sanitize(stringified);

        // Pure paranoia to check again.
        if (!HtmlFlightChunk.looksLikeHTML(sanitized))
            throw new Error("Sanitized doesn't look like HTML.");

        if (HtmlFlightChunk.looksLikeFullDocument(sanitized)) {
            const dom = new DOMParser().parseFromString(sanitized, "text/html");
            
            util.setBaseTag(typeof htmlBase === "string" ? htmlBase : htmlBase.baseURI, dom);

            return dom;
        }

        const dom = typeof htmlBase === "string"
            ? Parser.makeEmptyDocForContent(htmlBase).dom
            : htmlBase;

        const context = dom.createElement("div");
        context.innerHTML = sanitized;

        const fragment = dom.createDocumentFragment();
        fragment.append(...context.childNodes);

        return fragment;
    }

    /**
     * @param { string } string 
     * @returns { boolean }
     * @public
     */
    static looksLikeHTML(string) {
        return /^(?:<!doctype html\b[\s\S]*|<!--[\s\S]*-->|<([a-z][a-z0-9-]*)\b[^>]*>[\s\S]*<\/\1>|<([a-z][a-z0-9-]*)\b[^>]*\/?>)$/.test(string);
    }

    /**
     * @param { string } string 
     * @returns { boolean }
     * @public
     */
    static looksLikeFullDocument(string) {
        return /^\s*<!doctype\s+html\b/i.test(string) || /<html\b/i.test(string);
    }
}

/**
 * @class
 * @template [T=JsonTypes]
 * @extends { TypedFlightChunk<Circular<T>> }
 */
class JsonFlightChunk extends TypedFlightChunk {
    /**
     * @override
     * @type { 69 | null }
     * @public
     */
    tag;

    /**
     * @param { number } id 
     * @param { 69 | null } tag 
     * @param { Uint8Array } bytes 
     * @param { (bytes: Uint8Array) => string } stringifier 
     * @param { object } [options]
     * @param { JsonReviver<T> } [options.reviver]
     */
    constructor(id, tag, bytes, stringifier, { reviver } = {}) {
        if (tag !== 69 && tag !== null)
            throw new Error("Not a json chunk.");

        super(id, tag, bytes, function(bytes) {
            return JSON.parse(stringifier(bytes), reviver);
        });
        this.tag = tag;
    }
}

/**
 * @class
 * @extends { JsonFlightChunk<any> }
 */
class ModelFlightChunk extends JsonFlightChunk {
    /**
     * @type { FlightModel<any>[] }
     * @public
     */
    models;

    /**
     * @type { FlightReference<any>[] }
     * @public
     */
    get references() {
        return this.models.filter(model => model instanceof FlightReference);
    }

    /**
     * @param { number } id 
     * @param { 69 | null } tag 
     * @param { Uint8Array } bytes 
     * @param { (bytes: Uint8Array) => string } stringifier 
     */
    constructor(id, tag, bytes, stringifier) {
        /** @type { FlightModel<any>[] } */
        const models = [];

        /**
         * @type { JsonReviver<any> }
         */
        const reviver = function(key, value, context) { // eslint-disable-line no-unused-vars
            if (!value || typeof value !== "string" || value.length < 1 || value.at(0) !== "$")
                return value;

            // Special model used to represent an element; ignore for now.
            if (value.length === 1)
                return value;

            switch (value.at(1)) {
                // Ignore these for now.
                case "L":   // Lazy react node.
                case "S":   // Symbol reference.
                case "h":   // Server reference.
                case "T":   // Temporary reference.
                case "Q":   // Map
                case "W":   // Set
                case "B":   // Blob
                case "K":   // FormData
                case "Z":   // Error
                case "i":   // Iterator
                case "I":   // Infinity
                case "-":   // -0 or -Infinity
                case "N":   // NaN
                case "u":   // Undefined; matches $undefined.
                case "n":   // BigInt
                case "P":   // Dev-only
                case "E":   // Dev-only
                case "Y":   // Dev-only
                    return value;

                case "D":   // Date
                    models.push(new FlightValue(this, key, value, new Date(value.slice(2))));
                    return value;

                // The ones we care about for now.
                case "$":   // Escaped string value.
                    models.push(new FlightValue(this, key, value, value.slice(1)));
                    return value;

                case "@": // Async chunk reference.
                    models.push(new FlightReference(this, key, value, parseInt(value.slice(2), 16)));
                    return value;

                // Assume chunk reference
                default: {
                    models.push(new FlightReference(this, key, value, parseInt(value.slice(1), 16)));
                    return value;
                }
            }            
        };

        super(id, tag, bytes, stringifier, { reviver });
        this.models = models;
    }
}

/**
 * @class
 * @extends { ModelFlightChunk }
 */
class ErrorFlightChunk extends ModelFlightChunk {
    /**
     * @override
     * @type { 69 }
     * @public
     */
    tag;

    /**
     * 
     * @param { number} id 
     * @param { 69 } tag 
     * @param { Uint8Array } bytes 
     * @param { (bytes: Uint8Array) => string } stringifier 
     */
    constructor(id, tag, bytes, stringifier) {
        super(id, tag, bytes, stringifier);
        this.tag = tag;
    }
}

// #endregion
// #region Model Class Land

/**
 * @template T
 * @class
 */
class FlightModel {
    /**
     * @type { object }
     * @protected
     */
    _target;

    /**
     * @returns { object }
     * @public
     */
    get target() {
        return this._target;
    }

    /**
     * @type { string }
     * @protected
     */
    _key;

    /**
     * @returns { string }
     * @public
     */
    get key() {
        return this._key;
    }

    /**
     * @type { string }
     * @protected
     */
    _original;

    /**
     * @returns { string }
     * @public
     */
    get original() {
        return this._original;
    }

    /**
     * @abstract
     * @returns { T }
     * @public
     */
    get value() {
        throw new Error("Abstract method not implemented.");
    }

    /**
     * @abstract
     * @param { T } value 
     * @returns { void }
     * @public
     */
    set value(value) {
        throw new Error("Abstract method not implemented.");
    }

    /**
     * @abstract
     * @param { object } target 
     * @param { string } key 
     * @param { string } original 
     * @protected
     */
    constructor(target, key, original) {
        this._target = target;
        this._key = key;
        this._original = original;
    }

    /**
     * @returns { void }
     * @public
     */
    attach() {
        Object.defineProperty(
            this.target,
            this.key,
            {
                get: () => {
                    return this.value;
                },
                set: (value) => {
                    this.value = value;
                },
                configurable: true,
                enumerable: true,
            }
        );
    }

    /**
     * @returns { void }
     * @public
     */
    detach() {
        Object.defineProperty(
            this.target,
            this.key,
            {
                value: this.original,
                configurable: true,
                enumerable: true,
                writable: true,
            }
        );
    }
}

/**
 * @template T
 * @class
 * @extends { FlightModel<T> }
 */
class FlightValue extends FlightModel {
    /**
     * @type { T }
     * @protected
     */
    _resolved;

    /**
     * @returns { T }
     * @public
     */
    get resolved() {
        return this._resolved;
    }

    /**
     * @override
     * @returns { T }
     * @public
     */
    get value() {
        return this.resolved;
    }

    /**
     * @override
     * @param { T } value
     * @returns { void }
     * @public
     */
    set value(value) {
        this._resolved = value;
    }

    /**
     * @param { object } target
     * @param { string } key 
     * @param { string } original 
     * @param { T } resolved
     */ 
    constructor(target, key, original, resolved) {
        super(target, key, original);
        this._resolved = resolved;
    }
}

/**
 * @template T
 * @class
 * @extends { FlightModel<T | string> }
 */
class FlightReference extends FlightModel {
    /**
     * @type { number }
     * @protected
     */
    _id;

    /**
     * @returns { number }
     * @public
     */
    get id() {
        return this._id;
    }

    /**
     * @type { TypedFlightChunk<T> | undefined }
     * @protected
     */
    _chunk;

    /**
     * @returns { TypedFlightChunk<T> | undefined }
     * @public
     */
    get chunk() {
        return this._chunk;
    }

    /**
     * @param { TypedFlightChunk<T> | undefined } chunk
     * @returns { void }
     * @public
     */
    set chunk(chunk) {
        this._chunk = chunk;
        if (chunk)
            this.attach();
        else
            this.detach();
    }

    /**
     * @override
     * @returns { string | T }
     * @public
     */
    get value() {
        return this.chunk?.decoded ?? this.original;
    }

    /**
     * @override
     * @param { T } value
     * @returns { void }
     */
    set value(value) {
        if (this.chunk)
            this.chunk.decoded = value;
    }

    /**
     * @param { object } target
     * @param { string } key
     * @param { string } original 
     * @param { number } id
     * @public
     */
    constructor(target, key, original, id) {
        super(target, key, original);
        this._id = id;
    }
}

// #endregion
// #endregion
// #region JSDOC Typedef Land

/**
 * @typedef { object } FlightChunkData
 * @property { number } id
 * @property { number | null } tag
 * @property { Uint8Array } bytes
 */

/**
 * @template T
 * @typedef { T | CircularArray<T> | CircularObject<T> } Circular
 */

/**
 * @template VT
 * @typedef { Circular<VT>[] } CircularArray
 */

/**
 * @template VT
 * @typedef { { [key: string]: Circular<VT> } } CircularObject
 */

/**
 * @typedef { string | number | boolean | null } JsonTypes
 */

/**
 * @typedef { Circular<JsonTypes> } Json
 */

/**
 * @template [T=JsonTypes]
 * @callback JsonReviver
 * @this { CircularObject<T> | CircularArray<T> | { "": Circular<T> } }
 * @param { string } key
 * @param { Circular<T> } value
 * @param { { source: string } } [context]
 * @returns { Circular<T> | undefined }
 */

// #endregion
