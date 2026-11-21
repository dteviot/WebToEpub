// Ai generated Gemini 4 Hydrogen
"use strict";

parserFactory.register("69shuba.tw", () => new _69shubaTwParser());

class _69shubaTwParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let bookUrl = dom.baseURI || "https://69shuba.tw/";
        let tocDom = dom;
        let tocLink = dom.querySelector(".book-op a[href*='/indexlist/']")
        || dom.querySelector(".book-op > tbody tr td:nth-child(2) a");

        if (tocLink) {
            this.tocURL = tocLink.href;
            await this.setRequestHeaders(bookUrl);
            tocDom = (await HttpClient.wrapFetch(tocLink.href)).responseXML;
        } else if (dom.querySelector("ul.last9 span.ch-item, #indexselect-top")) {
            this.tocURL = bookUrl;
        } else {
            throw new Error("Unable to locate 69shuba.tw table of contents.");
        }

        await this.setRequestHeaders(this.tocURL);

        let firstDecoded = this.decodeTocPage(tocDom);
        let options = [...tocDom.querySelectorAll("#indexselect-top option")];
        let totalPages = options.length || 1;
        let selectedIndex = options.findIndex(o => o.hasAttribute("selected"));
        let currentPage = selectedIndex >= 0 ? selectedIndex + 1 : 1;
        let baseUrl = tocDom.baseURI || "https://69shuba.tw/";

        let chapters = [];
        for (let page = 1; page <= totalPages; page++) {
            let pageChapters;
            if (page === currentPage) {
                pageChapters = firstDecoded.chapters;
            } else {
                let pagePath = page === 1
                ? firstDecoded.page1Path
                : (firstDecoded.pagePrefix + String(page) + firstDecoded.pageSuffix);
                if (!pagePath) {
                    continue;
                }
                let pageUrl = new URL(pagePath, baseUrl).href;
                await this.waitBetweenRequests();
                let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;
                pageChapters = this.decodeTocPage(pageDom).chapters;
            }
            if (pageChapters.length > 0) {
                chapterUrlsUI?.showTocProgress(pageChapters);
                chapters.push(...pageChapters);
            }
        }

        return chapters;
    }

    async waitBetweenRequests() {
        if (this.userPreferences != null) {
            await this.rateLimitDelay();
        } else {
            await util.sleep(this.minimumThrottle);
        }
    }

    decodeTocPage(pageDom) {
        let baseUrl = pageDom.baseURI || "https://69shuba.tw/";
        let decoded = SixNineShubaTwDecoder.extractAndRun(pageDom, "ul.last9");

        if (!decoded) {
            let nodes = [...pageDom.querySelectorAll(".last9 li:not(.title) :is(a, span.protected-chapter-link)")];
            let links = nodes.map(el => {
                if (el.tagName === "A") {
                    return el;
                }
                let a = pageDom.createElement("a");
                a.href = new URL(el.dataset.cidUrl, baseUrl).href;
                a.textContent = el.textContent.trim();
                return a;
            });
            return {
                chapters: links.map(a => util.hyperLinkToChapter(a)),
                page1Path: "",
                pagePrefix: "",
                pageSuffix: ""
            };
        }

        let text = SixNineShubaTwDecoder.bytesOrStringToText(decoded.output, false);
        let lines = text.split("\n");
        let mode = lines[0];
        let prefix = lines[1] || "";
        let suffix = lines[2] || "";
        let ids = [];

        if (mode === "1") {
            let parts = (lines[3] || "").split(",").filter(Boolean);
            let acc = 0;
            for (let i = 0; i < parts.length; i++) {
                acc = i === 0 ? parseInt(parts[i], 36) : (acc + parseInt(parts[i], 36));
                ids.push(acc);
            }
        } else if (lines[3]) {
            ids = lines[3].split("\t");
        }

        let items = [...decoded.targetEl.querySelectorAll("li:not(.title) span.ch-item")];
        if (items.length === 0) {
            items = [...pageDom.querySelectorAll(".last9 li:not(.title) span.ch-item")];
        }

        let count = Math.min(items.length, ids.length);
        let chapters = [];
        for (let i = 0; i < count; i++) {
            let relUrl = prefix + String(ids[i]) + suffix;
            if (!relUrl.startsWith("/") || relUrl.startsWith("//")) {
                continue;
            }
            let a = pageDom.createElement("a");
            a.href = new URL(relUrl, baseUrl).href;
            a.textContent = items[i].textContent.trim();
            chapters.push(util.hyperLinkToChapter(a));
        }

        return {
            chapters,
            page1Path: lines[4] || "",
            pagePrefix: lines[5] || "",
            pageSuffix: lines[6] || ""
        };
    }

    async setRequestHeaders(refererUrl) {
        let rules = [
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "referer",
                            operation: "set",
                            value: refererUrl,
                        },
                        {
                            header: "sec-fetch-dest",
                            operation: "set",
                            value: "document",
                        },
                        {
                            header: "sec-fetch-mode",
                            operation: "set",
                            value: "navigate",
                        },
                        {
                            header: "sec-fetch-site",
                            operation: "set",
                            value: "same-origin",
                        },
                        {
                            header: "origin",
                            operation: "remove",
                        },
                    ],
                },
                condition: {
                    urlFilter: "||69shuba.tw/",
                    resourceTypes: ["xmlhttprequest"],
                },
            },
        ];

        await HttpClient.setDeclarativeNetRequestRules(rules);
    }

    async fetchChapter(url) {
        let refererUrl = this.tocURL || new URL("/", url).href;
        await this.setRequestHeaders(refererUrl);
        let dom = await super.fetchChapter(url);
        this.decryptChapterContent(dom);
        return dom;
    }

    decryptChapterContent(dom) {
        let decoded = SixNineShubaTwDecoder.extractAndRun(dom, "#nr1");
        if (!decoded) {
            return;
        }

        let jsonStr = SixNineShubaTwDecoder.bytesOrStringToText(decoded.output, true);
        let payload = JSON.parse(jsonStr);
        let html = "";
        if (payload && payload.c && payload.o) {
            for (let key of payload.o) {
                html += payload.c[key] || "";
            }
        }

        let temp = dom.createElement("div");
        temp.innerHTML = html;
        let parent = decoded.targetEl.parentNode;
        if (parent) {
            while (temp.firstChild) {
                parent.insertBefore(temp.firstChild, decoded.targetEl);
            }
            parent.removeChild(decoded.targetEl);
        }
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info p:nth-child(2) a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".book-tags a")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".intro p")?.textContent?.trim() ?? "";
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("#nr_title");
        if (title) {
            title.textContent = title.textContent
            .replace(/\s*[（(]\s*\d+\s*\/\s*\d+\s*[）)]\s*$/, "")
            .trim();
        }
        return title;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bookinfo");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".txtinfo, #txtright, .bottom-ad");
        super.removeUnwantedElementsFromContentElement(element);
    }
}

