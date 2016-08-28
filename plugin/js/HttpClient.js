/*
  Makes HTML calls
*/
"use strict";

class HttpClient {
    constructor() {
    }

    // called when HTTP call fails
    // override to change default behaviour
    onError(url, statusText, event, reject) {
        var msg = "fetch of URL(" + url + ") failed.  Error: " + statusText;
        reject(Error(msg));
    }

    // fetches html document from URL
    fetchHtml(url) {
        let that = this;
        return new Promise(function(resolve, reject) {
            util.log("Fetching HTML from URL: " + url);
            let xhr = new XMLHttpRequest();
            xhr.onload = function (event) { that.onLoadHtml(url, xhr, event, resolve, reject); };
            xhr.onerror = function (event) { that.onError(url, xhr.statusText, event, reject); };
            xhr.open("GET", url);
            xhr.responseType = "document";
            that.sendRequest(xhr);
        });
    }

    validateStatus(url, xhr, event, reject) {
        let that = this;
        if (xhr.readyState === 4) {
            if ((xhr.status === 200) || (xhr.status === 0)) {
                return true;
            } else {
                that.onError(url, xhr.statusText, event, reject);
            };
        } else {
            reject(Error("fetch of URL(" + url + ") failed. Invalid readyState: " + xhr.readyState));
        }
        return false;
    }

    onLoadHtml(url, xhr, event, resolve, reject) {
        let that = this;
        if (that.validateStatus(url, xhr, event, reject)) {
            util.setBaseTag(url, xhr.responseXML);
            resolve(xhr);
        };
    }

    fetchBinary(url) {
        let that = this;
        return new Promise(function(resolve, reject) {
            util.log("Fetching Binary from URL: " + url);
            let xhr = new XMLHttpRequest();
            xhr.onload = function (event) { that.onLoadBinary(url, xhr, event, resolve, reject); };
            xhr.onerror = function (event) { that.onError(url, xhr.statusText, event, reject); };
            xhr.open("GET", url);
            xhr.responseType = "arraybuffer";
            that.sendRequest(xhr);
        });
    }

    onLoadBinary(url, xhr, event, resolve, reject) {
        let that = this;
        if (that.validateStatus(url, xhr, event, reject)) {
            resolve(xhr);
        };
    }

    // testing hook point.
    // override to replace the network call
    sendRequest(xhr) {
        xhr.send();
    }
}
