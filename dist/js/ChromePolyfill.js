/**
 * ChromePolyfill.js
 * 
 * Polyfills Chrome Extension APIs for use in a plain website context.
 * Must be loaded BEFORE any other script that uses chrome.* APIs.
 * 
 * This file is only used on the `website` branch.
 */

"use strict";

// Flag to signal website mode to other JS modules (e.g. Download.js)
window.WTE_WEBSITE_MODE = true;
// Never keep HF tokens in browser storage on the public website — worker proxy handles auth.
try { localStorage.removeItem("hf_token"); } catch (_) { /* ignore */ }

// ---------------------------------------------------------------------------
// Inlined English messages (from _locales/en/messages.json)
// chrome.i18n.getMessage() format: each key maps to { message, placeholders? }
// Placeholders use $NAME$ in message and content "$N" where N=1,2,3...
// ---------------------------------------------------------------------------
const WTE_MESSAGES = {
    "__MSG_button_Advanced_Options__": { "message": "Advanced Options" },
    "__MSG_button_Lib_Library__": { "message": "Library" },
    "__MSG_label_Lib_Show_Advanced_Library_Options__": { "message": "Show Advanced Library Options" },
    "__MSG_label_Lib_Compact_View__": { "message": "Show Library in Compact Layout" },
    "__MSG_label_Lib_Download_Epub_After_Update__": { "message": "Download Epubs after new Chapter got added automatically." },
    "__MSG_label_Lib_Warning_In_Progress___": { "message": "In Progress...." },
    "__MSG_button_Lib_Template_Clear_Library__": { "message": "Clear Library" },
    "__MSG_button_Lib_Template_Export_Library__": { "message": "Export Library" },
    "__MSG_button_Lib_Template_Import_Library__": { "message": "Import Library" },
    "__MSG_button_Lib_Template_Upload_Epub__": { "message": "Upload Epub" },
    "__MSG_button_Lib_Template_Add_List_To_Library__": { "message": "Add novels to Library" },
    "__MSG_button_Lib_Template_Update_All__": { "message": "Update all" },
    "__MSG_button_Lib_Template_Delete_EPUB__": { "message": "Delete EPUB" },
    "__MSG_button_Lib_Template_Search_new_Chapters__": { "message": "Search new Chapters" },
    "__MSG_button_Lib_Template_Update_new_Chapters__": { "message": "Update" },
    "__MSG_button_Lib_Template_Download_EPUB__": { "message": "Download EPUB" },
    "__MSG_button_Lib_Template_Add_Chapter_from_different_EPUB__": { "message": "Add Chapter from different EPUB" },
    "__MSG_button_Lib_Template_Edit_Metadata__": { "message": "Edit Metadata" },
    "__MSG_label_Lib_Template_Library_uses__": { "message": "Library uses: " },
    "__MSG_label_Lib_Template_New_Chapter__": { "message": " new chapter" },
    "__MSG_label_Lib_Template_Story_URL__": { "message": "Story URL" },
    "__MSG_label_Lib_Template_Filename__": { "message": "Filename" },
    "__MSG_label_Lib_Template_Warning_URL_Change__": { "message": "Warning: Change URL only if you know what you are doing." },
    "__MSG_label_Lib_Template_Upload_Epub_File_Label__": { "message": "Upload an Epub File to the Library." },
    "__MSG_button_Lib_Template_": { "message": "Invisible Button" },
    "__MSG_button_Apply_Changes__": { "message": "Apply Changes" },
    "__MSG_button_Clear_Url__": { "message": "Clear URL" },
    "__MSG_button_Close_ReadingList__": { "message": "Close" },
    "__MSG_button_Copy_Urls_To_Clipboard__": { "message": "Copy URLs to Clipboard" },
    "__MSG_button_Edit_Chapter_Urls__": { "message": "Edit Chapter URLs" },
    "__MSG_button_error_Cancel__": { "message": "Cancel" },
    "__MSG_button_error_Skip__": { "message": "Skip" },
    "__MSG_button_error_OK__": { "message": "OK" },
    "__MSG_button_error_Retry__": { "message": "Retry" },
    "__MSG_button_error_Open_URL__": { "message": "Open URL for Captcha" },
    "__MSG_button_error_Block_URL__": { "message": "Block Website for future requests" },
    "__MSG_button_finished_default_parser__": { "message": "Apply" },
    "__MSG_button_autocomplete_with_ai__": { "message": "Autocomplete with AI" },
    "__MSG_button_Help__": { "message": "Help..." },
    "__MSG_button_load_and_analyse__": { "message": "Load and Analyse" },
    "__MSG_button_load_Metadata__": { "message": "Load Additional Metadata" },
    "__MSG_button_Pack_EPUB__": { "message": "Pack EPUB" },
    "__MSG_button_Add_to_Library__": { "message": "Add to Library" },
    "__MSG_button_Pause_to_Library__": { "message": "Pause to Library" },
    "__MSG_button_Reset__": { "message": "Reset" },
    "__MSG_button_Reload__": { "message": "Reload" },
    "__MSG_button_Remove__": { "message": "Remove" },
    "__MSG_button_Reset_stylesheet__": { "message": "Reset stylesheet to default" },
    "__MSG_button_Reverse_Chapter_Urls_Order__": { "message": "Reverse Chapter URLs Order" },
    "__MSG_button_Select_All__": { "message": "Select All" },
    "__MSG_button_test_default_parser__": { "message": "Test" },
    "__MSG_button_Unselect_All__": { "message": "Unselect All" },
    "__MSG_button_View_Filters__": { "message": "Filters" },
    "__MSG_button_View_Reading_List__": { "message": "View Reading List" },
    "__MSG_button_Write_Options_to_file__": { "message": "Write Options to file" },
    "__MSG_column_Include__": { "message": "Include?" },
    "__MSG_column_Title__": { "message": "Title" },
    "__MSG_column_URL__": { "message": "URL" },
    "__MSG_label_Add_Information_Page_To_Epub__": { "message": "Add Information page to Epub" },
    "__MSG_label_Advanced_Options_Visible_By_Default__": { "message": "Advanced Options Visible by Default" },
    "__MSG_label_Author__": { "message": "Author" },
    "__MSG_label_Auto_Parser_Select_Includes_Baka_Tsuki_Series_Page_Parser__": { "message": "Automatic parser select includes Baka-Tsuki Series Page Parser" },
    "__MSG_label_Chapter_Count__": { "message": "Chapter Count:" },
    "__MSG_label_Chapters_Page_In_Chapters_List__": { "message": "Add Page with Chapters to Chapters List" },
    "__MSG_label_Compress_Images__": { "message": "Compress Images" },
    "__MSG_label_Compress_Images_JPG_Cover__": { "message": "Restrict Cover Image to JPEG" },
    "__MSG_label_Compress_Images_Format__": { "message": "Compressed Image Format" },
    "__MSG_label_Compress_Images_Resolution__": { "message": "Compressed Resolution" },
    "__MSG_label_Cover_from_URL__": { "message": "Cover from URL:" },
    "__MSG_label_Cover_Image_URL__": { "message": "Cover Image URL:" },
    "__MSG_label_Create_Epub_3__": { "message": "Create EPUB 3" },
    "__MSG_label_File_Author_as__": { "message": "File Author as" },
    "__MSG_label_Default_Parser_Chapter_Title_CSS__": { "message": "CSS selector for element holding Title of Chapter:" },
    "__MSG_label_Default_Parser_Content_CSS__": { "message": "(required) CSS selector for element holding content to put into EPUB:" },
    "__MSG_label_Default_Parser_HostName__": { "message": "Hostname:" },
    "__MSG_label_Default_Parser_Test_Chapter_Url__": { "message": "URL of first chapter:" },
    "__MSG_label_Default_Parser_Unwanted_Elements_CSS__": { "message": "CSS selector for element(s) to remove:" },
    "__MSG_label_Edit_URLs_Hint__": { "message": "You can edit the URLs in html format or as a simple URL list (one URL per line)." },
    "__MSG_label_Element_With_Chapter_Content__": { "message": "Element with Chapter Content:" },
    "__MSG_label_Filename__": { "message": "Filename" },
    "__MSG_label_Developer_Stuff__": { "message": "Developer Stuff:" },
    "__MSG_label_Fetch_Highest_Resolution_Images__": { "message": "Fetch Highest Resolution Images" },
    "__MSG_label_Include_in_Reading_List__": { "message": "Include in Reading List" },
    "__MSG_label_Include_URL_of_Images__": { "message": "Include URL of Images" },
    "__MSG_label_Language__": { "message": "Language" },
    "__MSG_label_no_additional_metadata__": { "message": "no Additional Metadata" },
    "__MSG_label_auto_search_metadata__": { "message": "auto search Metadata on novelupdates (long loading time)" },
    "__MSG_label_less_tags__": { "message": "less tags" },
    "__MSG_label_Show_More_Metadata_Options__": { "message": "Show more Metadata options" },
    "__MSG_label_Manual_Delay_Per_Chapter__": { "message": "Delay per chapter in ms" },
    "__MSG_label_Manually_Select_Parser__": { "message": "Manually Select Parser:" },
    "__MSG_label_Max_chapters_per_epub__": { "message": "Max chapters per EPUB" },
    "__MSG_label_Max_pages_to_fetch_simultaneously__": { "message": "Max web pages to fetch simultaneously" },
    "__MSG_label_Metadata_description__": { "message": "Epub description" },
    "__MSG_label_Custom_Filename__": { "message": "Custom Filename" },
    "__MSG_label_Metadata_subject__": { "message": "Tags" },
    "__MSG_label_Metadata_Save__": { "message": "Save Metadata" },
    "__MSG_label_Metadata_URL__": { "message": "Additional Metadata URL" },
    "__MSG_label_Override_Default_Minimum_Delay__": { "message": "Override Delay per chapter Value (where applicable)" },
    "__MSG_label_Overwrite_Epub_When_Filename_Duplicte__": { "message": "Overwrite existing EPUB file with same name" },
    "__MSG_label_Password__": { "message": "Password" },
    "__MSG_label_Range_End_Chapter__": { "message": "Last Chapter" },
    "__MSG_label_Range_Start_Chapter__": { "message": "First Chapter" },
    "__MSG_label_Read_Options_from_file__": { "message": "Read Options from file:" },
    "__MSG_label_Remove_Author_Notes__": { "message": "Remove Author Notes" },
    "__MSG_label_Remove_Chapter_Number__": { "message": "Remove Chapter Numbers" },
    "__MSG_label_Remove_Original__": { "message": "Remove Original/Raw Text" },
    "__MSG_label_Select_Translation_Google__": { "message": "Download raw (no login)" },
    "__MSG_label_Select_Retry_Longer__": { "message": "Retry Chapter for up to 1h (it looks like WebToEpub is stuck)" },
    "__MSG_label_Remove_Translated__": { "message": "Remove Translated Text" },
    "__MSG_label_Remove_Duplicate_Images__": { "message": "Remove Duplicate Images:" },
    "__MSG_label_Remove_Superscript_From_Alternate_Translations__": { "message": "Remove superscript from alternate translations" },
    "__MSG_label_Series__": { "message": "Series" },
    "__MSG_label_Show_Chapter_Urls__": { "message": "Show URLs of Chapters" },
    "__MSG_label_Skip_Images__": { "message": "Skip Images" },
    "__MSG_label_Starting_URL__": { "message": "Starting URL" },
    "__MSG_label_Skip_Chapters_That_Fail_Fetch__": { "message": "Skip chapters that return HTTP 404 error" },
    "__MSG_label_Stylesheet__": { "message": "Stylesheet:" },
    "__MSG_label_Theme__": { "message": "Theme" },
    "__MSG_label_Title__": { "message": "Title" },
    "__MSG_label_Translator__": { "message": "Translator" },
    "__MSG_label_Use_Full_Title_As_File_Name__": { "message": "Use full title as file name" },
    "__MSG_label_Use_SVG_for_Images__": { "message": "Use <svg> for images" },
    "__MSG_label_Remove_Next_and_Previous_Chapter_Hyperlinks__": { "message": "Remove Next and Previous Chapter Hyperlinks" },
    "__MSG_label_Using_Default_Parser__": { "message": "No parser found for this URL.  Default Parser will be used. Please specify how to obtain content from each web page." },
    "__MSG_label_Volume__": { "message": "Volume" },
    "__MSG_label_No_Download_Popup__": { "message": "Don't popup 'SaveAs' dialog when save Epub" },
    "__MSG_label_Disable_Shift_Click_Alert__": { "message": "Disable Shift+Click Selection Alert" },
    "__MSG_label_Disable_Image_Res_Error__": { "message": "Disable High Resolution Image Fetch Failure Warning" },
    "__MSG_label_Disable_Webp_Image_Format_Error__": { "message": "Disable WebP Image Format Compatibility Warning" },
    "__MSG_label_Write_Error_History_To_File__": { "message": "Write error messages to file" },
    "__MSG_More_than_max_chapters_selected__": {
        "message": "Caution: $1 chapters have been selected to include in EPUB.  Click 'OK' if you want all of them included.  Click 'Cancel' if you want only the first $2 included"
    },
    "__MSG_option_Class_Is__": { "message": "Class is" },
    "__MSG_option_Class_Starts_With__": { "message": "Class Starts With" },
    "__MSG_option_First_Found__": { "message": "First Found" },
    "__MSG_option_ID_Is__": { "message": "ID is" },
    "__MSG_option_ID_Starts_With__": { "message": "ID Starts With" },
    "__MSG_option_ID_Theme_Always_Dark__": { "message": "Always Dark Mode" },
    "__MSG_option_ID_Theme_Always_Light__": { "message": "Always Light Mode" },
    "__MSG_option_ID_Theme_OS_Selection__": { "message": "Use current OS selection" },
    "__MSG_Searching_For_URLs_Please_Wait__": { "message": "Searching for URLs.  Please wait." },
    "__MSG_option_value_auto__": { "message": "auto" },
    "__MSG_Shift_Click__": { "message": "You can select or unselect a range of chapters by clicking on the checkbox for the first chapter, then  hold down the shift key and click the last chapter in the range." },
    "__MSG_Tooltip_chapter_downloading__": { "message": "Downloading chapter" },
    "__MSG_Tooltip_chapter_downloaded__": { "message": "Downloaded" },
    "__MSG_Tooltip_chapter_sleeping__": { "message": "Waiting for chapter delay time to elapse" },
    "__MSG_Tooltip_chapter_previously_downloaded__": { "message": "Chapter previously downloaded" },
    "chapterPlaceholderMessage": { "message": "This is a placeholder.  Attempt to fetch chapter from '$1' failed with error: \r\n $2" },
    "convertToXhtmlWarning": { "message": "Warning, unable to convert chapter '$1' from '$2' to valid XHTML. Your epub viewer may fail when viewing that chapter. You may need to fix the chapter manually with Calibre. \r\nConversion error message was: ($3)" },
    "defaultAuthor": { "message": "No author supplied" },
    "defaultTitle": { "message": "No title supplied" },
    "defaultUUID": { "message": "No UUID supplied" },
    "errorEditMetadata": { "message": "An error occurred during the editing of the Metadata. Couldn't find the string to replace in  OEBPS/content.opf" },
    "errorAddToLibraryLibraryAddPageWithChapters": { "message": "\"Add to Library\" doesn't work with Advanced Option \"Add Page with Chapters to Chapters List\" enabled." },
    "errorContentNotFound": { "message": "Could not find content element for web page '$1'." },
    "errorIllegalFileName": { "message": "Filename '$1' must not contain the following characters: $2" },
    "gotHtmlExpectedImageWarning": { "message": "Attempt to fetch high resolution version of image from '$1' failed.  Using lower resolution image instead." },
    "httpFetchCanRetry": { "message": "This is an intermittent error. If you retry in a few minutes, it may succeed." },
    "htmlFetchFailed": { "message": "Fetch of URL '$1' failed with network error $2." },
    "imageFetchFailed": { "message": "Fetch of image '$1' for page '$2' failed with network error $3." },
    "imgurFetchFailed": { "message": "Warning: Attempt to fetch imgur image(s) '$1' for page '$2' failed with network error $3." },
    "noChaptersFound": { "message": "No chapters found. This may not be the novel's detail page." },
    "informationPageTitle": { "message": "Information" },
    "noChaptersFoundAndFetchClicked": { "message": "No chapters found." },
    "noImagesFound": { "message": "No images found." },
    "noImagesFoundLabel": { "message": "No images found" },
    "noParserFound": { "message": "No parser found for this URL.  Default parser will be used.  You will need to specify how to obtain content for each chapter." },
    "parserDisabledNotification": { "message": "Support for this site has been disabled at the request of site owners." },
    "setCover": { "message": "Set Cover" },
    "tableOfContentsUrl": { "message": "Table of Contents URL: " },
    "unhandledFieldTypeError": { "message": "ERROR: Unhandled field type." },
    "warning403ErrorResponse": { "message": "WARNING: Site '$1' has sent an Access Denied (403) error.\nYou may need to logon to site, or browse site normally\nuntil you get a Cloudflare \"Are you a human\" page or satisfy some other CAPTCHA\nbefore WebToEpub can continue.\nThis happens if you are downloading to fast try to increase 'Advanced Options -> Delay per chapter in ms'\n" },
    "wait403ErrorResponse": { "message": "Wait until you cleared cloudflare or login." },
    "warning429ErrorResponse": { "message": "WARNING: Site '$1' has requested WebToEpub to slow down rate of chapter requests.  WebToEpub will wait until site allows requesting chapters again.  However, if this does not work, you may need to adjust manually.  Under 'Advanced Options' -> increase 'Delay per chapter in ms'" },
    "warningNoChapterUrl": { "message": "ERROR: No Chapter URL supplied to test against." },
    "warningNoVisibleContent": { "message": "Warning, content element for web page '$1' has no visible content." },
    "warningParserDisabledComradeMao": { "message": "Support for this site has been disabled at the request of site owners." },
    "warningWebpImage": { "message": "Warning: image file '$1' is in webp format.  Your epub viewer may not be able to render it." }
};

