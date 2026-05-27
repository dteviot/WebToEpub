"use strict";

/**
 * SiteSearchEngine - Custom search engine that queries novel sites directly.
 * 
 * Optimizations:
 *   - Races all proxies simultaneously (Promise.any) instead of sequential fallback
 *   - Strips <script>/<link>/<style> tags from proxied HTML to prevent resource loading
 *   - Caches site config arrays (no re-creation per call)
 *   - 6-second per-proxy timeout via AbortController
 *   - Caps results per site to 20 to prevent UI flooding
 *   - Progressive rendering via onResults callback
 */
class SiteSearchEngine {

    /** Max results to keep per individual site */
    static MAX_RESULTS_PER_SITE = 20;

    /** Timeout per proxy attempt in ms */
    static PROXY_TIMEOUT_MS = 6000;

    // ─── Site Configurations (cached) ────────────────────────────────────

    static _primarySites = null;
    static _secondarySites = null;

    static get PRIMARY_SITES() {
        if (!SiteSearchEngine._primarySites) {
            SiteSearchEngine._primarySites = SiteSearchEngine._buildPrimarySites();
        }
        return SiteSearchEngine._primarySites;
    }

    static get SECONDARY_SITES() {
        if (!SiteSearchEngine._secondarySites) {
            SiteSearchEngine._secondarySites = SiteSearchEngine._buildSecondarySites();
        }
        return SiteSearchEngine._secondarySites;
    }

