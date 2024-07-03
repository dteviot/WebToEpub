
"use strict";

/** Track EPUB chapters that have been previously downloaded 
 * Note, as local storage is limited to 5 Megabytes, 
 * and some stories can have  * 4k or more chapters, 
 * Can't hold all URLs.  So just record last chapter for each story.
*/
class ReadingList {
    constructor () {
        this.epubs = new Map();
    }

    addEpub(url) {
        let oldUrl = this.epubs.get(url);
        if (oldUrl == null) {
            this.epubs.set(url, "");
        }
    }

    deleteEpub(url) {
        this.epubs.delete(url);
    }

    tryDeleteEpubAndSave(url) {
        if (this.getEpub(url)){
            this.deleteEpub(url);
            this.writeToLocalStorage();
            return true;
        }
        return false;
    }

    getEpub(url) {
        return this.epubs.get(url);
    }

    deselectOldChapters(url, chapterList) {
        let oldUrl = this.epubs.get(url);
        if (oldUrl != null) {
            for(let i = 0; i < chapterList.length; ++i) {
                if (oldUrl === chapterList[i].sourceUrl) {
                    for(let j = 0; j <= i; ++j) {
                        chapterList[j].isIncludeable = false;
                    }
                    break;
                }
            }
        }
    }

    update(url, chapterList) {
        let oldUrl = this.epubs.get(url);
        if (oldUrl != null) {
            for(let c of chapterList) {
                if (c.isIncludeable) {
                    this.epubs.set(url, c.sourceUrl);
                }
            }
            if (oldUrl !== this.epubs.get(url)) {
                this.writeToLocalStorage();
            }
        }
    }

    static replacer(key, value) {
        switch(key) {
        case "epubs":
            return [...value].map(v => ({ toc: v[0], lastUrl: v[1] }));
        default:
            return value;
        }
    }

    static reviver(key, value) {
        switch(key) {
        case "epubs":
            return new Map([...value].map(ReadingList.reviveEpub));
        case "history": {
            return value[value.length - 1];
        }
        default:
            return value;
        }
    }

    static reviveEpub(packedEpub) {
        return (packedEpub.history == null)
            ? [packedEpub.toc, packedEpub.lastUrl]
            : [packedEpub.toc, packedEpub.history];
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

    showReadingList(table) {
        util.removeChildElementsMatchingCss(table, "tr");
        for(let e of this.epubs.keys()) {
            let row = document.createElement("tr");
            table.appendChild(row);
            let link = document.createElement("a");
            link.href = e;
            link.textContent = e;
            this.appendColumnToRow(row, link);
            let button = document.createElement("button");
            button.textContent = chrome.i18n.getMessage("__MSG_button_Remove__");
            this.appendColumnToRow(row, button);
        }
    }

    appendColumnToRow(row, element) {
        let col = document.createElement("td");
        col.appendChild(element);
        row.appendChild(col);
    }

    onClickRemove(evt) {
        if (evt.target.tagName === "BUTTON") {
            let row = evt.target.parentElement.parentElement;
            this.deleteEpub(row.querySelector("a").href);
            this.showReadingList(evt.currentTarget);
            this.writeToLocalStorage();
        }
    }
}
ReadingList.storageName = "ReadingList";