/**
 * Resolve a message key: substitute positional placeholders ($1, $2, ...) or
 * named placeholders ($NAME$) with the supplied substitution strings.
 */
function wteGetMessage(key, substitutions) {
    let entry = WTE_MESSAGES[key];
    if (!entry) {
        // Try with __MSG_ and __ wrapper
        if (!key.startsWith("__MSG_")) {
            entry = WTE_MESSAGES["__MSG_" + key + "__"];
        }
    }
    if (!entry) {
        // Try stripping the MSG_ wrapper if key has it
        if (key.startsWith("__MSG_") && key.endsWith("__")) {
            let stripped = key.substring(6, key.length - 2);
            entry = WTE_MESSAGES[stripped];
        }
    }
    if (!entry) {
        return key;
    }
    let msg = entry.message;
    if (substitutions) {
        let subs = Array.isArray(substitutions) ? substitutions : [substitutions];
        // replace positional $1, $2, ...
        subs.forEach((val, idx) => {
            msg = msg.replaceAll("$" + (idx + 1), val);
        });
    }
    return msg;
}

// ---------------------------------------------------------------------------
// Build the global chrome stub
// ---------------------------------------------------------------------------
window.chrome = {
    i18n: {
        getMessage(key, substitutions) {
            return wteGetMessage(key, substitutions);
        },
        getUILanguage() { return "en"; }
    },

    runtime: {
        onMessage: {
            _listeners: [],
            addListener(fn) { this._listeners.push(fn); },
            removeListener(fn) { this._listeners = this._listeners.filter(l => l !== fn); },
            hasListener(fn) { return this._listeners.includes(fn); }
        },
        sendMessage() { return Promise.resolve(); },
        getURL(path) { return path; },
        lastError: null,
        getPlatformInfo(cb) {
            const info = { os: "linux" };
            if (cb) cb(info);
            return Promise.resolve(info);
        },
        getManifest() { return { version: "website" }; }
    },

    cookies: {
        async getAll() { return []; },
        async set() { }
    },

    tabs: {
        create(opts) { window.open(opts.url, "_blank"); },
        async query() { return []; }
    },

    downloads: {
        download(opts, cb) {
            // Web-native download via anchor click (handled by Download.js)
            // Just call callback with undefined so Download.js uses its fallback path
            if (typeof cb === "function") cb(undefined);
        },
        onChanged: {
            addListener() { }
        }
    },

    declarativeNetRequest: {
        async getSessionRules() { return []; },
        async updateSessionRules() { }
    },

    scripting: {
        executeScript() { }
    },

    storage: {
        local: {
            get(keys, callback) {
                const result = {};
                if (keys === null || keys === undefined) {
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        const val = localStorage.getItem(k);
                        try { result[k] = JSON.parse(val); } catch { result[k] = val; }
                    }
                } else {
                    const keyList = Array.isArray(keys) ? keys : (typeof keys === "string" ? [keys] : Object.keys(keys));
                    keyList.forEach(k => {
                        const val = localStorage.getItem(k);
                        if (val !== null) {
                            try { result[k] = JSON.parse(val); } catch { result[k] = val; }
                        } else if (typeof keys === "object" && !Array.isArray(keys) && keys[k] !== undefined) {
                            result[k] = keys[k];
                        }
                    });
                }
                if (typeof callback === "function") callback(result);
                return Promise.resolve(result);
            },
            set(items, callback) {
                Object.entries(items).forEach(([k, v]) => {
                    localStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : v);
                });
                if (typeof callback === "function") callback();
                return Promise.resolve();
            },
            remove(keys, callback) {
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach(k => localStorage.removeItem(k));
                if (typeof callback === "function") callback();
                return Promise.resolve();
            },
            clear(callback) {
                localStorage.clear();
                if (typeof callback === "function") callback();
                return Promise.resolve();
            }
        }
    }
};

// Firefox compat: many checks use `util.isFirefox()` → returns false on website
// but `browser` global is also referenced in Firefox.js for safety.
window.browser = window.chrome;

console.log("[WebToEpub] ChromePolyfill loaded — running in website mode.");
