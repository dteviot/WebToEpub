"use strict";

/**
 * AiClient - Interacts with Pollinations AI for search fallbacks and parser autocompletion.
 */
class AiClient {
    static MODEL = "nova-fast"; // Cost-efficient and fast

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
            const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
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
            });

            if (!response.ok) throw new Error(`AI API error: ${response.status}`);

            const data = await response.json();
            const aiText = data.choices[0]?.message?.content || "[]";
            const jsonMatch = aiText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const results = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);

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
            const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
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
            });

            if (!response.ok) throw new Error(`AI API error: ${response.status}`);
            const data = await response.json();
            const aiText = data.choices[0]?.message?.content || "{}";
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            const results = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);

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

Return ONLY a JSON object: {"firstChapterUrl": "...", "novelTitle": "...", "author": "..."}

HTML Snippet:
${simplifiedHtml}
`;

        try {
            const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
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
            });

            if (!response.ok) throw new Error(`AI API error: ${response.status}`);
            const data = await response.json();
            const aiText = data.choices[0]?.message?.content || "{}";
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            return JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
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
            // Remove scripts except those likely to contain data
            .replace(/<script\b(?![^>]*\btype=['"]?(?:application\/ld\+json|__NUXT__)['"]?)[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }
}
