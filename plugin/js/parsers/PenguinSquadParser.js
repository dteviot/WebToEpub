parserFactory.register("penguin-squad.com", () => new PenguinSquadParser());

class PenguinSquadParser extends Parser {
    constructor() {
        super();

        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom) {
        const chapters = findEmbeddedChapters(dom);
        return createChapterUrls(chapters, dom.baseURI);
    }

    findContent(dom) {
        return dom.querySelector(".reader-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".text-xl");
    }

    extractDescription(dom) {
        return dom.querySelector("p.text-muted-foreground:nth-child(4)");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".font-bold");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".space-y-5");
    }
}

function findEmbeddedChapters(dom) {
    const candidateScriptTexts = [...dom.scripts]
        .map((script) => script.textContent)
        .filter((scriptText) => scriptText.includes("chapters"))
        .filter((scriptText) => scriptText.includes("slug"));

    for (const scriptText of candidateScriptTexts) {
        const candidateDataTexts = [scriptText, ...decodeQuotedStrings(scriptText)];
        for (const dataText of candidateDataTexts) {
            const chapters = extractChapterList(dataText);
            if (chapters) {
                return chapters;
            }
        }
    }
    throw new Error("Could not find Penguin Squad's chapter list.");
}

function decodeQuotedStrings(sourceText) {
    const decodedStrings = [];
    let stringStart = sourceText.indexOf("\"");
    while (stringStart !== -1) {
        const parsedString = readQuotedJsonValue(sourceText, stringStart);
        if (!parsedString) {
            break;
        }
        if (parsedString.value !== null) {
            decodedStrings.push(parsedString.value);
        }
        stringStart = sourceText.indexOf("\"", parsedString.endIndex);
    }
    return decodedStrings;
}

function readQuotedJsonValue(sourceText, startIndex) {
    for (let i = startIndex + 1; i < sourceText.length; i++) {
        if (sourceText[i] === "\\") {
            i++;
        } else if (sourceText[i] === "\"") {
            try {
                return {
                    value: JSON.parse(sourceText.slice(startIndex, i + 1)),
                    endIndex: i + 1,
                };
            } catch {
                return { value: null, endIndex: i + 1 };
            }
        }
    }

    return null;
}

function extractChapterList(dataText) {
    const arrayStart = findChapterArrayStart(dataText);
    if (arrayStart === -1) {
        return null;
    }

    const arrayEnd = findJsonArrayEnd(dataText, arrayStart);
    return JSON.parse(dataText.slice(arrayStart, arrayEnd));
}

function findChapterArrayStart(dataText) {
    const chapterProperty = "\"chapters\"";
    let chaptersPosition = dataText.indexOf(chapterProperty);
    while (chaptersPosition !== -1) {
        let arrayStart = chaptersPosition + chapterProperty.length;
        while (isJsonWhitespace(dataText[arrayStart])) {
            arrayStart++;
        }
        if (dataText[arrayStart] === ":") {
            arrayStart++;
            while (isJsonWhitespace(dataText[arrayStart])) {
                arrayStart++;
            }
            if (dataText[arrayStart] === "[") {
                return arrayStart;
            }
        }
        chaptersPosition = dataText.indexOf(
            chapterProperty,
            chaptersPosition + chapterProperty.length,
        );
    }
    return -1;
}

function findJsonArrayEnd(dataText, arrayStart) {
    let arrayDepth = 0;
    let insideString = false;
    let escaped = false;

    for (let i = arrayStart; i < dataText.length; i++) {
        const character = dataText[i];
        if (escaped) {
            escaped = false;
        } else if (insideString && character === "\\") {
            escaped = true;
        } else if (character === "\"") {
            insideString = !insideString;
        } else if (!insideString && character === "[") {
            arrayDepth++;
        } else if (!insideString && character === "]") {
            arrayDepth--;
            if (arrayDepth === 0) {
                return i + 1;
            }
        }
    }

    throw new Error("Could not find the end of Penguin Squad's chapter list.");
}

function isJsonWhitespace(character) {
    return (
        character === " " ||
        character === "\n" ||
        character === "\r" ||
        character === "\t"
    );
}

function createChapterUrls(chapters, pageUrl) {
    const novelUrl = new URL(pageUrl);
    while (novelUrl.pathname.endsWith("/")) {
        novelUrl.pathname = novelUrl.pathname.slice(0, -1);
    }
    novelUrl.pathname += "/";
    novelUrl.search = "";
    novelUrl.hash = "";

    return chapters.map((chapter) => ({
        sourceUrl: new URL(chapter.slug, novelUrl).href,
        title: chapter.title,
        isIncludeable: !chapter.premium,
    }));
}
