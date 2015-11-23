/*
  Javascript that is injected into active tab.
  Returns the DOM of the window's contents
*/
"use strict";

var parseResults = { 
    messageType: "ParseResults",
    document: document.all[0].outerHTML,
    url: document.URL
};
chrome.runtime.sendMessage(parseResults);
