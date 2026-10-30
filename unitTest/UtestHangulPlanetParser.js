module("HangulPlanetParser");

function hangulPlanetDom(name) {
    return util.syncLoadSampleDoc(
        `../testdata/HangulPlanet-${name}.html`,
        "https://hangulplanet.com/novel/hiding-tunnels-in-xianxia" +
            (name === "chapter" ? "/chapter-89" : ""),
    );
}

async function withHangulPlanetFetch(fetch, runTest) {
    const originalFetch = HttpClient.wrapFetch;
    HttpClient.wrapFetch = fetch;
    try {
        await runTest();
    } finally {
        HttpClient.wrapFetch = originalFetch;
    }
}

QUnit.test(
    "discovers all public chapters across pages in chronological order",
    async (assert) => {
        const parser = new HangulPlanetParser();
        const requests = [];
        parser.rateLimitDelay = async () => {};
        const fetchPage = async (url) => {
            requests.push(url);
            const page = hangulPlanetDom(
                requests.length === 1 ? "first" : "second",
            );
            const premiumLink = page.createElement("a");
            premiumLink.href = `${parser.novelUrl(page)}/chapter-90`;
            premiumLink.textContent = "Premium chapter";
            page.body.appendChild(premiumLink);
            if (requests.length === 2) {
                page.querySelector("#chapters").appendChild(
                    hangulPlanetDom("first").querySelector(
                        '#chapters a[href*="chapter-1"]',
                    ),
                );
            }
            return { responseXML: page };
        };
        await withHangulPlanetFetch(fetchPage, async () => {
            const dom = hangulPlanetDom("chapter");
            const chapters = await parser.getChapterUrls(dom);
            const expected = Array.from({ length: 89 }, (_, index) => ({
                sourceUrl: `${parser.novelUrl(dom)}/chapter-${index + 1}`,
                title: `Chapter ${index + 1}`,
            }));
            assert.deepEqual(
                chapters,
                expected,
                "all public chapters appear once in source order",
            );
            assert.equal(requests.length, 2);
            assert.ok(requests[0].endsWith("?order=asc"));
            assert.equal(new URL(requests[1]).searchParams.get("cpage"), "2");
            assert.equal(new URL(requests[1]).searchParams.get("order"), "asc");
        });
    },
);

QUnit.test(
    "metadata is loaded from the novel when starting at a chapter",
    async (assert) => {
        const parser = new HangulPlanetParser();
        const fetchNovel = async (url) => {
            assert.equal(
                url,
                "https://hangulplanet.com/novel/hiding-tunnels-in-xianxia",
            );
            return { responseXML: hangulPlanetDom("first") };
        };
        await withHangulPlanetFetch(fetchNovel, async () => {
            const chapter = hangulPlanetDom("chapter");
            await parser.loadEpubMetaInfo(chapter);
            assert.equal(
                parser.extractTitleImpl(chapter),
                "Hiding Tunnels in Xianxia",
            );
            assert.ok(
                parser.findCoverImageUrl(chapter).endsWith("cover-eng.jpg"),
            );
            assert.ok(parser.extractDescription(chapter).includes("Lee Hyun"));
        });
    },
);

QUnit.test(
    "keeps notes and images while excluding promotions and comments",
    (assert) => {
        const parser = new HangulPlanetParser();
        const dom = hangulPlanetDom("chapter");
        const content = parser.findContent(dom);
        const promotion = content.querySelector("p:last-child");
        promotion.firstChild.textContent = "  JOIN OUR DISCORD SERVER: ";
        parser.removeUnwantedElementsFromContentElement(content);
        assert.ok(content.textContent.includes("Example story text."));
        assert.ok(content.textContent.includes("TL Note:"));
        assert.ok(content.textContent.includes("Translator: T_Fan"));
        assert.equal(content.querySelectorAll("img").length, 1);
        assert.notOk(content.textContent.toLowerCase().includes("discord"));
        assert.notOk(content.textContent.includes("Comment text"));
        assert.notOk(content.textContent.includes("Navigation"));
        assert.equal(parser.findContent(hangulPlanetDom("first")), null);
    },
);

QUnit.test("rejects a missing public chapter list", async (assert) => {
    const parser = new HangulPlanetParser();
    const fetchChapter = async () => ({
        responseXML: hangulPlanetDom("chapter"),
    });
    await withHangulPlanetFetch(fetchChapter, async () => {
        try {
            await parser.getChapterUrls(hangulPlanetDom("first"));
            assert.ok(false, "missing chapter list must fail");
        } catch (error) {
            assert.ok(error.message.includes("public chapter list"));
        }
    });
});

QUnit.test("finds the novel URL and rejects other routes", (assert) => {
    const parser = new HangulPlanetParser();
    const dom = hangulPlanetDom("chapter");
    const base = dom.querySelector("base");
    const origin = "https://hangulplanet.com";
    for (const path of [
        "/novel/example",
        "/novel/example/",
        "/novel/example/chapter-1",
    ]) {
        base.href = origin + path;
        assert.equal(parser.novelUrl(dom), `${origin}/novel/example`);
    }
    for (const path of ["/novel/", "/other/example", "//novel/example"]) {
        base.href = origin + path;
        assert.throws(() => parser.novelUrl(dom), /novel or chapter page/);
    }
});
