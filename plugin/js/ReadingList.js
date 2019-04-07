
"use strict";

/** Track EPUB chapters that have been previously downloaded */
class ReadingList {
    constructor () {
        this.epubs = new Map();
    }

    addEpub(url) {
        let oldUrls = this.epubs.get(url);
        if (oldUrls == null) {
            this.epubs.set(url, new Set());
        }
    }

    deleteEpub(url) {
        this.epubs.delete(url);
    }

    getEpub(url) {
        return this.epubs.get(url);
    }

    deselectUnwantedChapters(url, chapterList) {
        let oldUrls = this.epubs.get(url);
        if (oldUrls != null) {
            for(let c of chapterList) {
                if (oldUrls.has(c.sourceUrl)) {
                    c.isIncludeable = false;
                }
            }
        }
    }

    update(url, chapterList) {
        let oldUrls = this.epubs.get(url);
        if (oldUrls != null) {
            for(let c of chapterList) {
                oldUrls.add(c.sourceUrl);
            }
            this.writeToLocalStorage();
        }
    }

    static replacer(key, value) {
        switch(key) {
        case "epubs":
            return [...value].map(v => ({ toc: v[0], history: v[1] }));
        case "history":
            return [...value];
        default:
            return value;
        }
    }

    static reviver(key, value) {
        switch(key) {
        case "epubs":
            return new Map([...value].map(v => [v.toc, v.history]));
        case "history": {
            return new Set([...value]);
        }
        default:
            return value;
        }
    }

    toJson() {
        return JSON.stringify(this, ReadingList.replacer);
    }

    static fromJson(json) {
        let rl = new ReadingList();
        rl.epubs = JSON.parse(json, ReadingList.reviver).epubs;
        return rl;
    }

    readFromLocalStorage() {
        let config = window.localStorage.getItem(ReadingList.storageName);
        if (config != null) {
            this.epubs = ReadingList.fromJson(config).epubs;
        }
    }

    writeToLocalStorage() {
        window.localStorage.setItem(ReadingList.storageName, this.toJson());
    }

    onReadingListCheckboxClicked(checked, url) {
        if (checked) {
            this.addEpub(url);
        } else {
            this.deleteEpub(url);
        }
        this.writeToLocalStorage();
    }

    showReadingList(div) {
        util.removeChildElementsMatchingCss(div, "a, br");
        for(let e of this.epubs.keys()) {
            let link = document.createElement("a");
            link.href = e;
            link.textContent = e;
            div.appendChild(link);
            div.appendChild(document.createElement("br"))
        }
    }
}
ReadingList.storageName = "ReadingList";
