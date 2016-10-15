/*
  Makes HTML calls using Fetch API
*/
"use strict";

class HttpClient {
    constructor() {
    }

    static wrapFetch(url) {
        let state = {
            isHtml: function () { return this.contentType.startsWith("text/html"); }
        };
        return fetch(url).then(function(response) {
            return HttpClient.checkResponseAndGetData(state, response);
        }).then(function(data) {
            state.addData(state, data);
            return state;
        });
    }

    static checkResponseAndGetData(state, response) {
        if(!response.ok) {
            let errorMsg = chrome.i18n.getMessage("htmlFetchFailed", [response.url, response.status]);
            return Promise.reject(new Error(errorMsg));
        } else {
            state.response = response;
            state.contentType = response.headers.get("content-type");
            if (state.isHtml()) {
                state.addData = HttpClient.responseToHtml;
                return response.text();
            } else {
                state.addData = HttpClient.responseToBinary;
                return response.arrayBuffer();
            }
        }
    }

    static responseToHtml(state, data) {
        let html = new DOMParser().parseFromString(data, "text/html");
        util.setBaseTag(state.response.url, html);
        state.responseXML = html;
    }

    static responseToBinary(state, data) {
        state.arrayBuffer = data;
    }

    static fetchJson(url) {
        return fetch(url).then(function (response) {
            if (!response.ok) {
                let errorMsg = chrome.i18n.getMessage("htmlFetchFailed", [response.url, response.status]);
                return Promise.reject(new Error(errorMsg));
            } else {
                return response.text();
            }
        }).then(function (text) {
            return JSON.parse(text);
        });
    }
}
