"use strict";

/**
 * Centralized UI text constants
 * User-facing text that needs to be localized should be defined here for easier management
 */
class UIText { // eslint-disable-line no-unused-vars
    // Chapter-related text
    static Chapter = {
        tooltipChapterDownloading: chrome.i18n.getMessage("__MSG_Tooltip_chapter_downloading__"),
        tooltipChapterDownloaded: chrome.i18n.getMessage("__MSG_Tooltip_chapter_downloaded__"),
        tooltipChapterSleeping: chrome.i18n.getMessage("__MSG_Tooltip_chapter_sleeping__"),
        tooltipChapterPreviouslyDownloaded: chrome.i18n.getMessage("__MSG_Tooltip_chapter_previously_downloaded__"),
        maxChaptersSelected: (selectedCount, maxChapters) => chrome.i18n.getMessage("__MSG_More_than_max_chapters_selected__", [selectedCount, maxChapters]),
        shiftClickMessage: chrome.i18n.getMessage("__MSG_Shift_Click__")
    };
    
    // Library-related text
    static Library = {
        deleteEpub: chrome.i18n.getMessage("__MSG_button_Lib_Template_Delete_EPUB__"),
        searchNewChapter: chrome.i18n.getMessage("__MSG_button_Lib_Template_Search_new_Chapters__"),
        updateNewChapter: chrome.i18n.getMessage("__MSG_button_Lib_Template_Update_new_Chapters__"),
        download: chrome.i18n.getMessage("__MSG_button_Lib_Template_Download_EPUB__"),
        newChapter: chrome.i18n.getMessage("__MSG_label_Lib_Template_New_Chapter__"),
        storyURL: chrome.i18n.getMessage("__MSG_label_Lib_Template_Story_URL__"),
        filename: chrome.i18n.getMessage("__MSG_label_Lib_Template_Filename__"),
        updateAll: chrome.i18n.getMessage("__MSG_button_Lib_Template_Update_All__"),
        clearLibrary: chrome.i18n.getMessage("__MSG_button_Lib_Template_Clear_Library__"),
        exportLibrary: chrome.i18n.getMessage("__MSG_button_Lib_Template_Export_Library__"),
        importLibrary: chrome.i18n.getMessage("__MSG_button_Lib_Template_Import_Library__"),
        addToLibrary: chrome.i18n.getMessage("__MSG_button_Lib_Template_Add_List_To_Library__"),
        mergeUpload: chrome.i18n.getMessage("__MSG_button_Lib_Template_Add_Chapter_from_different_EPUB__"),
        editMetadata: chrome.i18n.getMessage("__MSG_button_Lib_Template_Edit_Metadata__"),
        warningURLChange: chrome.i18n.getMessage("__MSG_label_Lib_Template_Warning_URL_Change__"),
        warningInProgress: chrome.i18n.getMessage("__MSG_label_Lib_Warning_In_Progress___"),
        confirmClearLibrary: chrome.i18n.getMessage("__MSG_confirm_Clear_Library__")
    };
    
    // Metadata-related text
    static Metadata = {
        title: chrome.i18n.getMessage("__MSG_label_Title__"),
        author: chrome.i18n.getMessage("__MSG_label_Author__"),
        language: chrome.i18n.getMessage("__MSG_label_Language__"),
        subject: chrome.i18n.getMessage("__MSG_label_Metadata_subject__"),
        description: chrome.i18n.getMessage("__MSG_label_Metadata_description__"),
        save: chrome.i18n.getMessage("__MSG_label_Metadata_Save__")
    };
    
