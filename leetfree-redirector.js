// ==UserScript==
// @name         Leetfree redirector
// @namespace    iamkroot
// @version      0.1
// @description  Redirect locked Leetcode questions to leetfree site
// @author       iamkroot
// @match        https://leetcode.com/problems/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let desc = document.querySelector("div[data-cy='description-content']");
    if (!!desc && desc.firstChild.className.startswith("description")) {
        return;
    }
    const new_subpath = document.location.pathname.replace(/\/$/, ".html");
    document.location = "https://heip.github.io/LeetCodePremium" + new_subpath;
})();