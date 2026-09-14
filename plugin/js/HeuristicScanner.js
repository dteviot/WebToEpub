"use strict";

class HeuristicScanner {
    static async scan(url, preloadedDoc = null) {
        try {
            // Fast-fail: obvious ToC/list URLs are table-of-contents pages.
            // Concise regex — generic index/dir pages are left to the DOM gate
            // (isTableOfContents) to avoid false positives on chapter URLs.
            if (/(chapter[-_]?list|allchapters|catalog|mulu|toc)/i.test(url || "")) {
                return { status: "toc_detected" };
            }

            let doc = preloadedDoc;
            
            if (!doc) {
                let xhr = await HttpClient.fetchHtml(url);
                doc = xhr.responseXML;
            }

            if (!doc) {
                return { status: "failed", error: "Failed to parse DOM" };
            }

            // Check whether the page is a table of contents.
            if (HeuristicScanner.isTableOfContents(doc)) {
                return { status: "toc_detected" };
            }

            let contentNode = HeuristicScanner.findContentNode(doc);
            let contentCss = contentNode ? HeuristicScanner.generateSelector(contentNode) : "body";

            let titleNode = HeuristicScanner.findTitleNode(doc);
            let titleCss = titleNode ? HeuristicScanner.generateSelector(titleNode) : "";

            return {
                status: "success",
                contentCss: contentCss,
                titleCss: titleCss
            };

        } catch (error) {
            return { status: "failed", error: error.message };
        }
    }

