// ==UserScript==
// @name         Codeforces Edu playlist
// @namespace    iamkroot
// @version      0.1
// @description  Add downloadable links for Codeforces Edu videos
// @author       iamkroot
// @match        https://codeforces.com/edu/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const getUrls = () => {
        let scripts = document.getElementsByTagName("script");
        let scriptText = "";
        for (let script of scripts) {
            if (script.text.includes("const playlist")){
                scriptText = script.text;
                break;
            }
        }
        const parseScript = (scriptText) => {
            let script = scriptText.match(/const playlist(.|\n)*?\];/g).join("\n");
            const selectQuality = (alts) => {
                for (let alt of alts) {
                    if (alt.label === "1080p"){
                        return alt;
                    }
                }
            }
            script = script.slice(16);
            return eval(script);
        }

        const playlist = parseScript(scriptText);
        return playlist.map(item => item.sources.src);
    }



    const makeDownloadElement = (urls, text) => {
        const m3uPlaylist = `#EXTM3U\n${urls.join("\n")}`;
        const mime = 'video/x-mpegurl';
        let element = document.createElement('a');
        element.text = text ? text : "Send playlist to mpv";
        element.setAttribute('href', 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(m3uPlaylist));
        return element;
    }

    const urls = getUrls();

    const makeForm = (urls) => {
        let form = document.createElement("form");
        let selectStart = document.createElement("select");

    }
    const element = makeDownloadElement(urls);
    document.querySelector(".vjs-playlist").after(element);
})();