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
class UserPreferences { // eslint-disable-line no-unused-vars
    constructor() {
        this.preferences = [];
        this.observers = [];
        this.readingList = new ReadingList();

        // Initialize all preferences explicitly for IDE support
        // (autocomplete, type inference, no unresolved variable warnings)
        this.removeDuplicateImages = this.addPreference("removeDuplicateImages", "removeDuplicateImages", false);
        this.includeImageSourceUrl = this.addPreference("includeImageSourceUrl", "includeImageSourceUrlCheckboxInput", true);
        this.highestResolutionImages = this.addPreference("highestResolutionImages", "highestResolutionImagesCheckboxInput", true);
        this.unSuperScriptAlternateTranslations = this.addPreference("unSuperScriptAlternateTranslations", "unSuperScriptCheckboxInput", false);
        this.styleSheet = this.addPreference("styleSheet", "stylesheetInput", EpubMetaInfo.getDefaultStyleSheet());
        this.CustomFilename = this.addPreference("CustomFilename", "CustomFilenameInput", "%Filename%");
        this.useSvgForImages = this.addPreference("useSvgForImages", "useSvgForImagesInput", true);
        this.removeNextAndPreviousChapterHyperlinks = this.addPreference("removeNextAndPreviousChapterHyperlinks", "removeNextAndPreviousChapterHyperlinksInput", true);
        this.advancedOptionsVisibleByDefault = this.addPreference("advancedOptionsVisibleByDefault", "advancedOptionsVisibleByDefaultCheckbox", false);
        this.noDownloadPopup = this.addPreference("noDownloadPopup", "noDownloadPopupCheckbox", false);
        this.writeErrorHistoryToFile = this.addPreference("writeErrorHistoryToFile", "writeErrorHistoryToFileCheckbox", false);
        this.createEpub3 = this.addPreference("createEpub3", "createEpub3Checkbox", false);
        this.chaptersPageInChapterList = this.addPreference("chaptersPageInChapterList", "chaptersPageInChapterListCheckbox", false);
        this.autoSelectBTSeriesPage = this.addPreference("autoSelectBTSeriesPage", "autoParserSelectIncludesBTSeriesPageCheckbox", false);
        this.removeAuthorNotes = this.addPreference("removeAuthorNotes", "removeAuthorNotesCheckbox", false);
        this.removeChapterNumber = this.addPreference("removeChapterNumber", "removeChapterNumberCheckbox", false);
        this.removeOriginal = this.addPreference("removeOriginal", "removeOriginalCheckbox", true);
        this.selectTranslationAi = this.addPreference("selectTranslationAi", "selectTranslationAiCheckbox", false);
        this.removeTranslated = this.addPreference("removeTranslated", "removeTranslatedCheckbox", false);
        this.skipChaptersThatFailFetch = this.addPreference("skipChaptersThatFailFetch", "skipChaptersThatFailFetchCheckbox", false);
        this.maxChaptersPerEpub = this.addPreference("maxChaptersPerEpub", "maxChaptersPerEpubTag", "10,000");
        this.manualDelayPerChapter = this.addPreference("manualDelayPerChapter", "manualDelayPerChapterTag", "0");
        this.overrideMinimumDelay = this.addPreference("overrideMinimumDelay", "overrideMinimumDelayCheckbox", false);
        this.skipImages = this.addPreference("skipImages", "skipImagesCheckbox", false);
        this.compressImages = this.addPreference("compressImages", "compressImagesCheckbox", false);
        this.compressImagesJpgCover = this.addPreference("compressImagesJpgCover", "compressImagesJpgCoverCheckbox", false);
        this.compressImagesType = this.addPreference("compressImagesType", "compressImagesType", "jpg");
        this.compressImagesMaxResolution = this.addPreference("compressImagesMaxResolution", "compressImagesMaxResolutionTag", "1080");
        this.overwriteExistingEpub = this.addPreference("overwriteExistingEpub", "overwriteEpubWhenDuplicateFilenameCheckbox", false);
        this.themeColor = this.addPreference("themeColor", "themeColorTag", "");
        this.useFullTitle = this.addPreference("useFullTitle", "useFullTitleAsFileNameCheckbox", false);
        this.addInformationPage = this.addPreference("addInformationPage", "addInformationPageToEpubCheckbox", true);
        this.lesstags = this.addPreference("lesstags", "lesstagsCheckbox", true);
        this.autosearchmetadata = this.addPreference("autosearchmetadata", "autosearchmetadataCheckbox", false);
        this.noAdditionalMetadata = this.addPreference("noAdditionalMetadata", "noAdditionalMetadataCheckbox", true);
        this.ShowMoreMetadataOptions = this.addPreference("ShowMoreMetadataOptions", "ShowMoreMetadataOptionsCheckbox", false);
        this.LibShowAdvancedOptions = this.addPreference("LibShowAdvancedOptions", "LibShowAdvancedOptionsCheckbox", false);
        this.LibShowCompactView = this.addPreference("LibShowCompactView", "LibShowCompactViewCheckbox", false);
        this.LibDownloadEpubAfterUpdate = this.addPreference("LibDownloadEpubAfterUpdate", "LibDownloadEpubAfterUpdateCheckbox", false);
        this.disableShiftClickAlert = this.addPreference("disableShiftClickAlert", "disableShiftClickAlertCheckbox", false);
        this.disableImageResError = this.addPreference("disableImageResError", "disableImageResErrorCheckbox", false);
        this.disableWebpImageFormatError = this.addPreference("disableWebpImageFormatError", "disableWebpImageFormatErrorCheckbox", false);

        document.getElementById("themeColorTag").addEventListener("change", UserPreferences.SetTheme);
    }

