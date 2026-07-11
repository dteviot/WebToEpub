"use strict";

/** 
 * Load external parser scripts from configurable remote repos
 *
 *  File only included in off-store builds (path contains /offstore/)
 *  Store builds strip it out in pack.js
 *
 *  Users can configure multiple repository index URLs in Options.json or via the UI.
 *  Each rpeo provides index.json listing parser script URLs
 *  Scripts are fetched as text and eval()'d in the popup context, giving them
 *  full access to parserFactory, HttpClient, util, and all other bundled APIs.
 *
 *  External scripts can override bundled parsers if a script registers a
 *  parser for a host that already has a bundled parser, the external one wins
 */
class ExternalScriptLoader { // eslint-disable-line no-unused-vars
    constructor() {}

    static get storageKey() { return "ExternalScriptCache"; }

    static get defaultRepoUrl() {
        return "https://raw.githubusercontent.com/dteviot/WebToEpub/main/external-parsers/index.json";
    }

    static async init(userPreferences) {
        if (!userPreferences?.externalScriptsEnabled?.value) {
            console.debug("[ExternalScripts] Disabled");
            return;
        }

        const repoUrls = ExternalScriptLoader.parseRepoUrls(userPreferences.externalScriptRepos?.value);
        if (repoUrls.length === 0) {
            console.warn("[ExternalScripts] No repository URLs configured");
            return;
        }

        console.debug(`[ExternalScripts] Loading from ${repoUrls.length} repo(s)`, repoUrls);

        const statusEl = document.getElementById("externalScriptsStatus");
        let loadedCount = 0;
        let errorCount = 0;

        for (const repoUrl of repoUrls) {
            try {
                const hosts = await ExternalScriptLoader.loadFromRepo(repoUrl, userPreferences);
                loadedCount += hosts.length;
                console.debug(`[ExternalScripts] Loaded ${hosts.length} parser(s) from ${repoUrl}`, hosts);
            } catch (err) {
                errorCount++;
                console.error(`[ExternalScripts] Failed to load repo: ${repoUrl}`, err);
            }
        }

        const msg = `External scripts: ${loadedCount} parser(s) loaded${errorCount > 0 ? `, ${errorCount} repo(s) failed` : ""}`;
        console.debug(`[ExternalScripts] ${msg}`);
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.hidden = false;
        }
    }

    static parseRepoUrls(reposValue) {
        if (!reposValue) return [];
        return reposValue
            .split(/[\n,]/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith("#"));
    }

    static async loadFromRepo(indexUrl, userPreferences) {
        const index = await ExternalScriptLoader.fetchIndex(indexUrl);
        const scripts = index.scripts ?? [];
        console.debug(`[ExternalScripts] Index has ${scripts.length} script(s)`);
        const loadedHosts = [];
        const cache = await ExternalScriptLoader.loadCache();

        for (const entry of scripts) {
            const scriptUrl = entry?.url;
            const host = entry?.host ?? scriptUrl;
            if (!scriptUrl) {
                console.warn("[ExternalScripts] Skipping entry with no \"url\" field", entry);
                continue;
            }
            try {
                console.debug(`[ExternalScripts] Loading: ${scriptUrl}`);
                const scriptText = await ExternalScriptLoader.fetchScript(entry, cache, userPreferences);
                if (!scriptText) {
                    console.warn(`[ExternalScripts] Empty script: ${scriptUrl}`);
                    continue;
                }
                ExternalScriptLoader.evalScript(scriptText, scriptUrl);
                loadedHosts.push(host);
                console.debug(`[ExternalScripts] Loaded parser for: ${host}`);
            } catch (err) {
                console.error(`[ExternalScripts] Failed: ${scriptUrl}`, err);
            }
        }

        await ExternalScriptLoader.saveCache(cache);
        return loadedHosts;
    }

    static async fetchIndex(indexUrl) {
        const handler = await HttpClient.fetchJson(indexUrl);
        const index = handler.json;
        if (!index) {
            throw new Error("Index response is null or invalid JSON");
        }
        if (!index.version || index.version < 1) {
            throw new Error(`Invalid index version: ${index.version}`);
        }
        return index;
    }

    static async fetchScript(entry, cache, userPreferences) {
        const scriptUrl = entry.url;
        const cached = cache[scriptUrl];
        const shouldRefetch = !cached || userPreferences?.externalScriptsAutoUpdate?.value;

        if (shouldRefetch) {
            console.debug(`[ExternalScripts] Fetching: ${scriptUrl}`);
            try {
                const scriptText = await HttpClient.fetchText(scriptUrl);
                cache[scriptUrl] = { text: scriptText, fetchedAt: Date.now() };
                return scriptText;
            } catch (err) {
                if (cached) {
                    console.warn(`[ExternalScripts] Refetch failed, using cache: ${scriptUrl}`, err);
                    return cached.text;
                }
                throw err;
            }
        }

        console.debug(`[ExternalScripts] Cache hit: ${scriptUrl}`);
        return cached.text;
    }

    /** eval a fetched script, allowing it to override bundled parsers. */
    static evalScript(scriptText, sourceUrl) {
        const originalRegister = parserFactory.register;
        let overriddenHosts = [];

        parserFactory.register = (hostName, constructor) => {
            try {
                originalRegister.call(parserFactory, hostName, constructor);
            } catch {
                // duplicate, override the bundled parser
                parserFactory.reregister(hostName, constructor);
                overriddenHosts.push(hostName);
            }
        };

        try {
            // eslint-disable-next-line no-eval
            eval(`${scriptText}\n//# sourceURL=${sourceUrl}`);
        } catch (err) {
            throw new Error(`Eval error in ${sourceUrl}: ${err.message}\nStack: ${err.stack}`);
        } finally {
            parserFactory.register = originalRegister;
        }

        if (overriddenHosts.length > 0) {
            console.warn(`[ExternalScripts] Overrode bundled parser(s) for: ${overriddenHosts.join(", ")}`);
        }
    }

    static loadCache() {
        return new Promise((resolve) => {
            chrome.storage.local.get(ExternalScriptLoader.storageKey, (result) => {
                resolve(result[ExternalScriptLoader.storageKey] ?? {});
            });
        });
    }

    static saveCache(cache) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [ExternalScriptLoader.storageKey]: cache }, resolve);
        });
    }

    static clearCache() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(ExternalScriptLoader.storageKey, resolve);
        });
    }
}