    // Common UI elements
    static Common = {
        ok: chrome.i18n.getMessage("__MSG_button_error_OK__"),
        cancel: chrome.i18n.getMessage("__MSG_button_error_Cancel__"),
        retry: chrome.i18n.getMessage("__MSG_button_error_Retry__"),
        help: chrome.i18n.getMessage("__MSG_button_Help__"),
        remove: chrome.i18n.getMessage("__MSG_button_Remove__"),
        skip: chrome.i18n.getMessage("__MSG_button_error_Skip__"),
        addToLibrary: chrome.i18n.getMessage("__MSG_button_Add_to_Library__")
    };
    
    
    // Error messages
    static Error = {
        noParserFound: chrome.i18n.getMessage("noParserFound"),
        noChaptersFound: chrome.i18n.getMessage("noChaptersFound"),
        noChaptersFoundAndFetchClicked: chrome.i18n.getMessage("noChaptersFoundAndFetchClicked"),
        noImagesFound: chrome.i18n.getMessage("noImagesFound"),
        unhandledFieldTypeError: chrome.i18n.getMessage("unhandledFieldTypeError"),
        errorContentNotFound: (url) => chrome.i18n.getMessage("errorContentNotFound", [url]),
        errorIllegalFileName: (filename, illegalChars) => chrome.i18n.getMessage("errorIllegalFileName", [filename, illegalChars]),
        errorEditMetadata: chrome.i18n.getMessage("errorEditMetadata"),
        errorAddToLibraryLibraryAddPageWithChapters: chrome.i18n.getMessage("errorAddToLibraryLibraryAddPageWithChapters"),
        htmlFetchFailed: (url, error) => chrome.i18n.getMessage("htmlFetchFailed", [url, error]),
        imageFetchFailed: (url, parentUrl, error) => chrome.i18n.getMessage("imageFetchFailed", [url, parentUrl, error]),
        imgurFetchFailed: (url, parentUrl, error) => chrome.i18n.getMessage("imgurFetchFailed", [url, parentUrl, error]),
        gotHtmlExpectedImageWarning: (url) => chrome.i18n.getMessage("gotHtmlExpectedImageWarning", [url]),
        convertToXhtmlWarning: (filename, url, errorMessage) => chrome.i18n.getMessage("convertToXhtmlWarning", [filename, url, errorMessage])
    };
    
    // Warning messages
    static Warning = {
        warningNoChapterUrl: chrome.i18n.getMessage("warningNoChapterUrl"),
        warningNoVisibleContent: (url) => chrome.i18n.getMessage("warningNoVisibleContent", [url]),
        warning403ErrorResponse: (hostname) => chrome.i18n.getMessage("warning403ErrorResponse", [hostname]),
        warning429ErrorResponse: (hostname) => chrome.i18n.getMessage("warning429ErrorResponse", [hostname]),
        warningParserDisabledComradeMao: chrome.i18n.getMessage("warningParserDisabledComradeMao"),
        parserDisabledNotification: chrome.i18n.getMessage("parserDisabledNotification"),
        httpFetchCanRetry: chrome.i18n.getMessage("httpFetchCanRetry"),
        warningWebpImage: (relativeHref) => chrome.i18n.getMessage("warningWebpImage", [relativeHref])
    };

    // Default/Placeholder text
    static Default = {
        uuid: chrome.i18n.getMessage("defaultUUID"),
        title: chrome.i18n.getMessage("defaultTitle"),
        author: chrome.i18n.getMessage("defaultAuthor"),
        chapterPlaceholderMessage: (title, url) => chrome.i18n.getMessage("chapterPlaceholderMessage", [title, url]),
        informationPageTitle: chrome.i18n.getMessage("informationPageTitle"),
        tableOfContentsUrl: chrome.i18n.getMessage("tableOfContentsUrl")
    };

    // Cover image related text
    static CoverImage = {
        noImagesFoundLabel: chrome.i18n.getMessage("noImagesFoundLabel"),
        setCover: chrome.i18n.getMessage("setCover")
    };

    // HTTP Client specific messages
    static HttpClient = {
        makeFailCanRetryMessage: chrome.i18n.getMessage("httpFetchCanRetry")
    };

    // Utility method for localizing UI elements
    static localizeElement(element) {
        let key = element.textContent.trim();
        let localized = chrome.i18n.getMessage(key);
        if (!util.isNullOrEmpty(localized) && localized !== key) {
            element.textContent = localized;
        }
    }
}