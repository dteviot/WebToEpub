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
class ExternalScriptLoader {
    constructor() {}

    static get storageKey() { return "ExternalScriptCache"; }

    static get defaultRepoUrl() {
        return "https://raw.githubusercontent.com/dteviot/WebToEpub/main/external-parsers/index.json";
    }

    static async init(userPreferences) {
        if (!userPreferences?.externalScriptsEnabled?.value) {
            util.log("External scripts disabled.");
            return;
        }

        const repoUrls = ExternalScriptLoader.parseRepoUrls(userPreferences.externalScriptRepos?.value);
        if (repoUrls.length === 0) {
            util.log("No external script repositories configured.");
            return;
        }

        const statusEl = document.getElementById("externalScriptsStatus");
        let loadedCount = 0;
        let errorCount = 0;

        for (const repoUrl of repoUrls) {
            try {
                const hosts = await ExternalScriptLoader.loadFromRepo(repoUrl, userPreferences);
                loadedCount += hosts.length;
            } catch (err) {
                errorCount++;
                util.log(`Failed to load external script repo: ${repoUrl} - ${err.message}`);
            }
        }

        const msg = `External scripts: ${loadedCount} parser(s) loaded${errorCount > 0 ? `, ${errorCount} repo(s) failed` : ""}`;
        util.log(msg);
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
        const loadedHosts = [];
        const cache = await ExternalScriptLoader.loadCache();

        for (const entry of index.scripts ?? []) {
            try {
                const scriptText = await ExternalScriptLoader.fetchScript(entry, cache, userPreferences);
                if (scriptText) {
                    ExternalScriptLoader.evalScript(scriptText, entry.url);
                    loadedHosts.push(entry.host ?? entry.url);
                }
            } catch (err) {
                util.log(`Failed to load external script: ${entry.url ?? entry.host} - ${err.message}`);
            }
        }

        await ExternalScriptLoader.saveCache(cache);
        return loadedHosts;
    }

    static async fetchIndex(indexUrl) {
        const response = await HttpClient.wrapFetch(indexUrl);
        const text = await response.response.text();
        const index = JSON.parse(text);
        if (!index.version || index.version < 1) {
            throw new Error("Invalid index version");
        }
        return index;
    }

    static async fetchScript(entry, cache, userPreferences) {
        const scriptUrl = entry.url;
        if (!scriptUrl) {
            throw new Error("Script entry missing 'url' field");
        }

        const cached = cache[scriptUrl];
        const shouldRefetch = !cached || userPreferences?.externalScriptsAutoUpdate?.value;

        if (shouldRefetch) {
            try {
                const response = await HttpClient.wrapFetch(scriptUrl);
                const scriptText = await response.response.text();
                cache[scriptUrl] = { text: scriptText, fetchedAt: Date.now() };
                return scriptText;
            } catch (err) {
                if (cached) {
                    util.log(`Failed to refetch, using cached: ${scriptUrl}`);
                    return cached.text;
                }
                throw err;
            }
        }
        return cached.text;
    }

    /** eval a fetched script, allowing it to override bundled parsers. */
    static evalScript(scriptText, sourceUrl) {
        const originalRegister = parserFactory.register;
        parserFactory.register = (hostName, constructor) => {
            try {
                originalRegister.call(parserFactory, hostName, constructor);
            } catch {
                // Duplicate — override the bundled parser
                parserFactory.reregister(hostName, constructor);
                util.log(`External script overrode bundled parser for: ${hostName}`);
            }
        };

        try {
            // eslint-disable-next-line no-eval
            eval(`${scriptText}\n//# sourceURL=${sourceUrl}`);
        } catch (err) {
            throw new Error(`Eval error in ${sourceUrl}: ${err.message}`);
        } finally {
            parserFactory.register = originalRegister;
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
