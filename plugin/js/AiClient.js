"use strict";

/**
 * AiClient - Interacts with Pollinations AI for search fallbacks and parser autocompletion.
 */
class AiClient { // eslint-disable-line no-unused-vars
    static MODEL = "nova-fast"; // Cost-efficient and fast

    // Pre-compiled regexes for performance
    static REGEX_SCRIPT = /<script\b(?![^>]*\btype=['"]?(?:application\/ld\+json|__NUXT__)['"]?)[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    static REGEX_STYLE = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
    static REGEX_SVG = /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi;
    static REGEX_COMMENT = /<!--[\s\S]*?-->/g;
    static REGEX_SPACE = /\s+/g;

    static _extractJson(text) {
        text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/ig, "$1");
        let objStart = text.indexOf("{");
        let arrStart = text.indexOf("[");
        let startIndex = -1;
        if (objStart !== -1 && arrStart !== -1) startIndex = Math.min(objStart, arrStart);
        else if (objStart !== -1) startIndex = objStart;
        else if (arrStart !== -1) startIndex = arrStart;
        if (startIndex === -1) return text;
        
        let objEnd = text.lastIndexOf("}");
        let arrEnd = text.lastIndexOf("]");
        let endIndex = Math.max(objEnd, arrEnd);
        
        if (endIndex !== -1 && endIndex > startIndex) {
            return text.substring(startIndex, endIndex + 1);
        }
        return text;
    }

    /**
     * Use AI to extract search results from HTML when manual parsing fails.
     * @param {string} html 
     * @param {string} query 
     * @param {string} baseUrl 
     * @returns {Promise<Array>}
     */
    static async fetchAiResults(html, query, baseUrl) {
        const apiKey = typeof Secrets !== "undefined" ? Secrets.POLLINATIONS_API_KEY : null;
        if (!apiKey) {
            console.warn("[AiClient] No API key found in Secrets.js");
            return [];
        }

        const simplifiedHtml = AiClient.simplifyHtml(html).substring(0, 10000);

        const prompt = `
Extract search results for the novel search query "${query}" from the following HTML snippet.
Base URL: ${baseUrl}

Return a JSON array of objects with "title", "url", and "snippet". 
Ensure URLs are absolute. If the site is unavailable or no results found, return an empty array [].

HTML Snippet:
${simplifiedHtml}
`;

        try {
            const fetchOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AiClient.MODEL,
                    messages: [
                        { role: "system", content: "You are a specialized data extractor for web novel search results. Output ONLY valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    stream: false
                })
            };

            const xhr = await HttpClient.fetchJson("https://gen.pollinations.ai/v1/chat/completions", fetchOptions);
            const data = xhr.json;
            const aiText = data.choices[0]?.message?.content || "[]";
            const results = JSON.parse(AiClient._extractJson(aiText));

            console.log(`[AiClient] Successfully extracted ${results.length} results via AI.`);
            return results;
        } catch (e) {
            console.error("[AiClient] Failed to fetch AI results:", e);
            return [];
        }
    }

    /**
     * Identify CSS selectors for chapter content, title, and removal list using AI.
     * @param {string} html 
     * @param {string} url
     * @returns {Promise<Object>}
     */
    static async fetchAiSelectors(html, url) {
        const apiKey = typeof Secrets !== "undefined" ? Secrets.POLLINATIONS_API_KEY : null;
        if (!apiKey) return null;

        const simplifiedHtml = AiClient.simplifyHtml(html).substring(0, 30000);
        const prompt = `
You are helping a user autocomplete the "Default Parser" settings for WebToEpub.
URL: ${url}

Identify the best CSS selectors for:
1. "content": The main element holding the story text (e.g., ".chapter-inner", "#vortex-content").
2. "title": The element holding the chapter title (e.g., "h1.entry-title", ".chapter-header h2").
3. "remove": A comma-separated string of selectors for elements to EXCLUDE (social sharing, ads, "next chapter" buttons, comments).

Return ONLY a JSON object: {"content": "...", "title": "...", "remove": "..."}

HTML Structure:
${simplifiedHtml}
`;

        try {
            const fetchOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AiClient.MODEL,
                    messages: [
                        { role: "system", content: "You are a web parsing expert. Output ONLY valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    stream: false
                })
            };

            const xhr = await HttpClient.fetchJson("https://gen.pollinations.ai/v1/chat/completions", fetchOptions);
            const data = xhr.json;
            const aiText = data.choices[0]?.message?.content || "{}";
            const results = JSON.parse(AiClient._extractJson(aiText));

            console.log("[AiClient] Autocomplete selectors found:", results);
            return results;
        } catch (e) {
            console.error("[AiClient] Failed to autocomplete selectors:", e);
            return null;
        }
    }

    /**
     * Detect the first chapter URL and site-level selectors from a TOC page.
     * @param {string} html 
     * @param {string} baseUrl 
     * @returns {Promise<Object>} {firstChapterUrl, novelTitle, author}
     */
    static async fetchAiFirstChapter(html, baseUrl) {
        const apiKey = typeof Secrets !== "undefined" ? Secrets.POLLINATIONS_API_KEY : null;
        if (!apiKey) return null;

        const simplifiedHtml = AiClient.simplifyHtml(html).substring(0, 20000);
        const prompt = `
You are helping identify the first chapter link of a novel from its Table of Contents (TOC) page.
Base URL: ${baseUrl}

Identify:
1. "firstChapterUrl": The absolute URL of the very first chapter (e.g., Chapter 1).
2. "novelTitle": The title of the novel if clearly visible.
3. "author": The author name if clearly visible.
4. "nextPageCss": The CSS selector for the 'Next' pagination link to go to page 2 of the TOC. If there is no pagination, return an empty string.

Return ONLY a JSON object: {"firstChapterUrl": "...", "novelTitle": "...", "author": "...", "nextPageCss": "..."}

HTML Snippet:
${simplifiedHtml}
`;

        try {
            const fetchOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AiClient.MODEL,
                    messages: [
                        { role: "system", content: "You are a novel site expert. Output ONLY valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    stream: false
                })
            };

            const xhr = await HttpClient.fetchJson("https://gen.pollinations.ai/v1/chat/completions", fetchOptions);
            const data = xhr.json;
            const aiText = data.choices[0]?.message?.content || "{}";
            return JSON.parse(AiClient._extractJson(aiText));
        } catch (e) {
            console.error("[AiClient] Failed to detect first chapter:", e);
            return null;
        }
    }

    /**
     * Strips scripts, styles, and other noise to maximize structural content for AI.
     */
    static simplifyHtml(html) {
        if (!html) return "";
        return html
            .replace(AiClient.REGEX_SCRIPT, "")
            .replace(AiClient.REGEX_STYLE, "")
            .replace(AiClient.REGEX_SVG, "")
            .replace(AiClient.REGEX_COMMENT, "")
            .replace(AiClient.REGEX_SPACE, " ")
            .trim();
    }
}
