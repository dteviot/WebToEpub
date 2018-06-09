/*
    User settings for how extension should behave
*/

"use strict";

/** Holds a single preference value for user  */
class UserPreference {
    constructor(storageName, uiElementName, defaultValue) {
        this.storageName = storageName;
        this.uiElementName = uiElementName;
        this.value = defaultValue;
    }

    getUiElement() {
        return document.getElementById(this.uiElementName);
    }    

    writeToLocalStorage() {
        window.localStorage.setItem(this.storageName, this.value);
    }
}

class BoolUserPreference extends UserPreference {
    constructor(storageName, uiElementName, defaultValue) {
        super(storageName, uiElementName, defaultValue);
    }

    readFromLocalStorage() {
        let test = window.localStorage.getItem(this.storageName);
        if (test !== null) {
            this.value = (test === "true");
        }
    }

    readFromUi() {
        this.value = this.getUiElement().checked;
    }

    writeToUi() {
        this.getUiElement().checked = this.value;
    }

    hookupUi(readFromUi) {
        this.getUiElement().onclick = readFromUi;
    }
}

class StringUserPreference extends UserPreference {
    constructor(storageName, uiElementName, defaultValue) {
        super(storageName, uiElementName, defaultValue);
    }

    readFromLocalStorage() {
        let test = window.localStorage.getItem(this.storageName);
        if (test !== null) {
            this.value = test;
        }
    }

    readFromUi() {
        this.value = this.getUiElement().value;
    }

    writeToUi() {
        this.getUiElement().value = this.value;
    }

    hookupUi(readFromUi) {
        let uiElement = this.getUiElement();
        if (uiElement.tagName === "SELECT") {
            uiElement.onchange = readFromUi;
        } else {
            uiElement.addEventListener("blur", readFromUi, true);
        }
    }
}

/** The collection of all preferences for user  */
class UserPreferences {
    constructor() {
        this.preferences = [];
        this.addPreference("removeDuplicateImages", "removeDuplicateImages", false);
        this.addPreference("includeImageSourceUrl", "includeImageSourceUrlCheckboxInput", true);
        this.addPreference("higestResolutionImages", "higestResolutionImagesCheckboxInput", true);
        this.addPreference("unSuperScriptAlternateTranslations", "unSuperScriptCheckboxInput", false);
        this.addPreference("styleSheet", "stylesheetInput", EpubMetaInfo.getDefaultStyleSheet());
        this.addPreference("useSvgForImages", "useSvgForImagesInput", true);
        this.addPreference("advancedOptionsVisibleByDefault", "advancedOptionsVisibleByDefaultCheckbox", false);
        this.addPreference("writeErrorHistoryToFile", "writeErrorHistoryToFileCheckbox", false);
        this.addPreference("createEpub3", "createEpub3Checkbox", false);
        this.addPreference("chaptersPageInChapterList", "chaptersPageInChapterListCheckbox", false);
        this.addPreference("autoSelectBTSeriesPage", "autoParserSelectIncludesBTSeriesPageCheckbox", false);
        this.addPreference("removeAuthorNotes", "removeAuthorNotesCheckbox", false);
        this.addPreference("removeOriginal", "removeOriginalCheckbox", true);
        this.addPreference("maxPagesToFetchSimultaneously", "maxPagesToFetchSimultaneouslyTag", "1");
        this.observers = [];
    };

    /** @private */
    addPreference(storageName, uiElementName, defaultValue) {
        if (this[storageName] !== undefined) {
            throw new Error("Preference " + storageName + " already created.");
        }

        let preference = null;
        if (typeof(defaultValue) === "boolean") {
            preference = new BoolUserPreference(storageName, uiElementName, defaultValue)
        } else if (typeof(defaultValue) === "string") {
            preference = new StringUserPreference(storageName, uiElementName, defaultValue)
        } else {
            throw new Error("Unknown preference type");
        }
        this.preferences.push(preference);
        this[storageName] = preference;
    }

    static readFromLocalStorage() {
        let newPreferences = new UserPreferences();
        for(let p of newPreferences.preferences) {
            p.readFromLocalStorage();
        }
        return newPreferences;
    }

    writeToLocalStorage() {
        for(let p of this.preferences) {
            p.writeToLocalStorage();
        }
    }

    addObserver(observer) {
        this.observers.push(observer);
        this.notifyObserversOfChange();
    }

    readFromUi() {
        for(let p of this.preferences) {
            p.readFromUi();
        }

        this.writeToLocalStorage();
        this.notifyObserversOfChange();
    }

    notifyObserversOfChange() {
        let that = this;
        for(let observer of that.observers) {
            observer.onUserPreferencesUpdate(that);
        };
    }

    writeToUi() {
        for(let p of this.preferences) {
            p.writeToUi();
        }
    }

    hookupUi() {
        let readFromUi = this.readFromUi.bind(this);
        for(let p of this.preferences) {
            p.hookupUi(readFromUi);
        }

        this.notifyObserversOfChange();
    }
}
