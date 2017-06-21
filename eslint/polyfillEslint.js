// assorted stubs to stop eslint warnings
// * 'chrome' is not defined
// * 'JSZip' is not defined

"use strict";

class JSZip {
    constructor() {
    }
    file() {}
    generateAsync() {}
}

class Chrome {
    constructor() {
    }
}

Chrome.prototype.i18n = {
    getMessage: function() {}
}

Chrome.prototype.runtime = {
    onMessage: {
        addListener: function() {}
    }
}

var chrome = new Chrome();
var browser = new Chrome();
