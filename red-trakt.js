// ==UserScript==
// @name         Red Trakt
// @namespace    iamkroot
// @version      2024-10-25
// @description  Bring back the Red theme on trakt.tv
// @author       iamkroot
// @match        https://trakt.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trakt.tv
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    document.body.classList.remove("theme-purple");
    document.body.classList.add("theme-red");
})();