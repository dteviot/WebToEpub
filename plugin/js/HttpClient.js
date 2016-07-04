/*
  Makes HTML calls
*/
"use strict";

function HttpClient(dom) {
    let that = this;
}

HttpClient.prototype = {

    // set the base tag of a DOM to specified URL.
    setBaseTag: function (url, dom) {
        if (dom != null) {
            let tags = Array.prototype.slice.apply(dom.getElementsByTagName("base"));
            if (0 < tags.length) {
                tags[0].setAttribute("href", url);
            } else {
                let baseTag = dom.createElement("base");
                baseTag.setAttribute("href", url);
                dom.getElementsByTagName("head")[0].appendChild(baseTag);
            }
        }
    },

    // called when HTTP call fails
    // override to change default behaviour
    onError: function (url, statusText, event, reject) {
        var msg = "fetch of URL(" + url + ") failed.  Error: " + statusText;
        alert(msg);
        reject(Error(msg));
    },

    // fetches html document from URL
    fetchHtml: function (url) {
        let that = this;
        return new Promise(function(resolve, reject) {
            console.log("Fetching HTML from URL: " + url);
            let xhr = new XMLHttpRequest();
            xhr.onload = function (event) { that.onLoadHtml(url, xhr, event, resolve, reject); };
            xhr.onerror = function (event) { that.onError(url, xhr.statusText, event, reject); };
            xhr.open("GET", url);
            xhr.responseType = "document";
            that.sendRequest(xhr);
        });
    },

    validateStatus: function(url, xhr, event, reject) {
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
    },

    onLoadHtml: function (url, xhr, event, resolve, reject) {
        let that = this;
        if (that.validateStatus(url, xhr, event, reject)) {
            that.setBaseTag(url, xhr.responseXML);
            resolve(xhr);
        };
    },

    fetchBinary: function (url) {
        let that = this;
        return new Promise(function(resolve, reject) {
            console.log("Fetching Binary from URL: " + url);
            let xhr = new XMLHttpRequest();
            xhr.onload = function (event) { that.onLoadBinary(url, xhr, event, resolve, reject); };
            xhr.onerror = function (event) { that.onError(url, xhr.statusText, event, reject); };
            xhr.open("GET", url);
            xhr.responseType = "arraybuffer";
            that.sendRequest(xhr);
        });
    },

    onLoadBinary: function (url, xhr, event, resolve, reject) {
        let that = this;
        if (that.validateStatus(url, xhr, event, reject)) {
            resolve(xhr);
        };
    },

    // testing hook point.
    // override to replace the network call
    sendRequest: function(xhr) {
        xhr.send();
    },
}