    /** @private */
    addPreference(storageName, uiElementName, defaultValue) {
        let preference = null;
        if (typeof(defaultValue) === "boolean") {
            preference = new BoolUserPreference(storageName, uiElementName, defaultValue);
        } else if (typeof(defaultValue) === "string") {
            preference = new StringUserPreference(storageName, uiElementName, defaultValue);
        } else {
            throw new Error("Unknown preference type");
        }
        this.preferences.push(preference);
        return preference;
    }

    static readFromLocalStorage() {
        let newPreferences = new UserPreferences();
        for (let p of newPreferences.preferences) {
            p.readFromLocalStorage();
        }
        newPreferences.readingList.readFromLocalStorage();
        return newPreferences;
    }

    writeToLocalStorage() {
        for (let p of this.preferences) {
            p.writeToLocalStorage();
        }
        this.readingList.writeToLocalStorage();
    }

    addObserver(observer) {
        this.observers.push(observer);
        this.notifyObserversOfChange();
    }

    readFromUi() {
        for (let p of this.preferences) {
            p.readFromUi();
        }

        this.writeToLocalStorage();
        this.notifyObserversOfChange();
    }

    notifyObserversOfChange() {
        for (let observer of this.observers) {
            observer.onUserPreferencesUpdate(this);
        }
    }

    writeToUi() {
        for (let p of this.preferences) {
            p.writeToUi();
        }
        UserPreferences.SetTheme();
    }

    hookupUi() {
        let readFromUi = this.readFromUi.bind(this);
        for (let p of this.preferences) {
            p.hookupUi(readFromUi);
        }

        this.notifyObserversOfChange();
    }

    writeToFile() {
        let obj = {};
        let serialized = window.localStorage.getItem(DefaultParserSiteSettings.storageName);
        if (serialized != null) {
            obj[DefaultParserSiteSettings.storageName] = JSON.parse(serialized);
        }
        obj[ReadingList.storageName] = JSON.parse(this.readingList.toJson());
        for (let p of this.preferences) {
            obj[p.storageName] = p.value; 
        }
        serialized = JSON.stringify(obj);
        let blob = new Blob([serialized], {type : "text"});
        return Download.save(blob, "Options.json")
            .catch (err => ErrorLog.showErrorMessage(err));
    }

    readFromFile(event, populateControls) {
        if (event.target.files.length == 0) {
            return;
        }
        
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;

            // reset so triggers if user selects same file again  
            event.target.value = null;
            try {
                let json = JSON.parse(content);
                this.loadOptionsFromJson(json);
                this.loadDefaultParserFromJson(json);
                this.loadReadingListFromJson(json);
                populateControls();
            } catch (err) {
                ErrorLog.showErrorMessage(err);
            }
        };
        reader.readAsText(file);
    }

    loadOptionsFromJson(json) {
        for (let p of this.preferences) {
            let val = json[p.storageName];
            if (val !== undefined && (p.value !== val)) {
                p.value = val;
                p.writeToLocalStorage();
            }
        }
    }

    loadDefaultParserFromJson(json) {
        let val = json[DefaultParserSiteSettings.storageName];
        if (val === undefined) {
            window.localStorage.removeItem(DefaultParserSiteSettings.storageName);
        } else {
            let serialized = JSON.stringify(val);
            window.localStorage.setItem(DefaultParserSiteSettings.storageName, serialized);
        }
    }

    loadReadingListFromJson(json) {
        let val = json[ReadingList.storageName];
        if (val !== undefined) {
            let serialized = JSON.stringify(val);
            this.readingList = ReadingList.fromJson(serialized);
            window.localStorage.setItem(ReadingList.storageName, serialized);
        }
    }

    setReadingListCheckbox(url) {
        let inlist = this.readingList.getEpub(url) != null;
        UserPreferences.getReadingListCheckbox().checked = inlist;
    }

    static getReadingListCheckbox() {
        return document.getElementById("includeInReadingListCheckbox");
    }

    static SetTheme() {
        let theme = document.querySelector("#themeColorTag").value;
        let autodark = document.querySelector("link#autoDark");
        let alwaysDark = document.querySelector("link#alwaysDark");
        autodark.disabled = true;
        alwaysDark.disabled = true;
        if (theme == "") {
            autodark.disabled = false;
        } else if (theme == "DarkMode") {
            alwaysDark.disabled = false;
        }
    }
}