    static _buildPrimarySites() {
        return [
            {
                name: "NovelFull",
                hostname: "novelfull.com",
                searchUrl: (q) => `https://novelfull.com/search?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".list-truyen .row");
                    if (items.length === 0) items = dom.querySelectorAll(".archive .list-truyen-item-wrap");
                    for (let item of items) {
                        let a = item.querySelector(".truyen-title a") || item.querySelector("h3 a") || item.querySelector("a");
                        if (a && a.href) {
                            let snippet = item.querySelector(".text-primary") || item.querySelector(".author");
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://novelfull.com", a.getAttribute("href")),
                                snippet: snippet ? snippet.textContent.trim() : "",
                                source: "NovelFull"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "RoyalRoad",
                hostname: "royalroad.com",
                searchUrl: (q) => `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".fiction-list-item");
                    for (let item of items) {
                        let a = item.querySelector("h2.fiction-title a") || item.querySelector("a.font-red-sunglo") || item.querySelector("a");
                        if (a && a.href) {
                            let snippet = item.querySelector(".margin-bottom-10 p") || item.querySelector(".hidden-content");
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://www.royalroad.com", a.getAttribute("href")),
                                snippet: snippet ? snippet.textContent.trim().substring(0, 150) : "",
                                source: "RoyalRoad"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "FreeWebNovel",
                hostname: "freewebnovel.com",
                searchUrl: (q) => `https://freewebnovel.com/search/?searchkey=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".li-row");
                    if (items.length === 0) items = dom.querySelectorAll(".col-content .li");
                    for (let item of items) {
                        let a = item.querySelector("h3.tit a") || item.querySelector(".tit a") || item.querySelector("a");
                        if (a && a.href) {
                            let snippet = item.querySelector(".txt") || item.querySelector("p");
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://freewebnovel.com", a.getAttribute("href")),
                                snippet: snippet ? snippet.textContent.trim().substring(0, 150) : "",
                                source: "FreeWebNovel"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "NovelHall",
                hostname: "novelhall.com",
                searchUrl: (q) => `https://www.novelhall.com/index.php?s=so&module=book&keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".section3 table tr");
                    for (let item of items) {
                        let a = item.querySelector("td:nth-child(2) a");
                        if (a && a.href) {
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://www.novelhall.com", a.getAttribute("href")),
                                snippet: "",
                                source: "NovelHall"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "NovelFire",
                hostname: "novelfire.net",
                searchUrl: (q) => `https://novelfire.net/search?keyword=${encodeURIComponent(q)}&type=title`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".novel-item, .col-lg-6 a[href*='/book/']");
                    for (let item of items) {
                        let a = item.tagName === "A" ? item : item.querySelector("a[href*='/book/']");
                        let titleEl = item.querySelector(".novel-title, h4, h3");
                        if (a) {
                            results.push({
                                title: (titleEl ? titleEl.textContent : a.getAttribute("title") || a.textContent).trim(),
                                url: SiteSearchEngine.resolveUrl("https://novelfire.net", a.getAttribute("href")),
                                snippet: "",
                                source: "NovelFire"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "ScribbleHub",
                hostname: "scribblehub.com",
                searchUrl: (q) => `https://www.scribblehub.com/?s=${encodeURIComponent(q)}&post_type=fictionposts`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".search_main_box");
                    if (items.length === 0) items = dom.querySelectorAll(".search_body .search_row");
                    for (let item of items) {
                        let a = item.querySelector(".search_title a") || item.querySelector("a");
                        if (a && a.href) {
                            let snippet = item.querySelector(".search_genre") || item.querySelector(".fdi");
                            results.push({
                                title: a.textContent.trim(),
                                url: a.href,
                                snippet: snippet ? snippet.textContent.trim() : "",
                                source: "ScribbleHub"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "Archive of Our Own",
                hostname: "archiveofourown.org",
                searchUrl: (q) => `https://archiveofourown.org/works/search?work_search%5Bquery%5D=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll("li.work");
                    for (let item of items) {
                        let a = item.querySelector(".heading a:first-child");
                        if (a && a.href) {
                            let fandomEl = item.querySelector(".fandoms");
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://archiveofourown.org", a.getAttribute("href")),
                                snippet: fandomEl ? fandomEl.textContent.trim() : "",
                                source: "AO3"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "WuxiaWorld",
                hostname: "wuxiaworld.com",
                searchUrl: (q) => `https://www.wuxiaworld.com/api/novels/search?query=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    try {
                        // linkedom and DOMParser might wrap JSON in <pre> or <body>
                        let content = dom.body ? dom.body.textContent : dom.textContent;
                        content = content.trim();
                        // Handle the case where the JSON is wrapped in a pre tag (common in browser auto-formatting)
                        if (content.startsWith("{") || content.startsWith("[")) {
                            let data = JSON.parse(content);
                            if (data && data.items) {
                                for (let item of data.items) {
                                    results.push({
                                        title: item.name,
                                        url: `https://www.wuxiaworld.com/novel/${item.slug}`,
                                        snippet: item.synopsis ? item.synopsis.replace(/<[^>]*>/g, "").substring(0, 150) : "",
                                        source: "WuxiaWorld"
                                    });
                                }
                                return results;
                            }
                        }
                    } catch (e) {
                        console.warn("[SiteSearch] WuxiaWorld JSON parse failed, falling back to HTML.", e);
                    }

                    // Fallback to HTML parsing
                    let items = dom.querySelectorAll(".novel-item, .MuiGrid-item, article, [class*='NovelItem']");
                    for (let item of items) {
                        let a = item.querySelector("a[href*='/novel/']") || item.querySelector("a");
                        if (a) {
                            let titleEl = item.querySelector("h4, h3, .novel-title, [class*='Title']") || a;
                            results.push({
                                title: titleEl.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://www.wuxiaworld.com", a.getAttribute("href")),
                                snippet: "",
                                source: "WuxiaWorld"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "WTR-Lab",
                hostname: "wtr-lab.com",
                searchUrl: (q) => `https://wtr-lab.com/en/novel-finder?text=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll("a.title");
                    for (let a of items) {
                        if (a.href) {
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://wtr-lab.com", a.getAttribute("href")),
                                snippet: "",
                                source: "WTR-Lab"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "NovelGo",
                hostname: "novelgo.id",
                searchUrl: (q) => `https://novelgo.id/?post_type=novel&s=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".novel-item, article, .bs");
                    for (let item of items) {
                        let a = item.querySelector("a[href*='/novel/'], a[href*='/book/']");
                        if (a) {
                            let titleEl = item.querySelector(".novel-item-title, .novel-title, .tt, .ntitle, h3, h2") || a;
                            results.push({
                                title: titleEl.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://novelgo.id", a.getAttribute("href")),
                                snippet: "",
                                source: "NovelGo"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "BoxNovel",
                hostname: "novgo.net",
                searchUrl: (q) => `https://novgo.net/search?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".list-novel .novel-item, .update-item, .novel-item, .post-item");
                    for (let item of items) {
                        let a = item.querySelector("h3 a, .novel-title a, .post-title a, a");
                        if (a) {
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://novgo.net", a.getAttribute("href")),
                                snippet: "",
                                source: "BoxNovel"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "Readwn",
                hostname: "wuxiabox.com",
                searchUrl: (q) => `https://www.wuxiabox.com/search.html?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".row .col-md-3, .novel-item, .post-item, a[href*='/novel/']");
                    for (let item of items) {
                        let a = item.tagName === "A" ? item : item.querySelector("h4 a, a[title], a");
                        if (a && a.getAttribute("href")) {
                            let titleEl = item.querySelector("h4, .title") || a;
                            results.push({
                                title: a.getAttribute("title") || titleEl.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://www.wuxiabox.com", a.getAttribute("href")),
                                snippet: "",
                                source: "Readwn"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "FreeWebNovel",
                hostname: "freewebnovel.com",
                searchUrl: (q) => "https://freewebnovel.com/search",
                getFetchOptions: (q) => {
                    return {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: `searchkey=${encodeURIComponent(q)}`
                    };
                },
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".li-row, .col-content .li, .li");
                    for (let item of items) {
                        let a = item.querySelector("h3.tit a, .tit a, a");
                        if (a && a.href) {
                            let snippet = item.querySelector(".txt, p, .intro");
                            results.push({
                                title: a.textContent.trim(),
                                url: SiteSearchEngine.resolveUrl("https://freewebnovel.com", a.getAttribute("href")),
                                snippet: snippet ? snippet.textContent.trim().substring(0, 150) : "",
                                source: "FreeWebNovel"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "NovelCodex",
                hostname: "novelcodex.com",
                searchUrl: (q) => "https://www.novelcodex.com/api/t/getSearchResult?batch=1",
                getFetchOptions: async (q) => {
                    try {
                        if (typeof CompressionStream !== "undefined") {
                            const stream = new Blob([q]).stream().pipeThrough(new CompressionStream("gzip"));
                            const response = new Response(stream);
                            const buffer = await response.arrayBuffer();
                            const uint8 = new Uint8Array(buffer);
                            let binary = "";
                            for (let i = 0; i < uint8.byteLength; i++) {
                                binary += String.fromCharCode(uint8[i]);
                            }
                            const base64 = btoa(binary);
                            return { url: `https://www.novelcodex.com/api/t/getSearchResult?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": base64 }))}` };
                        }
                    } catch (e) {
                        console.warn("[SiteSearch] NovelCodex gzip failed", e);
                    }
                    return { url: `https://www.novelcodex.com/api/t/getSearchResult?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": q }))}` };
                },
                parseResults: (dom) => {
                    let results = [];
                    try {
                        let content = dom.body ? dom.body.textContent : dom.textContent;
                        let data = JSON.parse(content);
                        let items = data[0]?.result?.data?.json;
                        if (items) {
                            for (let item of items) {
                                results.push({
                                    title: item.title,
                                    url: `https://www.novelcodex.com/book/${item.slug}`,
                                    snippet: item.summary || "",
                                    source: "NovelCodex"
                                });
                            }
                        }
                    } catch (e) { }
                    return results;
                }
            }
        ];
    }

    static _buildSecondarySites() {
        let sites = [
            {
                name: "NovelBin",
                hostname: "novelbin.com",
                searchUrl: (q) => `https://novelbin.com/search?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseNovelFullStyle(dom, "https://novelbin.com", "NovelBin")
            },
            {
                name: "NovelNext",
                hostname: "novelnext.com",
                searchUrl: (q) => `https://novelnext.com/search?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseNovelFullStyle(dom, "https://novelnext.com", "NovelNext")
            },
            {
                name: "FanFiction.net",
                hostname: "www.fanfiction.net",
                searchUrl: (q) => `https://www.fanfiction.net/search/?keywords=${encodeURIComponent(q)}&type=story`,
                parseResults: (dom) => {
                    let results = [];
                    let items = dom.querySelectorAll(".z-list");
                    for (let item of items) {
                        let a = item.querySelector("a.stitle");
                        if (a && a.href) {
                            let snippet = item.querySelector(".z-indent .z-padtop") || item.querySelector(".z-padtop");
                            results.push({
                                title: a.textContent.trim(),
                                url: a.href,
                                snippet: snippet ? snippet.textContent.trim().substring(0, 150) : "",
                                source: "FanFiction.net"
                            });
                        }
                    }
                    return results;
                }
            },
            {
                name: "ReadLightNovel",
                hostname: "readlightnovel.me",
                searchUrl: (q) => `https://readlightnovel.me/search/autocomplete?dataType=json&query=${encodeURIComponent(q)}`,
                parseResults: (dom) => {
                    let results = [];
                    let links = dom.querySelectorAll("a");
                    for (let a of links) {
                        if (a.href && a.href.includes("readlightnovel")) {
                            results.push({
                                title: a.textContent.trim(),
                                url: a.href,
                                snippet: "",
                                source: "ReadLightNovel"
                            });
                        }
                    }
                    return results;
                }
            }
        ];

        // Categorized batch addition for the ~500 sites
        SiteSearchEngine._addEngineSites(sites);

        return sites;
    }

    // ─── Shared Parsers & Helpers ────────────────────────────────────────

    static _addEngineSites(sites) {
        // NovelFull Engine
        const novelFullHosts = ["allnovelbin.net", "allnovelbook.com", "allnovelfull.app", "allnovelfull.com", "all-novelfull.net", "allnovelfull.net", "allnovelnext.com", "allnovel.org", "bestlightnovel.com", "boxnovelfull.com", "chinesewuxia.world", "fastnovel.net", "freewn.com", "fullnovel.co", "novelactive.org", "novel-bin.com", "novelbin.me", "novel-bin.net", "novelbin.net", "novel-bin.org", "novelbin.org", "noveldrama.org", "novelfullbook.com", "novelfull.com", "novelfulll.com", "novelfull.net", "novelgate.net", "novelmax.net", "novel-next.com", "novelnext.com", "novelnext.dramanovels.io", "novelnext.net", "novelnextz.com", "novelonlinefree.com", "novelonlinefree.info", "novelonlinefull.com", "noveltrust.net", "novelusb.com", "novelusb.net", "novelxo.net", "novlove.com", "onlinenovelbook.com", "readnoveldaily.com", "readnovelfull.me", "topnovelfull.com", "wuxiaworld.live", "wuxia-world.online", "wuxiaworld.online", "zinnovel.net"];
        for (let h of novelFullHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/search?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseNovelFullStyle(dom, `https://${h}`, h)
            });
        }

        // Madara Engine
        const madaraHosts = ["greenztl2.com", "isekaiscan.com", "listnovel.com", "mangabob.com", "mangasushi.net", "manhwatop.com", "morenovel.net", "nightcomic.com", "noveltrench.com", "pery.info", "readwebnovel.xyz", "vipnovel.com", "webnovel.live", "wuxiaworld.site"];
        for (let h of madaraHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/?s=${encodeURIComponent(q)}&post_type=wp-manga`,
                parseResults: (dom) => SiteSearchEngine.parseMadaraStyle(dom, `https://${h}`, h)
            });
        }

        // Readwn Engine
        const readwnHosts = ["fanmtl.com", "fannovel.com", "fannovels.com", "fansmtl.com", "novellive.app", "novellive.com", "novellive.net", "novelmt.com", "novelmtl.com", "readwn.org", "wuxiabee.com", "wuxiabee.net", "wuxiabee.org", "wuxiafox.com", "wuxiago.com", "wuxiahere.com", "wuxiahub.com", "wuxiamtl.com", "wuxiaone.com", "wuxiap.com", "wuxiapub.com", "wuxiar.com", "wuxiaspot.com", "wuxiau.com", "wuxiazone.com"];
        for (let h of readwnHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/search?q=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseReadwnStyle(dom, `https://${h}`, h)
            });
        }

        // Wordpress Engine
        const wpHosts = ["bakapervert.wordpress.com", "blossomtranslation.com", "cherrymist.cafe", "crimsonmagic.me", "emberlib731.xyz", "flyonthewalls.blog", "frostfire10.wordpress.com", "igniforge.com", "isekaicyborg.wordpress.com", "lilyonthevalley.com", "moonbunnycafe.com", "nhvnovels.com", "novelib.com", "pienovels.com", "rainingtl.org", "raisingthedead.ninja", "razentl.com", "sasakitomyiano.wordpress.com", "shalvationtranslations.wordpress.com", "skythewoodtl.com", "smeraldogarden.com", "springofromance.com", "yoraikun.wordpress.com"];
        for (let h of wpHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/?s=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseWordpressStyle(dom, `https://${h}`, h)
            });
        }

        // Noblemtl Engine
        const nobleHosts = ["arcanetranslations.com", "bookalb.com", "daotranslate.com", "daotranslate.us", "faloomtl.com", "genesistls.com", "hoxionia.com", "jobnib.com", "moonlightnovel.com", "novelcranel.org", "novelsknight.com", "novelsparadise.net", "pandamtl.com", "readfreebooksonline.org", "tamagotl.com", "taonovel.com", "universalnovel.com"];
        for (let h of nobleHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/?s=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseNoblemtlStyle(dom, `https://${h}`, h)
            });
        }

        // LightNovelWorld Engine
        const lnwHosts = ["lightnovelcave.com", "lightnovelpub.fan", "novelbob.org", "novelfire.docsachhay.net", "novelpub.com", "pandanovel.co", "webnovelpub.com", "webnovelpub.pro"];
        for (let h of lnwHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/search?keyword=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseLightNovelWorldStyle(dom, `https://${h}`, h)
            });
        }

        // General / Other Sites (~400 sites)
        const generalHosts = ["27k.net", "4ksw.com", "69shuba.tw", "888novel.com", "88xiaoshuo.net", "aerialrain.com", "akknovel.com", "alicesw.com", "alphapolis.co.jp", "alternatehistory.com", "amor-yaoi.com", "anythingnovel.com", "api.mangadex.org", "app.yoru.world", "archiveofourown.org", "asianfanfics.com", "asianhobbyist.com", "asianovel.net", "asstr.org", "a-t.nu", "babelnovel.com", "bednovel.com", "betwixtedbutterfly.com", "b.faloo.com", "biquge.tw", "bnatranslations.com", "book18.org", "bookswithqianya.com", "botitranslation.com", "boxnovel.net", "boylove.cc", "bqka.cc", "brightnovels.com", "brittanypage43.com", "buntls.com", "cangji.net", "chaleuria.com", "chichipeph.com", "chickengege.org", "chosentwofanfic.com", "chrysanthemumgarden.com", "chyoa.com", "ckandawrites.online", "comics.8muses.com", "comrademao.com", "coronatranslation.com", "creativenovels.com", "crimsontranslations.com", "crushnovelpo.blog", "cyborg-tl.com", "czbooks.net", "dao-divine-tl.com", "dark-novels.ru", "dasuitl.com", "ddxs.com", "deviantart.com", "diurnis.com", "dummynovels.com", "edanglarstranslations.com", "empirenovel.com", "engnovel.com", "erofus.com", "estar.jp", "exiledrebelsscanlations.com", "fanficparadise.com", "fanfiction.com.br", "fanfictionero.com", "fanfiction.mugglenet.com", "fanficus.com", "fenrirealm.com", "ffxs8.com", "ficador.com", "ficbook.net", "fic.fan", "fictionhunt.com", "fictionmania.tv", "fictionzone.net", "ficwad.com", "fimfiction.net", "findnovel.net", "finestories.com", "flying-lines.com", "forum.questionablequesting.com", "forums.nrvnqsr.com", "forums.spacebattles.com", "forums.sufficientvelocity.com", "foxteller.com", "freelightnovel.net", "fuhuzz.pro", "gamefaqs.gamespot.com", "genesistudio.com", "global.novelpia.com", "goblinsguide.com", "goldennovel.com", "goodnovel.com", "graverobbertl.site", "gravitynovels.com", "gravitytales.com", "gunnerkrigg.com", "gutenberg.spiegel.de", "helheimscans.com", "helheimscans.org", "helioscans.com", "hellping.org", "hentai-foundry.com", "hiscension.com", "hostednovel.com", "hui3r.wordpress.com", "idleturtle-translations.com", "idnovel.my.id", "ilwxs.com", "imgur.com", "indomtl.com", "indowebnovel.id", "indratranslations.com", "inkitt.com", "innnovel.com", "inoveltranslation.com", "isotls.com", "ixdzs8.com", "ixdzs.tw", "jade-rabbit.net", "jadescrolls.com", "japtem.com", "jjwxc.net", "jonaxxstories.com", "jpmtl.com", "kakuyomu.jp", "karistudio.com", "kaystls.site", "kdtnovels.com", "knoxt.space", "kobatochan.com", "krytykal.org", "lanry.space", "lazygirltranslations.com", "leafstudio.site", "liberspark.com", "libread.com", "libri7.com", "lightnovelasia.com", "lightnovelbastion.com", "lightnovelbox.com", "lightnovelfr.com", "lightnovelread.com", "lightnovelreader.org", "lightnovels.live", "lightnovels.me", "lightnovelstranslations.com", "literotica.com", "lnmtl.com", "lnreader.org", "lorenovels.com", "m.38xs.com", "m.88xiaoshuo.net", "machine-translation.org", "madnovel.com", "magic.wizards.com", "mandarinducktales.com", "mangadex.org", "mangakakalot.com", "mangallama.com", "manganelo.com", "manganov.com", "mangaread.co", "manhwaden.com", "marx2mao.com", "marxists.org", "mayanovel.com", "m.bqg225.com", "m.chinesefantasynovels.com", "mcstories.com", "meionovel.id", "m.freelightnovel.net", "m.gzbpi.com", "midnightrambles.in", "m.ilwxs.com", "mimihui.com", "mistminthaven.com", "m.metanovel.org", "m.mywuxiaworld.com", "m.novelspread.com", "moondaisyscans.biz", "moonquill.com", "mottruyen.com.vn", "mottruyen.vn", "m.qbxsw.com", "m.qqxs.vip", "m.shuhaige.net", "m.sjks88.com", "m.tapas.io", "mtled-novels.com", "mtlnation.com", "mtlnovel.com", "mtlnovels.com", "mtlreader.com", "mtnovel.net", "m.ttshu8.com", "mvlempyr.io", "m.wuxiaworld.co", "m.xklxsw.net", "m.xpaoshuba.com", "mydramanovel.com", "my-novel.online", "mystorywave.com", "myxls.net", "mznovels.com", "nanomashin.online", "ncode.syosetu.com", "neobook.org", "nepustation.com", "nineheavens.org", "nobadnovel.com", "novel18.syosetu.com", "novel543.com", "novelall.com", "novel.babelchain.org", "novelbin.com", "novelbuddy.com", "novelbuddy.io", "novelcool.com", "novelcrush.com", "novelfever.com", "novelfire.net", "novelgreat.net", "novelhall.com", "novelhi.com", "novelhold.com", "novelight.net", "novelingua.com", "novelmania.com.br", "novelmao.com", "novelmedium.com", "novel.naver.com", "novelonomicon.com", "novelpassion.com", "novelplex.org", "novelsect.com", "novelsemperor.com", "novelsemperor.net", "novelsfull.com", "novelshub.org", "novelsknight.punchmanga.online", "novelsonline.net", "novelsonline.org", "novels.pl", "novelspread.com", "novelsquare.blog", "novelsrock.com", "noveltoon.mobi", "noveltranslatedbyc.blogspot.com", "noveluniverse.com", "novelupdates.cc", "novelupdates.com", "novelupdates.online", "novelversetranslations.com", "novicetranslations.com", "ntruyen.vn", "nyantl.wordpress.com", "octopii.co", "old.ranobelib.me", "ontimestory.eu", "ossantl.com", "panda-novel.com", "pandapama.com", "pandasnovel.com", "patreon.com", "pawread.com", "peachblossomcodex.com", "peachpitting.com", "peachpuff.in", "peachygardens.blogspot.com", "piaotia.com", "pindangscans.com", "powanjuan.cc", "puretl.com", "qbxsw.com", "qinxiaoshuo.com", "quanben5.io", "quanben.io", "queenrosenovel.blogspot.com", "questionablequesting.com", "quotev.com", "raeitranslations.com", "rainofsnow.com", "randomtranslator.com", "ranobelib.me", "ranobes.com", "ranobes.net", "ranobes.top", "readcomiconline.li", "readernovel.net", "readhive.org", "readingpia.me", "readlightnovel.cc", "readlightnovel.me", "readlightnovel.meme", "readlightnovel.org", "readlightnovel.today", "readlitenovel.com", "readnovelfull.com", "readnovelfull.org", "readnovelmtl.com", "reddit.com", "re-library.com", "requiemtls.com", "royalroad.com", "royalroadl.com", "rtd.moe", "rtenzo.net", "rubymaybetranslations.com", "ruvers.ru", "sangtacviet.com", "sangtacviet.vip", "scifistories.com", "scribblehub.com", "secondlifetranslations.com", "semprot.com", "sexstories.com", "shanghaifantasy.com", "shinningnoveltranslations.com", "shinsori.com", "shintranslations.com", "shirokuns.com", "shitouxs.com", "shmtranslations.com", "shubaowb.com", "shubaow.net", "shuhaige.net", "shw5.cc", "sites.google.com", "sjks88.com", "sj.uukanshu.com", "skydemonorder.com", "snoutandco.ca", "snowycodex.com", "soafp.com", "sonako.fandom.com", "sonako.wikia.com", "sousetsuka.com", "soverse.com", "spiritfanfiction.com", "sspai.com", "starlightstream.net", "sto.cx", "storiesonline.net", "storyseedling.com", "sweek.com", "systemtranslation.com", "taffygirl13.wordpress.com", "tapas.io", "tapread.com", "teanovel.com", "teanovel.net", "teenfic.net", "template.org", "tigertranslations.org", "timotxt.com", "titannovel.net", "tl.rulate.ru", "toctruyen.net", "tomotranslations.com", "tongrenquan.org", "tongrenshe.cc", "translationchicken.com", "travistranslations.com", "truyenfull.vision", "truyenfull.vn", "truyennhabo.com", "truyenyy.com", "trxs.cc", "ttshu8.com", "twkan.com", "uaa.com", "untamedalley.com", "velvet-reverie.org", "veratales.com", "volarenovels.com", "vynovel.com", "wanderertl130.id", "wanderinginn.com", "watashiwasugoidesu.com", "wattpad.com", "wattpad.com.vn", "webnovel.com", "webnovelonline.com", "wenku8.net", "wetriedtls.com", "wfxs.tw", "whitemoonlightnovels.com", "wnmtl.com", "wnmtl.org", "woopread.com", "wordexcerpt.com", "worldnovel.online", "wtnovels.com", "wtr-lab.com", "wuxia.blog", "wuxia.city", "wuxia.click", "wuxiaworld.co", "wuxiaworld.com", "wuxiaworld.eu", "wuxiaworld.world", "www.8muses.com", "www.dudushuge.com", "www.fanfiction.net", "www.fictionpress.com", "www.lightsnovel.com", "www.mangahere.cc", "www.rebirth.online", "wxscs.com", "xbanxia.cc", "xbiquge.so", "xiaoshubao.net", "xiaoshuogui.com", "xiaxuenovels.xyz", "xpaoshuba.com", "yeduge.com", "yushubo.net", "zenithnovels.com", "zenithtls.com", "zeonic-republic.net", "zhenhunxiaoshuo.com", "zirusmusings.com", "zirusmusings.net"];
        for (let h of generalHosts) {
            sites.push({
                name: h, hostname: h,
                searchUrl: (q) => `https://${h}/?s=${encodeURIComponent(q)}`,
                parseResults: (dom) => SiteSearchEngine.parseWordpressStyle(dom, `https://${h}`, h)
            });
        }
    }

    static parseNovelFullStyle(dom, baseUrl, sourceName) {
        let results = [];
        let items = dom.querySelectorAll(".list-truyen .row, .archive .list-truyen-item-wrap, .list .row");
        for (let item of items) {
            let a = item.querySelector(".truyen-title a, h3 a, a");
            if (a && a.href) {
                let snippet = item.querySelector(".text-primary, .author");
                results.push({
                    title: a.textContent.trim(),
                    url: SiteSearchEngine.resolveUrl(baseUrl, a.getAttribute("href")),
                    snippet: snippet ? snippet.textContent.trim() : "",
                    source: sourceName
                });
            }
        }
        return results;
    }

    static parseMadaraStyle(dom, baseUrl, sourceName) {
        let results = [];
        let items = dom.querySelectorAll(".c-tabs-item__content, .search-wrap .manga-item, .manga-item");
        for (let item of items) {
            let a = item.querySelector(".post-title a, h3 a, a");
            if (a && a.href) {
                let snippet = item.querySelector(".summary__content, .excerpt, .summary");
                results.push({
                    title: a.textContent.trim(),
                    url: SiteSearchEngine.resolveUrl(baseUrl, a.getAttribute("href")),
                    snippet: snippet ? snippet.textContent.trim() : "",
                    source: sourceName
                });
            }
        }
        return results;
    }

    static parseWordpressStyle(dom, baseUrl, sourceName) {
        let results = [];
        let items = dom.querySelectorAll("article, .post-item, .latest-post, .entry");
        for (let item of items) {
            let a = item.querySelector(".entry-title a, .post-title a, h2 a, a");
            if (a && a.href) {
                let snippet = item.querySelector(".entry-summary, .post-excerpt, p");
                results.push({
                    title: a.textContent.trim(),
                    url: SiteSearchEngine.resolveUrl(baseUrl, a.getAttribute("href")),
                    snippet: snippet ? snippet.textContent.trim().substring(0, 150) : "",
                    source: sourceName
                });
            }
        }
        return results;
    }

    static parseReadwnStyle(dom, baseUrl, sourceName) {
        let results = [];
        let items = dom.querySelectorAll(".novels-list li, .chapter-list li, .list-chapter li, li");
        for (let item of items) {
            let a = item.querySelector("a");
            if (a && a.href && (a.href.includes("/novel/") || a.href.includes("/book/"))) {
                let title = item.querySelector(".novel-title, h4, .title") || a;
                results.push({
                    title: title.textContent.trim(),
                    url: SiteSearchEngine.resolveUrl(baseUrl, a.getAttribute("href")),
                    snippet: "",
                    source: sourceName
                });
            }
        }
        return results;
    }

    static parseNoblemtlStyle(dom, baseUrl, sourceName) {
        // Similar to Madara/WP but tailored
        let results = [];
        let items = dom.querySelectorAll(".bs, .listupd .bs, article");
        for (let item of items) {
            let a = item.querySelector("a");
            if (a && a.href) {
                let title = item.querySelector(".tt, h2, h3, .title") || a;
                results.push({
                    title: title.textContent.trim(),
                    url: SiteSearchEngine.resolveUrl(baseUrl, a.getAttribute("href")),
                    snippet: "",
                    source: sourceName
                });
            }
        }
        return results;
    }

    static parseLightNovelWorldStyle(dom, baseUrl, sourceName) {
        let results = [];
        let items = dom.querySelectorAll(".novel-item, .search-item, .novel-entry");
        for (let item of items) {
            let a = item.querySelector("a[href*='/novel/'], a");
            if (a && a.href) {
                let titleEl = item.querySelector("h4, h3, .novel-title, .title") || a;
                results.push({
                    title: titleEl.textContent.trim(),
                    url: SiteSearchEngine.resolveUrl(baseUrl, a.getAttribute("href")),
                    snippet: "",
                    source: sourceName
                });
            }
        }
        return results;
    }

    static resolveUrl(base, href) {
        if (!href) return base;
        if (href.startsWith("http://") || href.startsWith("https://")) return href;
        try {
            return new URL(href, base).href;
        } catch (e) {
            return base + (href.startsWith("/") ? "" : "/") + href;
        }
    }

    // ─── Network Layer ───────────────────────────────────────────────────

    /**
     * Parse HTML into a safe DOM — removes resource-loading elements
     * (script, link, style, iframe, img) and sets a <base> tag for relative
     * URL resolution. Faster than running giant regex on raw HTML strings.
     */
    static parseSafeHtml(html, baseUrl) {
        // Strip speculative preload tags to prevent relative asset fetches through proxies
        html = html.replace(/<link\s+[^>]*?rel=["']preload["'][^>]*?>/gi, "");
        let dom = new DOMParser().parseFromString(html, "text/html");
        for (let el of dom.querySelectorAll("script, link, style, iframe, img")) {
            el.remove();
        }
        let base = dom.createElement("base");
        base.href = baseUrl;
        dom.head.appendChild(base);
        return dom;
    }

    /**
     * Race all proxies simultaneously — return HTML from the first one that responds.
     * Falls back gracefully if all fail (returns null).
     */
    static async fetchViaProxy(url, fetchOptions = {}) {
        let proxies = (typeof HttpClient !== "undefined" && HttpClient.CORS_PROXIES)
            ? HttpClient.CORS_PROXIES
            : [];

        if (proxies.length === 0) return null;

        // Build one racing promise per proxy
        let proxyPromises = proxies.map(proxy => {
            let controller = new AbortController();
            let timeoutId = setTimeout(() => controller.abort(), SiteSearchEngine.PROXY_TIMEOUT_MS);
            let fetchUrl = proxy.url + encodeURIComponent(url);

            let finalOptions = Object.assign({ credentials: "omit", signal: controller.signal }, fetchOptions);

            return fetch(fetchUrl, finalOptions)
                .then(async (response) => {
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`${response.status}`);
                    return await response.text();
                })
                .catch(err => {
                    clearTimeout(timeoutId);
                    throw err; // rethrow so Promise.any skips this one
                });
        });

        try {
            // Promise.any resolves with the FIRST successful promise
            return await Promise.any(proxyPromises);
        } catch (e) {
            // AggregateError — all proxies failed
            return null;
        }
    }

    /**
     * Fetch, sanitize, parse a single site's search results.
     */
    static async fetchSiteResults(site, query) {
        try {
            let url = site.searchUrl(query);
            let fetchOptions = site.getFetchOptions ? await site.getFetchOptions(query) : {};
            let html = await SiteSearchEngine.fetchViaProxy(url, fetchOptions);

            if (!html) {
                return [];
            }

            // Parse safely: strips resource-loading elements and sets base URL in one pass
            let dom = SiteSearchEngine.parseSafeHtml(html, url);

            let results = site.parseResults(dom);

            // AI Fallback if no results and AI query is configured (or as general fallback)
            if (results.length === 0 && typeof AiClient !== "undefined") {
                results = await AiClient.fetchAiResults(html, query, url);
            }

            // Cap per-site results
            if (results.length > SiteSearchEngine.MAX_RESULTS_PER_SITE) {
                results = results.slice(0, SiteSearchEngine.MAX_RESULTS_PER_SITE);
            }
            return results;
        } catch (error) {
            console.warn(`[SiteSearch] Error on ${site.name}:`, error.message);
            return [];
        }
    }

    // ─── Search Orchestrator ─────────────────────────────────────────────

    /**
     * Search sites incrementally until targetResultCount is reached or all sites are exhausted.
     *
     * @param {string} query
     * @param {number} startIndex - Index in the sites array to start from.
     * @param {number} targetResultCount - Number of NEW results to find before stopping.
     * @param {boolean} includeSecondary
     * @param {function} onProgress - (siteName, status) => void
     * @param {function} onResults - (newResults) => void
     * @returns {Promise<{results: Array, nextIndex: number}>}
     */
    static async search(query, startIndex = 0, targetResultCount = 10, includeSecondary = false, onProgress, onResults) {
        let sites = [...SiteSearchEngine.PRIMARY_SITES];
        if (includeSecondary) {
            sites = sites.concat(SiteSearchEngine.SECONDARY_SITES);
        }

        if (onProgress && startIndex === 0) {
            onProgress("Starting", `Searching ${sites.length} sites...`);
        }

        let results = [];
        let seenUrls = new Set();
        let currentIndex = startIndex;

        // Search one by one (or in very small batches) until we hit the target count
        // Using small batches (3) to balance speed vs. "don't over-load" requirement
        const BATCH_SIZE = 6; // increased from 3 — proxy racing handles per-site timeouts

        while (currentIndex < sites.length) {
            let batch = sites.slice(currentIndex, currentIndex + BATCH_SIZE);
            let promises = batch.map(async (site) => {
                if (onProgress) onProgress(site.name, "searching");
                let siteResults = await SiteSearchEngine.fetchSiteResults(site, query);
                if (onProgress) onProgress(site.name, `found ${siteResults.length}`);
                return siteResults;
            });

            let batchResults = await Promise.all(promises);
            let newResultsFound = [];
            for (let siteResults of batchResults) {
                for (let r of siteResults) {
                    let key = SiteSearchEngine.normalizeUrl(r.url);
                    if (!seenUrls.has(key)) {
                        seenUrls.add(key);
                        results.push(r);
                        newResultsFound.push(r);
                    }
                }
            }

            if (newResultsFound.length > 0 && onResults) {
                onResults(newResultsFound);
            }

            currentIndex += batch.length;

            let sitesProcessedSoFar = currentIndex - startIndex;
            // Stop if we have enough results AND we've searched at least 10 sites.
            if (results.length >= targetResultCount && sitesProcessedSoFar >= 10) break;
            // If we have at least one result AND we've searched at least 10 sites, we can stop.
            if (results.length > 0 && sitesProcessedSoFar >= 10) break;
            // Otherwise, keep searching (if results.length === 0, we continue until we find something or run out of sites).
        }

        return {
            results: results.slice(0, targetResultCount),
            nextIndex: currentIndex < sites.length ? currentIndex : -1
        };
    }

    // ─── Utilities ───────────────────────────────────────────────────────

    static normalizeUrl(url) {
        try {
            let u = new URL(url);
            return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "");
        } catch (e) {
            return url;
        }
    }

    static getAllSiteNames() {
        let primary = SiteSearchEngine.PRIMARY_SITES.map(s => ({ name: s.name, primary: true }));
        let secondary = SiteSearchEngine.SECONDARY_SITES.map(s => ({ name: s.name, primary: false }));
        return [...primary, ...secondary];
    }
}
