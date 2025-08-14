module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "webextensions": true,
    },
    "parserOptions": {
        "ecmaVersion": 2022
    },    
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4,
            { "SwitchCase": 1 }
        ],
        "linebreak-style": "off",
        "no-extra-semi": [
            "error"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-undef": "error",
        "no-unused-vars": "error",
        // needed to avoid no-redeclare errors for our project globals below
        "no-redeclare": ["error", { "builtinGlobals": false }],
        "space-before-blocks": ["error", "always"],
        "space-before-function-paren": ["error", {
            "anonymous": "never",    // function() {}
            "named": "never",        // function foo() {}
            "asyncArrow": "always"   // async () => {}
        }],
        // Space around keywords (if, for, etc.)
        "keyword-spacing": ["error", {
            "before": true,
            "after": true
        }],
    },
    "globals": {
        // Third-party libraries
        "DOMPurify": "readonly",
        "zip": "readonly",

        // Project globals
        "BakaTsukiImageCollector": "readonly",
        "BakaTsukiParser": "readonly",
        "BakaTsukiSeriesPageParser": "readonly",
        "BlockedHostNames": "readonly",
        "BlogspotParser": "readonly",
        "ChapterEpubItem": "readonly",
        "ChapterUrlsUI": "readonly",
        "CoverImageUI": "readonly",
        "DefaultParser": "readonly",
        "DefaultParserSiteSettings": "readonly",
        "DefaultParserUI": "readonly",
        "Download": "readonly",
        "EpubItem": "readonly",
        "EpubItemSupplier": "readonly",
        "EpubMetaInfo": "readonly",
        "EpubPacker": "readonly",
        "ErrorLog": "readonly",
        "FetchCache": "readonly",
        "FetchErrorHandler": "readonly",
        "FetchImageErrorHandler": "readonly",
        "Firefox": "readonly",
        "FootnoteExtractor": "readonly",
        "HttpClient": "readonly",
        "ImageCollector": "readonly",
        "ImageInfo": "readonly",
        "Imgur": "readonly",
        "Library": "readonly",
        "MadaraParser": "readonly",
        "main": "readonly",
        "NovelfullParser": "readonly",
        "Parser": "readonly",
        "parserFactory": "readonly",
        "ProgressBar": "readonly",
        "ReadingList": "readonly",
        "RoyalRoadParser": "readonly",
        "UserPreferences": "readonly",
        "util": "readonly",
        "VariableSizeImageCollector": "readonly",
        "WordpressBaseParser": "readonly"
    }
};