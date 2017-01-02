/*
  Helper functions for testing
*/
"use strict";

class TestUtils {
    constructor() {
    }

    static makeDomWithBody(innerTextForBody) {
        let html = "<html><head><title></title></head><body>" +
            innerTextForBody +
            "</body></html>";
        return new DOMParser().parseFromString(html, "text/html");
    }
}