    static isTableOfContents(doc) {
        // Tolerate malformed/empty documents (e.g. a responseXML whose body
        // was never materialised, or a bodyless fragment): a page with no body
        // cannot carry a ToC link mesh, so treat it as chapter content and let
        // the downstream crawl decide, instead of throwing inside the walker.
        if (!doc || !doc.body) return false;
        // C1 gate: link-text ratio over the visible (non-script/style) text.
        // Exclude text inside <script>, <style> and <noscript> so inline JS/CSS
        // source code does not inflate the denominator and sink the link-text
        // ratio below the ToC threshold (consistent with findContentNode).
        let walker = doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    let parent = node.parentElement;
                    if (parent) {
                        let tag = parent.tagName.toLowerCase();
                        if (tag === "script" || tag === "style" || tag === "noscript") {
                            return NodeFilter.FILTER_REJECT;
                        }
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        let node;
        let totalTextLength = 0;
        let linkTextLength = 0;

        while ((node = walker.nextNode())) {
            let text = node.textContent.trim();
            if (text.length === 0) continue;
            totalTextLength += text.length;

            if (node.parentElement && node.parentElement.closest("a")) {
                linkTextLength += text.length;
            }
        }

        let linkDensity = totalTextLength > 0 ? (linkTextLength / totalTextLength) : 0;

        // --- Dual-track ToC detection: strong semantic direct-pass + weak-feature ratio anti-spoof ---
        // Core dictionaries for chapter-like link recognition. The numeral class
        // spans ASCII digits and CJK numerals so "第十二章" / "第二十回" match
        // without relying on Arabic digits alone (and without loosely matching
        // every stray "第" in prose like "第一眼").
        const NUM_CHARS = "0-9〇零一二三四五六七八九十百千万萬两兩壹贰貳叁參肆伍陆陸柒捌玖拾佰仟廿卅卌";
        const SPECIAL_CHAPTERS = "序章|尾声|后记|前言|楔子|番外|prologue|epilogue|interlude|teaser";
        const EN_CHAPTER = "chapter|volume|vol|part|section|episode";

        const regexAnyNumber = /\d/;
        const regexChapter = new RegExp(
            `(第\\s*[${NUM_CHARS}\\-\\~至和与、]+\\s*[章节回折卷部篇集番]|${EN_CHAPTER}|^\\d+(-\\d+)?$|${SPECIAL_CHAPTERS})`,
            "i"
        );
        // Hoisted out of the per-link loop so it is compiled once per scan,
        // not once per anchor (the loop below may iterate hundreds of links).
        const regexSpecialChapters = new RegExp(`(${SPECIAL_CHAPTERS})`, "i");

        // Resolve the page origin from the document base URI so the same-origin
        // check also works for parsed (non-HTML) responseXML documents, where
        // window.location does not refer to the target page.
        let pageOrigin = "";
        try {
            pageOrigin = new URL(doc.baseURI).origin;
        } catch (e) {
            pageOrigin = "";
        }

        let allLinks = doc.body.querySelectorAll("a");
        let chapterLikeCount = 0;
        let anyNumberCount = 0;
        let sameOriginCount = 0;

        for (let a of allLinks) {
            // textContent is used (not innerText) because innerText is layout-aware
            // and unreliable on parsed responseXML documents without a rendering box.
            let text = (a.textContent || "").replace(/\s+/g, "");
            if (!text) continue;

            // Resolve the anchor's absolute URL, falling back to manual resolution
            // against the document base when a.href is not populated (parsed DOMs).
            let href = a.href;
            if (!href) {
                let raw = a.getAttribute("href");
                if (raw) {
                    try {
                        href = new URL(raw, doc.baseURI).href;
                    } catch (e) {
                        href = "";
                    }
                }
            }

            // Count same-origin links only; cross-origin links carry no ToC
            // signal. Compare URL origins strictly (not string prefix), since
            // a prefix check is spoofable (e.g. "https://example.com.evil.com/").
            let isSameOrigin = false;
            if (pageOrigin && href) {
                try {
                    isSameOrigin = new URL(href).origin === pageOrigin;
                } catch (e) {
                    isSameOrigin = false;
                }
            }
            if (isSameOrigin) {
                sameOriginCount++;

                // Strong semantic feature (full CJK set): evaluated independently
                // of the weak Arabic-only check, so pure-CJK chapter titles like
                // "第十二章" still count toward chapterLikeCount.
                if (regexChapter.test(text)) {
                    chapterLikeCount++;
                }

                // Weak statistical feature: Arabic digits only, to stay
                // discriminative on Chinese pages where CJK numeral characters
                // appear as ordinary Hanzi. Special chapters carry no digit but
                // are still counted here to satisfy the ratio (unchanged).
                if (regexAnyNumber.test(text)) {
                    anyNumberCount++;
                } else if (regexSpecialChapters.test(text)) {
                    anyNumberCount++;
                }
            }
        }

        // Strong direct-pass: a cluster of chapter-like links is a confident
        // ToC signal. Weak anti-spoof: with only generic same-origin links,
        // require high density or a non-trivial numbered-link ratio to avoid
        // false positives on recommendation-link-stuffed content pages.
        return linkDensity > 0.35 && (
            chapterLikeCount >= 10 ||
            (sameOriginCount >= 25 && (linkDensity > 0.85 || anyNumberCount / sameOriginCount > 0.15))
        );
    }

    static findContentNode(doc) {
        let candidates = [];
        let walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
        let node;
        
        const badPatterns = /comment|footer|sidebar|menu|nav|ad|promo|widget|\u8BC4\u8BBA|\u63A8\u8350|\u7559\u8A00|\u30B3\u30E1\u30F3\u30C8|\uB313\uAE00/i;
        const goodPatterns = /content|chapter|article|text|body|\u6B63\u6587|\u5185\u5BB9|\u672C\u7DE8|\u672C\u6587/i;

        while ((node = walker.nextNode())) {
            let tag = node.tagName.toLowerCase();
            if (["script", "style", "nav", "header", "footer"].includes(tag)) continue;

            let pCount = node.getElementsByTagName("p").length;
            let brCount = node.getElementsByTagName("br").length;
            
            if (pCount > 2 || brCount > 4) {
                let className = node.className || "";
                let id = node.id || "";
                let attrString = `${className} ${id}`;

                if (badPatterns.test(attrString)) continue;

                let score = pCount * 2 + brCount;
                if (goodPatterns.test(attrString)) {
                    score += 50; 
                }
                candidates.push({ node, score });
            }
        }

        if (candidates.length === 0) return null;
        
        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);
        
        // Innermost Node Wins logic (Child > Parent)
        let bestCandidate = candidates[0];
        
        for (let i = 1; i < candidates.length; i++) {
            let challenger = candidates[i];
            
            // If the challenger has the same or very similar score (e.g., >= 80% of best score)
            if (challenger.score >= bestCandidate.score * 0.8) {
                // If the current best candidate contains the challenger, the challenger is deeper.
                // It means the parent is just an outer wrapper. We prefer the deeper node.
                if (bestCandidate.node.contains(challenger.node)) {
                    bestCandidate = challenger;
                }
            } else {
                // Since candidates are sorted by score, we can break early if scores drop too low.
                break;
            }
        }

        return bestCandidate.node;
    }

    static findTitleNode(doc) {
        // Added h1, h2 to match patterns like "style_h1"
        const titlePatterns = /title|heading|chapter-title|h1|h2|\u6807\u9898|\u30BF\u30A4\u30C8\u30EB|\uC81C\uBAA9/i;
        
        let h1 = doc.querySelector("h1");
        if (h1) return h1;

        let candidates = [];
        // Added p to the selector
        let headers = doc.querySelectorAll("h2, h3, div, span, strong, p");
        for (let node of headers) {
            let text = node.textContent.trim();
            
            // Added length restriction: titles should not be empty and shouldn't be too long
            if (text.length === 0 || text.length > 100) continue;

            let className = node.className || "";
            let id = node.id || "";
            let attrString = `${className} ${id}`;

            if (titlePatterns.test(attrString)) {
                candidates.push(node);
            }
        }

        if (candidates.length > 0) return candidates[0];
        return null;
    }

    static generateSelector(node) {
        if (node.id) {
            return `#${CSS.escape(node.id)}`;
        }
        if (node.className && typeof node.className === "string") {
            let classes = node.className.trim().split(/\s+/).filter(c => c).map(c => CSS.escape(c));
            if (classes.length > 0) {
                return `.${classes.join(".")}`;
            }
        }
        return node.tagName.toLowerCase();
    }
}