class SixNineShubaTwDecoder {
    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    static bytesOrStringToText(output, utf8Expected) {
        if (output instanceof Uint8Array || ArrayBuffer.isView(output)) {
            return new TextDecoder("utf-8").decode(output);
        }
        if (typeof output !== "string") {
            return String(output ?? "");
        }
        if (!utf8Expected) {
            return output;
        }
        let hasHighByte = false;
        let allByte = true;
        for (let i = 0; i < output.length; i++) {
            let code = output.charCodeAt(i);
            if (code > 255) {
                allByte = false;
                break;
            }
            if (code >= 128) {
                hasHighByte = true;
            }
        }
        if (allByte && hasHighByte) {
            try {
                let bytes = new Uint8Array(output.length);
                for (let i = 0; i < output.length; i++) {
                    bytes[i] = output.charCodeAt(i);
                }
                return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
            } catch {
                return output;
            }
        }
        return output;
    }

    static extractAndRun(dom, containerSelector) {
        let scripts = [...dom.querySelectorAll("script:not([src])")];
        let payloadRegex = /var\s+([A-Za-z_$][\w$]*)\s*=\s*\(?\s*[A-Za-z_$][\w$]*\.getAttribute\s*\(\s*["'](data-[^"']+)["']\s*\)(?:\s*\|\|\s*['"]{2})?\s*\)?(?:\s*\+\s*(\[[\s\S]*?\])\s*\.join\s*\(\s*['"]{2}\s*\))?/;
        let idRegex = /document\.getElementById\s*\(\s*["']([^"']+)["']\s*\)/;

        for (let script of scripts) {
            let text = script.textContent || "";
            if (!text.includes(".getAttribute(")) {
                continue;
            }
            let idMatch = text.match(idRegex);
            let payloadMatch = text.match(payloadRegex);
            if (!idMatch || !payloadMatch) {
                continue;
            }

            let targetEl = dom.getElementById(idMatch[1]);
            if (!targetEl || !targetEl.closest(containerSelector)) {
                continue;
            }

            let payloadVar = payloadMatch[1];
            let dataAttr = payloadMatch[2];
            let head = targetEl.getAttribute(dataAttr) || "";
            let tail = "";
            if (payloadMatch[3]) {
                let chunks = SixNineShubaTwScriptEvaluator.evalExpression(payloadMatch[3]);
                if (Array.isArray(chunks)) {
                    tail = chunks.join("");
                }
            }
            let b64 = head + tail;

            let callRegex = new RegExp("([A-Za-z_$][\\w$]*)\\s*\\(\\s*" + SixNineShubaTwDecoder.escapeRegex(payloadVar) + "\\s*\\)", "g");
            let fnSource = null;
            let callMatch;
            while ((callMatch = callRegex.exec(text)) !== null) {
                fnSource = SixNineShubaTwDecoder.extractFunctionSource(text, callMatch[1]);
                if (fnSource) {
                    break;
                }
            }
            if (!fnSource) {
                throw new Error("69shuba.tw: Unable to locate decoder function.");
            }

            let output = SixNineShubaTwScriptEvaluator.runFunction(fnSource, [b64]);
            return { targetEl, output };
        }
        return null;
    }

    static extractFunctionSource(scriptText, fnName) {
        let esc = SixNineShubaTwDecoder.escapeRegex(fnName);
        let varFnRe = new RegExp("(?:^|[;,\\s])" + esc + "\\s*=\\s*function\\s*\\(");
        let declFnRe = new RegExp("(?:^|[;}\\s])function\\s+" + esc + "\\s*\\(");

        let match = scriptText.match(varFnRe) || scriptText.match(declFnRe);
        if (!match) {
            return null;
        }

        let fnStart = match.index + match[0].indexOf("function");
        let i = fnStart;
        let len = scriptText.length;

        // Skip to opening '{' of function body
        let parenDepth = 0;
        let seenParen = false;
        while (i < len) {
            let ch = scriptText[i];
            if (ch === "(") {
                parenDepth++;
                seenParen = true;
            } else if (ch === ")") {
                parenDepth--;
            } else if (ch === "{" && seenParen && parenDepth === 0) {
                break;
            }
            i++;
        }
        if (i >= len || scriptText[i] !== "{") {
            return null;
        }

        let braceDepth = 0;
        while (i < len) {
            let ch = scriptText[i];
            if (ch === "'" || ch === "\"") {
                let quote = ch;
                i++;
                while (i < len) {
                    if (scriptText[i] === "\\") {
                        i += 2;
                        continue;
                    }
                    if (scriptText[i] === quote) {
                        break;
                    }
                    i++;
                }
            } else if (ch === "/" && scriptText[i + 1] === "/") {
                i += 2;
                while (i < len && scriptText[i] !== "\n") {
                    i++;
                }
            } else if (ch === "/" && scriptText[i + 1] === "*") {
                i += 2;
                while (i < len && !(scriptText[i] === "*" && scriptText[i + 1] === "/")) {
                    i++;
                }
                i++;
            } else if (ch === "{") {
                braceDepth++;
            } else if (ch === "}") {
                braceDepth--;
                if (braceDepth === 0) {
                    return scriptText.slice(fnStart, i + 1);
                }
            }
            i++;
        }
        return null;
    }
}

/*
 * CSP-safe pure-JS subset parser & interpreter (no eval / no Function).
 * Supports the ES5 constructs used in 69shuba.tw's rotated cipher functions.
 */
class SixNineShubaTwScriptEvaluator {
    static evalExpression(exprSrc) {
        let tokens = SixNineShubaTwScriptEvaluator.tokenize(exprSrc);
        let parser = new SixNineShubaTwParserCore(tokens);
        let ast = parser.parseExpr();
        let ev = new SixNineShubaTwRuntime();
        return ev.evalExpr(ast, ev.rootEnv);
    }

    static runFunction(fnSource, args) {
        let normalized = fnSource.replace(/^function\s+[A-Za-z_$][\w$]*/, "function");
        let tokens = SixNineShubaTwScriptEvaluator.tokenize("(" + normalized + ")");
        let parser = new SixNineShubaTwParserCore(tokens);
        let fnAst = parser.parseExpr();
        let ev = new SixNineShubaTwRuntime();
        let fn = ev.evalExpr(fnAst, ev.rootEnv);
        return fn.apply(undefined, args);
    }

    static tokenize(src) {
        let tokens = [];
        let i = 0;
        let len = src.length;
        const keywords = new Set([
            "var", "let", "const", "function", "return", "if", "else",
            "for", "while", "do", "break", "continue", "new", "typeof",
            "try", "catch", "finally", "true", "false", "null", "undefined"
        ]);
        const multiOps = [
            ">>>=", ">>>", "===", "!==", "<<=", ">>=",
            "++", "--", "<<", ">>", "<=", ">=", "==", "!=",
            "&&", "||", "+=", "-=", "*=", "/=", "%=", "^=", "&=", "|="
        ];

        while (i < len) {
            let ch = src[i];
            if (/\s/.test(ch)) {
                i++;
                continue;
            }
            if (ch === "/" && src[i + 1] === "/") {
                i += 2;
                while (i < len && src[i] !== "\n") {
                    i++;
                }
                continue;
            }
            if (ch === "/" && src[i + 1] === "*") {
                i += 2;
                while (i < len && !(src[i] === "*" && src[i + 1] === "/")) {
                    i++;
                }
                i += 2;
                continue;
            }
            if (ch === "'" || ch === "\"") {
                let quote = ch;
                let str = "";
                i++;
                while (i < len && src[i] !== quote) {
                    if (src[i] === "\\") {
                        i++;
                        let esc = src[i++];
                        switch (esc) {
                            case "n": str += "\n"; break;
                            case "r": str += "\r"; break;
                            case "t": str += "\t"; break;
                            case "b": str += "\b"; break;
                            case "f": str += "\f"; break;
                            case "\\": str += "\\"; break;
                            case "'": str += "'"; break;
                            case "\"": str += "\""; break;
                            case "x":
                                str += String.fromCharCode(parseInt(src.slice(i, i + 2), 16));
                                i += 2;
                                break;
                            case "u":
                                if (src[i] === "{") {
                                    let end = src.indexOf("}", i + 1);
                                    str += String.fromCodePoint(parseInt(src.slice(i + 1, end), 16));
                                    i = end + 1;
                                } else {
                                    str += String.fromCharCode(parseInt(src.slice(i, i + 4), 16));
                                    i += 4;
                                }
                                break;
                            default:
                                str += esc;
                        }
                    } else {
                        str += src[i++];
                    }
                }
                i++;
                tokens.push({ type: "string", value: str });
                continue;
            }
            if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
                let rest = src.slice(i);
                let numMatch = rest.match(/^0[xX][0-9a-fA-F]+/)
                || rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
                let raw = numMatch[0];
                let val = /^0[xX]/.test(raw) ? parseInt(raw, 16) : Number(raw);
                tokens.push({ type: "number", value: val });
                i += raw.length;
                continue;
            }
            if (/[A-Za-z_$]/.test(ch)) {
                let idMatch = src.slice(i).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
                let name = idMatch[0];
                tokens.push({ type: keywords.has(name) ? "kw" : "id", value: name });
                i += name.length;
                continue;
            }
            let matchedOp = null;
            for (let op of multiOps) {
                if (src.startsWith(op, i)) {
                    matchedOp = op;
                    break;
                }
            }
            if (matchedOp) {
                tokens.push({ type: "punc", value: matchedOp });
                i += matchedOp.length;
                continue;
            }
            tokens.push({ type: "punc", value: ch });
            i++;
        }
        tokens.push({ type: "eof", value: "" });
        return tokens;
    }
}

class SixNineShubaTwParserCore {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek(offset = 0) {
        return this.tokens[this.pos + offset] || { type: "eof", value: "" };
    }

    next() {
        return this.tokens[this.pos++];
    }

    isPunc(val) {
        let t = this.peek();
        return t.type === "punc" && t.value === val;
    }

    isKw(val) {
        let t = this.peek();
        return t.type === "kw" && t.value === val;
    }

    eatPunc(val) {
        if (this.isPunc(val)) {
            return this.next();
        }
        return null;
    }

    expectPunc(val) {
        if (!this.isPunc(val)) {
            throw new Error(`Expected '${val}' but got '${this.peek().value}'`);
        }
        return this.next();
    }

    parseBlock() {
        this.expectPunc("{");
        let body = [];
        while (!this.isPunc("}") && this.peek().type !== "eof") {
            body.push(this.parseStmt());
        }
        this.expectPunc("}");
        return { type: "Block", body };
    }

    parseStmt() {
        if (this.isPunc("{")) {
            return this.parseBlock();
        }
        if (this.eatPunc(";")) {
            return { type: "Empty" };
        }
        if (this.isKw("var") || this.isKw("let") || this.isKw("const")) {
            return this.parseVarDecl(true);
        }
        if (this.isKw("if")) {
            this.next();
            this.expectPunc("(");
            let test = this.parseExpr();
            this.expectPunc(")");
            let consequent = this.parseStmt();
            let alternate = null;
            if (this.isKw("else")) {
                this.next();
                alternate = this.parseStmt();
            }
            return { type: "If", test, consequent, alternate };
        }
        if (this.isKw("for")) {
            this.next();
            this.expectPunc("(");
            let init = null;
            if (!this.isPunc(";")) {
                init = (this.isKw("var") || this.isKw("let") || this.isKw("const"))
                ? this.parseVarDecl(false)
                : this.parseExpr();
            }
            this.expectPunc(";");
            let test = this.isPunc(";") ? null : this.parseExpr();
            this.expectPunc(";");
            let update = this.isPunc(")") ? null : this.parseExpr();
            this.expectPunc(")");
            let body = this.parseStmt();
            return { type: "For", init, test, update, body };
        }
        if (this.isKw("while")) {
            this.next();
            this.expectPunc("(");
            let test = this.parseExpr();
            this.expectPunc(")");
            let body = this.parseStmt();
            return { type: "While", test, body };
        }
        if (this.isKw("do")) {
            this.next();
            let body = this.parseStmt();
            if (!this.isKw("while")) {
                throw new Error("Expected 'while' after do body");
            }
            this.next();
            this.expectPunc("(");
            let test = this.parseExpr();
            this.expectPunc(")");
            this.eatPunc(";");
            return { type: "DoWhile", body, test };
        }
        if (this.isKw("return")) {
            this.next();
            let value = (this.isPunc(";") || this.isPunc("}") || this.peek().type === "eof")
            ? null
            : this.parseExpr();
            this.eatPunc(";");
            return { type: "Return", value };
        }
        if (this.isKw("break")) {
            this.next();
            this.eatPunc(";");
            return { type: "Break" };
        }
        if (this.isKw("continue")) {
            this.next();
            this.eatPunc(";");
            return { type: "Continue" };
        }
        if (this.isKw("try")) {
            this.next();
            let block = this.parseBlock();
            let catchParam = null;
            let handler = null;
            let finalizer = null;
            if (this.isKw("catch")) {
                this.next();
                if (this.eatPunc("(")) {
                    catchParam = this.next().value;
                    this.expectPunc(")");
                }
                handler = this.parseBlock();
            }
            if (this.isKw("finally")) {
                this.next();
                finalizer = this.parseBlock();
            }
            return { type: "Try", block, catchParam, handler, finalizer };
        }
        if (this.isKw("function")) {
            let fn = this.parseFunction(true);
            return { type: "FnDecl", name: fn.name, params: fn.params, body: fn.body };
        }

        let expr = this.parseExpr();
        this.eatPunc(";");
        return { type: "ExprStmt", expr };
    }

    parseVarDecl(consumeSemi) {
        let kind = this.next().value;
        let decls = [];
        do {
            let idTok = this.next();
            if (idTok.type !== "id") {
                throw new Error(`Expected identifier in ${kind} declaration`);
            }
            let init = this.eatPunc("=") ? this.parseAssign() : null;
            decls.push({ name: idTok.value, init });
        } while (this.eatPunc(","));

        if (consumeSemi) {
            this.eatPunc(";");
        }
        return { type: "VarDecl", kind, decls };
    }

    parseFunction(requireName) {
        this.next(); // 'function'
        let name = null;
        if (this.peek().type === "id") {
            name = this.next().value;
        } else if (requireName) {
            throw new Error("Expected function name");
        }
        this.expectPunc("(");
        let params = [];
        if (!this.isPunc(")")) {
            do {
                params.push(this.next().value);
            } while (this.eatPunc(","));
        }
        this.expectPunc(")");
        let body = this.parseBlock();
        return { type: "FnExpr", name, params, body };
    }

    parseExpr() {
        let first = this.parseAssign();
        if (!this.isPunc(",")) {
            return first;
        }
        let exprs = [first];
        while (this.eatPunc(",")) {
            exprs.push(this.parseAssign());
        }
        return { type: "Sequence", exprs };
    }

    parseAssign() {
        let left = this.parseCond();
        const assignOps = new Set([
            "=", "+=", "-=", "*=", "/=", "%=", "^=", "&=", "|=", "<<=", ">>=", ">>>="
        ]);
        if (this.peek().type === "punc" && assignOps.has(this.peek().value)) {
            let op = this.next().value;
            let right = this.parseAssign();
            return { type: "Assign", op, left, right };
        }
        return left;
    }

    parseCond() {
        let test = this.parseLogicalOr();
        if (!this.eatPunc("?")) {
            return test;
        }
        let consequent = this.parseAssign();
        this.expectPunc(":");
        let alternate = this.parseAssign();
        return { type: "Cond", test, consequent, alternate };
    }

    parseBinary(ops, nextFn) {
        let left = nextFn.call(this);
        while (this.peek().type === "punc" && ops.includes(this.peek().value)) {
            let op = this.next().value;
            let right = nextFn.call(this);
            left = { type: "Binary", op, left, right };
        }
        return left;
    }

    parseLogicalOr() {
        return this.parseBinary(["||"], this.parseLogicalAnd);
    }

    parseLogicalAnd() {
        return this.parseBinary(["&&"], this.parseBitOr);
    }

    parseBitOr() {
        return this.parseBinary(["|"], this.parseBitXor);
    }

    parseBitXor() {
        return this.parseBinary(["^"], this.parseBitAnd);
    }

    parseBitAnd() {
        return this.parseBinary(["&"], this.parseEq);
    }

    parseEq() {
        return this.parseBinary(["===", "!==", "==", "!="], this.parseRel);
    }

    parseRel() {
        return this.parseBinary(["<", "<=", ">", ">="], this.parseShift);
    }

    parseShift() {
        return this.parseBinary(["<<", ">>", ">>>"], this.parseAdd);
    }

    parseAdd() {
        return this.parseBinary(["+", "-"], this.parseMul);
    }

    parseMul() {
        return this.parseBinary(["*", "/", "%"], this.parseUnary);
    }

    parseUnary() {
        if (this.isKw("typeof")) {
            this.next();
            return { type: "Unary", op: "typeof", arg: this.parseUnary() };
        }
        if (this.peek().type === "punc" && ["!", "~", "+", "-"].includes(this.peek().value)) {
            let op = this.next().value;
            return { type: "Unary", op, arg: this.parseUnary() };
        }
        if (this.peek().type === "punc" && (this.peek().value === "++" || this.peek().value === "--")) {
            let op = this.next().value;
            return { type: "Update", op, prefix: true, arg: this.parseUnary() };
        }
        return this.parsePostfix();
    }

    parsePostfix() {
        let expr = this.parseCallMember(true);
        if (this.peek().type === "punc" && (this.peek().value === "++" || this.peek().value === "--")) {
            let op = this.next().value;
            return { type: "Update", op, prefix: false, arg: expr };
        }
        return expr;
    }

    parseCallMember(allowCall) {
        let expr;
        if (this.isKw("new")) {
            this.next();
            let callee = this.parseCallMember(false);
            let args = [];
            if (this.eatPunc("(")) {
                if (!this.isPunc(")")) {
                    do {
                        args.push(this.parseAssign());
                    } while (this.eatPunc(","));
                }
                this.expectPunc(")");
            }
            expr = { type: "New", callee, args };
        } else {
            expr = this.parsePrimary();
        }

        while (this.isPunc(".") || this.isPunc("[") || (allowCall && this.isPunc("("))) {
            if (this.eatPunc(".")) {
                let propTok = this.next();
                expr = { type: "Member", obj: expr, prop: propTok.value, computed: false };
            } else if (this.eatPunc("[")) {
                let propExpr = this.parseExpr();
                this.expectPunc("]");
                expr = { type: "Member", obj: expr, prop: propExpr, computed: true };
            } else if (allowCall && this.eatPunc("(")) {
                let args = [];
                if (!this.isPunc(")")) {
                    do {
                        args.push(this.parseAssign());
                    } while (this.eatPunc(","));
                }
                this.expectPunc(")");
                expr = { type: "Call", callee: expr, args };
            }
        }
        return expr;
    }

    parsePrimary() {
        let t = this.peek();
        if (t.type === "number" || t.type === "string") {
            this.next();
            return { type: "Literal", value: t.value };
        }
        if (t.type === "kw") {
            if (t.value === "true") { this.next(); return { type: "Literal", value: true }; }
            if (t.value === "false") { this.next(); return { type: "Literal", value: false }; }
            if (t.value === "null") { this.next(); return { type: "Literal", value: null }; }
            if (t.value === "undefined") { this.next(); return { type: "Literal", value: undefined }; }
            if (t.value === "function") {
                return this.parseFunction(false);
            }
        }
        if (t.type === "id") {
            this.next();
            return { type: "Id", name: t.value };
        }
        if (this.eatPunc("(")) {
            let expr = this.parseExpr();
            this.expectPunc(")");
            return expr;
        }
        if (this.eatPunc("[")) {
            let elements = [];
            while (!this.isPunc("]")) {
                if (this.eatPunc(",")) {
                    elements.push({ type: "Literal", value: undefined });
                    continue;
                }
                elements.push(this.parseAssign());
                if (!this.eatPunc(",")) {
                    break;
                }
            }
            this.expectPunc("]");
            return { type: "Array", elements };
        }
        if (this.eatPunc("{")) {
            let props = [];
            while (!this.isPunc("}")) {
                let keyTok = this.next();
                let key = keyTok.value;
                this.expectPunc(":");
                let value = this.parseAssign();
                props.push({ key, value });
                if (!this.eatPunc(",")) {
                    break;
                }
            }
            this.expectPunc("}");
            return { type: "Object", props };
        }
        throw new Error(`Unexpected token: ${t.type} (${t.value})`);
    }
}

class SixNineShubaTwRuntime {
    constructor() {
        this.steps = 0;
        this.maxSteps = 5000000;
        this.interpretedFns = new WeakSet();
        this.forbiddenProps = new Set(["__proto__", "constructor", "prototype"]);
        this.allowedMethods = new Set([
            "charCodeAt", "codePointAt", "charAt", "slice", "substring", "substr",
            "split", "join", "indexOf", "lastIndexOf", "includes", "startsWith",
            "endsWith", "trim", "toLowerCase", "toUpperCase", "replace", "concat",
            "push", "pop", "shift", "unshift", "reverse", "map", "filter", "fill",
            "subarray", "set", "toString", "decode"
        ]);

        const safeString = v => String(v);
        safeString.fromCharCode = (...args) => String.fromCharCode(...args);
        safeString.fromCodePoint = (...args) => String.fromCodePoint(...args);

        const safeMath = {
            imul: Math.imul,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
            abs: Math.abs,
            min: Math.min,
            max: Math.max,
            pow: Math.pow,
            trunc: Math.trunc,
            sqrt: Math.sqrt
        };

        const safeArray = (...args) => new Array(...args);
        safeArray.isArray = Array.isArray;

        const safeJSON = {
            parse: JSON.parse,
            stringify: JSON.stringify
        };

        const safeAtob = s => window.atob(String(s));
        const safeBtoa = s => window.btoa(String(s));

        this.allowedCallables = new Set([
            safeAtob, safeBtoa, parseInt, parseFloat, isNaN, isFinite,
            Number, Boolean, safeString, safeString.fromCharCode, safeString.fromCodePoint,
            safeArray, safeArray.isArray,
            safeMath.imul, safeMath.floor, safeMath.ceil, safeMath.round,
            safeMath.abs, safeMath.min, safeMath.max, safeMath.pow, safeMath.trunc, safeMath.sqrt,
            safeJSON.parse, safeJSON.stringify, decodeURIComponent, encodeURIComponent
        ]);

        this.allowedCtors = new Set([
            Uint8Array, Int8Array, Uint16Array, Uint32Array, Int32Array,
            Array, safeArray, TextDecoder
        ]);

        let vars = Object.create(null);
        vars.atob = safeAtob;
        vars.btoa = safeBtoa;
        vars.parseInt = parseInt;
        vars.parseFloat = parseFloat;
        vars.isNaN = isNaN;
        vars.isFinite = isFinite;
        vars.Number = Number;
        vars.Boolean = Boolean;
        vars.String = safeString;
        vars.Math = safeMath;
        vars.Array = safeArray;
        vars.Uint8Array = Uint8Array;
        vars.Int8Array = Int8Array;
        vars.Uint16Array = Uint16Array;
        vars.Uint32Array = Uint32Array;
        vars.Int32Array = Int32Array;
        vars.TextDecoder = TextDecoder;
        vars.JSON = safeJSON;
        vars.decodeURIComponent = decodeURIComponent;
        vars.encodeURIComponent = encodeURIComponent;
        vars.undefined = undefined;

        this.rootEnv = { parent: null, vars, fnScope: null };
        this.rootEnv.fnScope = this.rootEnv;
    }

    tick() {
        if (++this.steps > this.maxSteps) {
            throw new Error("69shuba.tw: Decoder step limit exceeded.");
        }
    }

    findVarEnv(env, name) {
        for (let cur = env; cur != null; cur = cur.parent) {
            if (Object.prototype.hasOwnProperty.call(cur.vars, name)) {
                return cur;
            }
        }
        return null;
    }

    hoistDecls(node, fnEnv) {
        if (!node || typeof node !== "object") {
            return;
        }
        switch (node.type) {
            case "Block":
                for (let s of node.body) {
                    this.hoistDecls(s, fnEnv);
                }
                break;
            case "VarDecl":
                if (node.kind === "var") {
                    for (let d of node.decls) {
                        if (!Object.prototype.hasOwnProperty.call(fnEnv.vars, d.name)) {
                            fnEnv.vars[d.name] = undefined;
                        }
                    }
                }
                break;
            case "FnDecl":
                fnEnv.vars[node.name] = this.makeFunction(node, fnEnv);
                break;
            case "If":
                this.hoistDecls(node.consequent, fnEnv);
                this.hoistDecls(node.alternate, fnEnv);
                break;
            case "For":
                this.hoistDecls(node.init, fnEnv);
                this.hoistDecls(node.body, fnEnv);
                break;
            case "While":
            case "DoWhile":
                this.hoistDecls(node.body, fnEnv);
                break;
            case "Try":
                this.hoistDecls(node.block, fnEnv);
                this.hoistDecls(node.handler, fnEnv);
                this.hoistDecls(node.finalizer, fnEnv);
                break;
        }
    }

    makeFunction(fnNode, closureEnv) {
        const self = this;
        const wrapper = function (...args) {
            self.tick();
            let fnEnv = {
                parent: closureEnv,
                vars: Object.create(null),
                fnScope: null
            };
            fnEnv.fnScope = fnEnv;
            for (let i = 0; i < fnNode.params.length; i++) {
                fnEnv.vars[fnNode.params[i]] = args[i];
            }
            self.hoistDecls(fnNode.body, fnEnv);
            let res = self.evalBlock(fnNode.body, fnEnv, true);
            if (res && res.type === "return") {
                return res.value;
            }
            return undefined;
        };
        this.interpretedFns.add(wrapper);
        return wrapper;
    }

    evalBlock(blockNode, env, reuseEnv = false) {
        let blockEnv = reuseEnv
        ? env
        : { parent: env, vars: Object.create(null), fnScope: env.fnScope };
        for (let stmt of blockNode.body) {
            let res = this.evalStmt(stmt, blockEnv);
            if (res) {
                return res;
            }
        }
        return null;
    }

    evalStmt(node, env) {
        switch (node.type) {
            case "Empty":
            case "FnDecl":
                return null;
            case "Block":
                return this.evalBlock(node, env, false);
            case "ExprStmt":
                this.evalExpr(node.expr, env);
                return null;
            case "VarDecl": {
                let targetVars = node.kind === "var" ? env.fnScope.vars : env.vars;
                for (let d of node.decls) {
                    if (d.init !== null) {
                        targetVars[d.name] = this.evalExpr(d.init, env);
                    } else if (!Object.prototype.hasOwnProperty.call(targetVars, d.name)) {
                        targetVars[d.name] = undefined;
                    }
                }
                return null;
            }
            case "If":
                if (this.evalExpr(node.test, env)) {
                    return this.evalStmt(node.consequent, env);
                }
                return node.alternate ? this.evalStmt(node.alternate, env) : null;
            case "For": {
                let loopEnv = { parent: env, vars: Object.create(null), fnScope: env.fnScope };
                if (node.init) {
                    if (node.init.type === "VarDecl") {
                        this.evalStmt(node.init, loopEnv);
                    } else {
                        this.evalExpr(node.init, loopEnv);
                    }
                }
                while (!node.test || this.evalExpr(node.test, loopEnv)) {
                    this.tick();
                    let res = this.evalStmt(node.body, loopEnv);
                    if (res) {
                        if (res.type === "return") {
                            return res;
                        }
                        if (res.type === "break") {
                            break;
                        }
                    }
                    if (node.update) {
                        this.evalExpr(node.update, loopEnv);
                    }
                }
                return null;
            }
            case "While":
                while (this.evalExpr(node.test, env)) {
                    this.tick();
                    let res = this.evalStmt(node.body, env);
                    if (res) {
                        if (res.type === "return") {
                            return res;
                        }
                        if (res.type === "break") {
                            break;
                        }
                    }
                }
                return null;
            case "DoWhile":
                do {
                    this.tick();
                    let res = this.evalStmt(node.body, env);
                    if (res) {
                        if (res.type === "return") {
                            return res;
                        }
                        if (res.type === "break") {
                            break;
                        }
                    }
                } while (this.evalExpr(node.test, env));
                return null;
            case "Return":
                return { type: "return", value: node.value ? this.evalExpr(node.value, env) : undefined };
            case "Break":
                return { type: "break" };
            case "Continue":
                return { type: "continue" };
            case "Try": {
                let res = null;
                try {
                    res = this.evalBlock(node.block, env, false);
                } catch (err) {
                    if (node.handler) {
                        let catchEnv = { parent: env, vars: Object.create(null), fnScope: env.fnScope };
                        if (node.catchParam) {
                            catchEnv.vars[node.catchParam] = err;
                        }
                        res = this.evalBlock(node.handler, catchEnv, true);
                    } else if (!node.finalizer) {
                        throw err;
                    }
                } finally {
                    if (node.finalizer) {
                        let finRes = this.evalBlock(node.finalizer, env, false);
                        if (finRes) {
                            res = finRes;
                        }
                    }
                }
                return res;
            }
            default:
                throw new Error(`Unsupported statement: ${node.type}`);
        }
    }

    readProp(obj, prop) {
        if (obj == null) {
            throw new TypeError(`Cannot read property '${prop}' of ${obj}`);
        }
        let key = String(prop);
        if (this.forbiddenProps.has(key)) {
            throw new Error(`Access to property '${key}' is forbidden.`);
        }
        return obj[key];
    }

    writeProp(obj, prop, value) {
        if (obj == null) {
            throw new TypeError(`Cannot set property '${prop}' of ${obj}`);
        }
        let key = String(prop);
        if (this.forbiddenProps.has(key)) {
            throw new Error(`Modification of property '${key}' is forbidden.`);
        }
        obj[key] = value;
        return value;
    }

    applyCompound(op, cur, val) {
        switch (op) {
            case "=": return val;
            case "+=": return cur + val;
            case "-=": return cur - val;
            case "*=": return cur * val;
            case "/=": return cur / val;
            case "%=": return cur % val;
            case "^=": return cur ^ val;
            case "&=": return cur & val;
            case "|=": return cur | val;
            case "<<=": return cur << val;
            case ">>=": return cur >> val;
            case ">>>=": return cur >>> val;
            default: throw new Error(`Unsupported assignment operator: ${op}`);
        }
    }

    evalExpr(node, env) {
        switch (node.type) {
            case "Literal":
                return node.value;
            case "Id": {
                let found = this.findVarEnv(env, node.name);
                if (!found) {
                    throw new ReferenceError(`${node.name} is not defined`);
                }
                return found.vars[node.name];
            }
            case "Array":
                return node.elements.map(e => this.evalExpr(e, env));
            case "Object": {
                let obj = {};
                for (let p of node.props) {
                    this.writeProp(obj, p.key, this.evalExpr(p.value, env));
                }
                return obj;
            }
            case "FnExpr":
                return this.makeFunction(node, env);
            case "Sequence": {
                let res;
                for (let e of node.exprs) {
                    res = this.evalExpr(e, env);
                }
                return res;
            }
            case "Member": {
                let obj = this.evalExpr(node.obj, env);
                let prop = node.computed ? this.evalExpr(node.prop, env) : node.prop;
                return this.readProp(obj, prop);
            }
            case "Unary": {
                if (node.op === "typeof" && node.arg.type === "Id" && !this.findVarEnv(env, node.arg.name)) {
                    return "undefined";
                }
                let val = this.evalExpr(node.arg, env);
                switch (node.op) {
                    case "!": return !val;
                    case "~": return ~val;
                    case "+": return +val;
                    case "-": return -val;
                    case "typeof": return typeof val;
                    default: throw new Error(`Unsupported unary op: ${node.op}`);
                }
            }
                    case "Update": {
                        let delta = node.op === "++" ? 1 : -1;
                        if (node.arg.type === "Id") {
                            let found = this.findVarEnv(env, node.arg.name);
                            if (!found) {
                                throw new ReferenceError(`${node.arg.name} is not defined`);
                            }
                            let cur = Number(found.vars[node.arg.name]);
                            let next = cur + delta;
                            found.vars[node.arg.name] = next;
                            return node.prefix ? next : cur;
                        }
                        if (node.arg.type === "Member") {
                            let obj = this.evalExpr(node.arg.obj, env);
                            let prop = node.arg.computed ? this.evalExpr(node.arg.prop, env) : node.arg.prop;
                            let cur = Number(this.readProp(obj, prop));
                            let next = cur + delta;
                            this.writeProp(obj, prop, next);
                            return node.prefix ? next : cur;
                        }
                        throw new Error("Invalid update target");
                    }
                    case "Assign": {
                        if (node.left.type === "Id") {
                            let found = this.findVarEnv(env, node.left.name);
                            let targetVars = found ? found.vars : env.fnScope.vars;
                            let val = this.evalExpr(node.right, env);
                            if (node.op === "=") {
                                targetVars[node.left.name] = val;
                                return val;
                            }
                            let next = this.applyCompound(node.op, targetVars[node.left.name], val);
                            targetVars[node.left.name] = next;
                            return next;
                        }
                        if (node.left.type === "Member") {
                            let obj = this.evalExpr(node.left.obj, env);
                            let prop = node.left.computed ? this.evalExpr(node.left.prop, env) : node.left.prop;
                            let val = this.evalExpr(node.right, env);
                            if (node.op === "=") {
                                return this.writeProp(obj, prop, val);
                            }
                            let cur = this.readProp(obj, prop);
                            let next = this.applyCompound(node.op, cur, val);
                            return this.writeProp(obj, prop, next);
                        }
                        throw new Error("Invalid assignment target");
                    }
                    case "Binary": {
                        if (node.op === "&&") {
                            let l = this.evalExpr(node.left, env);
                            return l ? this.evalExpr(node.right, env) : l;
                        }
                        if (node.op === "||") {
                            let l = this.evalExpr(node.left, env);
                            return l ? l : this.evalExpr(node.right, env);
                        }
                        let l = this.evalExpr(node.left, env);
                        let r = this.evalExpr(node.right, env);
                        switch (node.op) {
                            case "+": return l + r;
                            case "-": return l - r;
                            case "*": return l * r;
                            case "/": return l / r;
                            case "%": return l % r;
                            case "<<": return l << r;
                            case ">>": return l >> r;
                            case ">>>": return l >>> r;
                            case "<": return l < r;
                            case "<=": return l <= r;
                            case ">": return l > r;
                            case ">=": return l >= r;
                            case "==": return l == r; // eslint-disable-line eqeqeq
                            case "!=": return l != r; // eslint-disable-line eqeqeq
                            case "===": return l === r;
                            case "!==": return l !== r;
                            case "&": return l & r;
                            case "^": return l ^ r;
                            case "|": return l | r;
                            default: throw new Error(`Unsupported binary op: ${node.op}`);
                        }
                    }
                            case "Cond":
                                return this.evalExpr(node.test, env)
                                ? this.evalExpr(node.consequent, env)
                                : this.evalExpr(node.alternate, env);
                            case "New": {
                                let ctor = this.evalExpr(node.callee, env);
                                if (!this.allowedCtors.has(ctor)) {
                                    throw new Error("Constructor not allowed in decoder.");
                                }
                                let args = node.args.map(a => this.evalExpr(a, env));
                                return new ctor(...args);
                            }
                            case "Call": {
                                let target = undefined;
                                let fn;
                                let methodName = null;
                                if (node.callee.type === "Member") {
                                    target = this.evalExpr(node.callee.obj, env);
                                    methodName = node.callee.computed
                                    ? String(this.evalExpr(node.callee.prop, env))
                                    : node.callee.prop;
                                    fn = this.readProp(target, methodName);
                                } else {
                                    fn = this.evalExpr(node.callee, env);
                                }
                                let args = node.args.map(a => this.evalExpr(a, env));
                                if (typeof fn !== "function") {
                                    throw new TypeError("Attempted to call a non-function.");
                                }
                                let allowed = this.interpretedFns.has(fn)
                                || this.allowedCallables.has(fn)
                                || (methodName != null
                                && this.allowedMethods.has(methodName)
                                && (typeof target === "string"
                                || Array.isArray(target)
                                || ArrayBuffer.isView(target)
                                || target instanceof TextDecoder));
                                if (!allowed) {
                                    throw new Error(`Call to '${methodName || "function"}' is not allowed.`);
                                }
                                return fn.apply(target, args);
                            }
                            default:
                                throw new Error(`Unsupported expression: ${node.type}`);
        }
    }
}